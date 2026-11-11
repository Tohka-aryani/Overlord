import { and, eq } from "drizzle-orm";
import Parser from "rss-parser";
import { db } from "@/db";
import { classifications, ingestRuns, newsItems } from "@/db/schema";
import { classifyEntity } from "@/lib/ollama";
import {
  NEWS_KEYWORDS,
  buildGoogleNewsRssUrl,
  normalizeRssItem,
  type NormalizedNewsItem,
} from "@/lib/ingest/news-normalize";

export {
  NEWS_KEYWORDS,
  buildGoogleNewsRssUrl,
  normalizeRssItem,
  toPublishedAt,
  type NormalizedNewsItem,
} from "@/lib/ingest/news-normalize";

/** Stop further Ollama calls after this many consecutive nulls (model down / missing). */
const MAX_CONSECUTIVE_CLASSIFY_NULLS = 3;
/** Cap classifyEntity calls per ingest run (serverless maxDuration budget). */
export const MAX_CLASSIFY_PER_RUN = Math.max(
  0,
  Number.parseInt(process.env.MAX_CLASSIFY_PER_RUN ?? "5", 10) || 5,
);

type GoogleNewsItem = {
  source?: string;
};

const parser = new Parser<Record<string, unknown>, GoogleNewsItem>({
  customFields: {
    item: ["source"],
  },
  timeout: 30_000,
});

export type IngestNewsResult = {
  source: "google-news-rss";
  status: "success" | "error";
  ingestRunId: number;
  counts: {
    keywords: number;
    fetched: number;
    upserted: number;
    inserted: number;
    updated: number;
    classified: number;
    unclassified: number;
  };
  error?: string;
};

async function fetchKeywordFeed(
  keyword: string,
): Promise<NormalizedNewsItem[]> {
  const url = buildGoogleNewsRssUrl(keyword);
  const feed = await parser.parseURL(url);
  const out: NormalizedNewsItem[] = [];
  for (const item of feed.items ?? []) {
    const n = normalizeRssItem(item, keyword);
    if (n) out.push(n);
  }
  return out;
}

async function upsertNewsItems(
  records: NormalizedNewsItem[],
): Promise<{ insertedIds: number[]; updated: number; upserted: number }> {
  const insertedIds: number[] = [];
  let updated = 0;

  for (const rec of records) {
    const existing = await db.query.newsItems.findFirst({
      where: eq(newsItems.link, rec.link),
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(newsItems)
        .set({
          title: rec.title,
          publishedAt: rec.publishedAt,
          source: rec.source,
          keywordHit: rec.keywordHit,
          summary: rec.summary,
        })
        .where(eq(newsItems.id, existing.id));
      updated += 1;
    } else {
      const [row] = await db
        .insert(newsItems)
        .values({
          title: rec.title,
          link: rec.link,
          publishedAt: rec.publishedAt,
          source: rec.source,
          keywordHit: rec.keywordHit,
          summary: rec.summary,
        })
        .returning({ id: newsItems.id });
      insertedIds.push(row.id);
    }
  }

  return {
    insertedIds,
    updated,
    upserted: insertedIds.length + updated,
  };
}

async function classifyNewNews(
  insertedIds: number[],
): Promise<{ classified: number; unclassified: number }> {
  if (insertedIds.length === 0) {
    return { classified: 0, unclassified: 0 };
  }

  let classified = 0;
  let unclassified = 0;
  let consecutiveNulls = 0;
  let skipClassify = false;
  let classifyCalls = 0;

  for (const id of insertedIds) {
    if (skipClassify || classifyCalls >= MAX_CLASSIFY_PER_RUN) {
      unclassified += 1;
      continue;
    }

    const row = await db.query.newsItems.findFirst({
      where: eq(newsItems.id, id),
    });
    if (!row) {
      unclassified += 1;
      continue;
    }

    const bodyParts = [
      row.summary ? `Summary: ${row.summary}` : null,
      row.source ? `Source: ${row.source}` : null,
      row.keywordHit ? `Keyword: ${row.keywordHit}` : null,
      `Link (do not fetch): ${row.link}`,
    ].filter(Boolean);

    classifyCalls += 1;
    const result = await classifyEntity({
      title: row.title,
      body: bodyParts.join("\n"),
      country: "MY",
    });

    if (!result) {
      consecutiveNulls += 1;
      unclassified += 1;
      if (consecutiveNulls >= MAX_CONSECUTIVE_CLASSIFY_NULLS) {
        skipClassify = true;
      }
      continue;
    }

    consecutiveNulls = 0;
    await db.insert(classifications).values({
      entityType: "news",
      entityId: id,
      threatLevel: result.threat_level,
      category: result.category,
      malaysiaRelevance: result.malaysia_relevance,
      sector: result.sector,
      confidence: result.confidence,
      rationale: result.rationale,
      model: process.env.OLLAMA_MODEL || "qwen2.5:14b",
    });
    classified += 1;
  }

  return { classified, unclassified };
}

/**
 * Poll Google News RSS for Malaysia CTI keywords, upsert by link,
 * classify new inserts via Ollama when available.
 */
export async function ingestNews(): Promise<IngestNewsResult> {
  const startedAt = new Date();
  const [run] = await db
    .insert(ingestRuns)
    .values({
      source: "google-news-rss",
      startedAt,
      status: "running",
      counts: {},
    })
    .returning({ id: ingestRuns.id });

  const emptyCounts = {
    keywords: NEWS_KEYWORDS.length,
    fetched: 0,
    upserted: 0,
    inserted: 0,
    updated: 0,
    classified: 0,
    unclassified: 0,
  };

  let runFinalized = false;
  let partialCounts = { ...emptyCounts };

  try {
    const byLink = new Map<string, NormalizedNewsItem>();

    for (const keyword of NEWS_KEYWORDS) {
      const items = await fetchKeywordFeed(keyword);
      for (const item of items) {
        if (byLink.has(item.link)) continue;
        byLink.set(item.link, item);
      }
    }

    const normalized = [...byLink.values()];
    partialCounts = {
      ...emptyCounts,
      fetched: normalized.length,
    };

    const { insertedIds, updated, upserted } = await upsertNewsItems(normalized);
    const { classified, unclassified } = await classifyNewNews(insertedIds);

    const counts = {
      keywords: NEWS_KEYWORDS.length,
      fetched: normalized.length,
      upserted,
      inserted: insertedIds.length,
      updated,
      classified,
      unclassified,
    };
    partialCounts = counts;

    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "success",
        counts,
        error: null,
      })
      .where(eq(ingestRuns.id, run.id));

    runFinalized = true;
    return {
      source: "google-news-rss",
      status: "success",
      ingestRunId: run.id,
      counts,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "error",
        counts: partialCounts,
        error: message,
      })
      .where(eq(ingestRuns.id, run.id));

    runFinalized = true;
    return {
      source: "google-news-rss",
      status: "error",
      ingestRunId: run.id,
      counts: partialCounts,
      error: message,
    };
  } finally {
    if (!runFinalized) {
      try {
        await db
          .update(ingestRuns)
          .set({
            finishedAt: new Date(),
            status: "error",
            counts: partialCounts,
            error:
              "Ingest ended before run was finalized (possible serverless timeout or abrupt termination)",
          })
          .where(
            and(eq(ingestRuns.id, run.id), eq(ingestRuns.status, "running")),
          );
      } catch {
        // Best effort — Vercel hard kill (SIGKILL) may skip finally entirely.
      }
    }
  }
}
