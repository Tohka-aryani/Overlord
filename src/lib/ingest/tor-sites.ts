import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ingestRuns, torHits } from "@/db/schema";
import {
  apifyTorMaxItems,
  runTorKeywordScrape,
} from "@/lib/apify/tor-scraper";
import { loadTorKeywords, torKeywordsFilePath } from "@/lib/tor/keywords";
import { hostFromUrl, normalizeTorHitUrl } from "@/lib/tor/normalize-url";

/** Keep full plain text from Apify (Postgres text; no artificial UI-style cut). */
const TEXT_SNIPPET_MAX = 500_000;

export type IngestTorSitesResult = {
  source: "tor-sites";
  status: "success" | "error" | "skipped";
  ingestRunId: number | null;
  counts: {
    keywords: number;
    fetched: number;
    inserted: number;
    skippedDuplicates: number;
    skippedInvalid: number;
    up: number;
    down: number;
  };
  error?: string;
};

function apifyEnabled(): boolean {
  return Boolean((process.env.APIFY_TOKEN ?? "").trim());
}

function truncateSnippet(text: string | undefined | null): string | null {
  if (!text) return null;
  const collapsed = text.replace(/\s+/g, " ").trim();
  if (!collapsed) return null;
  return collapsed.slice(0, TEXT_SNIPPET_MAX);
}

function isOkStatus(code: number | null | undefined): boolean {
  return code != null && code >= 200 && code < 400;
}

/**
 * Run Apify Tor keyword scrape; insert only URLs not already in tor_hits.
 */
export async function ingestTorSites(): Promise<IngestTorSitesResult> {
  const source = "tor-sites" as const;
  const startedAt = new Date();
  const counts = {
    keywords: 0,
    fetched: 0,
    inserted: 0,
    skippedDuplicates: 0,
    skippedInvalid: 0,
    up: 0,
    down: 0,
  };

  if (!apifyEnabled()) {
    return {
      source,
      status: "skipped",
      ingestRunId: null,
      counts,
      error: "APIFY_TOKEN is not set",
    };
  }

  const [run] = await db
    .insert(ingestRuns)
    .values({
      source,
      startedAt,
      status: "running",
      counts,
    })
    .returning({ id: ingestRuns.id });

  try {
    const keywords = await loadTorKeywords();
    counts.keywords = keywords.length;
    if (keywords.length === 0) {
      throw new Error(
        `No keywords in ${torKeywordsFilePath()} — add one keyword per line`,
      );
    }

    const scrape = await runTorKeywordScrape(keywords, {
      maxItems: apifyTorMaxItems(),
    });
    counts.fetched = scrape.items.length;

    type Candidate = {
      url: string;
      host: string | null;
      query: string | null;
      statusCode: number | null;
      ok: number;
      title: string | null;
      searchTitle: string | null;
      searchDescription: string | null;
      textSnippet: string | null;
      error: string | null;
    };

    const candidates: Candidate[] = [];
    const batchUrls = new Set<string>();

    for (const item of scrape.items) {
      const url = normalizeTorHitUrl(item.url ?? "");
      if (!url) {
        counts.skippedInvalid += 1;
        continue;
      }
      // Dedupe within this Apify batch first.
      if (batchUrls.has(url)) {
        counts.skippedDuplicates += 1;
        continue;
      }
      batchUrls.add(url);

      const statusCode =
        typeof item.statusCode === "number" ? item.statusCode : null;
      const ok = isOkStatus(statusCode) ? 1 : 0;
      if (ok) counts.up += 1;
      else counts.down += 1;

      candidates.push({
        url,
        host: hostFromUrl(url),
        query: null,
        statusCode,
        ok,
        title: item.title?.trim() || null,
        searchTitle: item.searchTitle?.trim() || null,
        searchDescription: item.searchDescription?.trim() || null,
        textSnippet: truncateSnippet(item.text),
        error: item.error?.trim() || null,
      });
    }

    if (candidates.length > 0) {
      const urls = candidates.map((c) => c.url);
      const existing = await db
        .select({ url: torHits.url })
        .from(torHits)
        .where(inArray(torHits.url, urls));
      const existingSet = new Set(existing.map((r) => r.url));

      const now = new Date();
      for (const c of candidates) {
        if (existingSet.has(c.url)) {
          counts.skippedDuplicates += 1;
          continue;
        }
        const inserted = await db
          .insert(torHits)
          .values({
            url: c.url,
            host: c.host,
            query: c.query,
            statusCode: c.statusCode,
            ok: c.ok,
            title: c.title,
            searchTitle: c.searchTitle,
            searchDescription: c.searchDescription,
            textSnippet: c.textSnippet,
            error: c.error,
            apifyRunId: scrape.runId,
            apifyDatasetId: scrape.datasetId,
            firstSeenAt: now,
            lastSeenAt: now,
          })
          .onConflictDoNothing({ target: torHits.url })
          .returning({ id: torHits.id });
        existingSet.add(c.url);
        if (inserted.length === 0) {
          counts.skippedDuplicates += 1;
        } else {
          counts.inserted += 1;
        }
      }
    }

    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "success",
        counts,
        error: null,
      })
      .where(eq(ingestRuns.id, run.id));

    return { source, status: "success", ingestRunId: run.id, counts };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "error",
        counts,
        error: message,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      source,
      status: "error",
      ingestRunId: run.id,
      counts,
      error: message,
    };
  }
}
