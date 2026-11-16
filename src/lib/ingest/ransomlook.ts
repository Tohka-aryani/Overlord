import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  classifications,
  ingestRuns,
  ransomwareVictims,
} from "@/db/schema";
import { classifyEntity, lastResolvedOllamaModel } from "@/lib/ollama";
import {
  normalizeRansomLookPost,
  unwrapPostsPayload,
  type NormalizedRansomLookVictim,
} from "@/lib/ingest/ransomlook-normalize";

const API_BASE = "https://www.ransomlook.io/api";
const PROVIDER = "ransomlook.io";

const MAX_CONSECUTIVE_CLASSIFY_NULLS = 3;
export const MAX_CLASSIFY_PER_RUN = Math.max(
  0,
  Number.parseInt(process.env.MAX_CLASSIFY_PER_RUN ?? "25", 10) || 25,
);

export type IngestRansomLookResult = {
  source: "ransomlook.io";
  status: "success" | "error";
  ingestRunId: number;
  counts: {
    fetchedRecent: number;
    fetchedWindow: number;
    fetchedMySearch: number;
    upserted: number;
    inserted: number;
    updated: number;
    classified: number;
    unclassified: number;
  };
  error?: string;
};

function mergeSources(
  existing: string[] | null | undefined,
  incoming: string,
): string[] {
  return [...new Set([...(existing ?? []), incoming])];
}

function primarySource(sources: string[]): string {
  if (sources.includes("ransomware.live")) return "ransomware.live";
  return sources[0] ?? PROVIDER;
}

async function fetchJson(path: string, params?: Record<string, string>) {
  const url = new URL(`${API_BASE}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`ransomlook.io ${path} → HTTP ${res.status}`);
  }
  return res.json();
}

async function upsertVictims(
  records: NormalizedRansomLookVictim[],
): Promise<{ insertedIds: number[]; updated: number; upserted: number }> {
  const insertedIds: number[] = [];
  let updated = 0;

  for (const rec of records) {
    const existing = await db.query.ransomwareVictims.findFirst({
      where: and(
        eq(ransomwareVictims.victim, rec.victim),
        eq(ransomwareVictims.group, rec.group),
        eq(ransomwareVictims.attackDate, rec.attackDate),
      ),
    });

    if (existing) {
      const sources = mergeSources(existing.sources, PROVIDER);
      await db
        .update(ransomwareVictims)
        .set({
          country: existing.country ?? rec.country,
          sector: existing.sector ?? rec.sector,
          claimUrl: rec.claimUrl ?? existing.claimUrl,
          source: primarySource(sources),
          sources,
          rawJson: {
            ...(typeof existing.rawJson === "object" && existing.rawJson
              ? (existing.rawJson as object)
              : {}),
            ransomlook: rec.rawJson,
          },
        })
        .where(eq(ransomwareVictims.id, existing.id));
      updated += 1;
    } else {
      const sources = [PROVIDER];
      const [row] = await db
        .insert(ransomwareVictims)
        .values({
          victim: rec.victim,
          group: rec.group,
          country: rec.country,
          sector: rec.sector,
          attackDate: rec.attackDate,
          claimUrl: rec.claimUrl,
          source: PROVIDER,
          sources,
          rawJson: rec.rawJson,
          ...(rec.discoveredAt ? { discoveredAt: rec.discoveredAt } : {}),
        })
        .returning({ id: ransomwareVictims.id });
      insertedIds.push(row.id);
    }
  }

  return {
    insertedIds,
    updated,
    upserted: insertedIds.length + updated,
  };
}

async function classifyNewVictims(
  insertedIds: number[],
  descriptions: Map<number, string | null>,
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

    const row = await db.query.ransomwareVictims.findFirst({
      where: eq(ransomwareVictims.id, id),
    });
    if (!row) {
      unclassified += 1;
      continue;
    }

    const desc = descriptions.get(id);
    const bodyParts = [
      `Group: ${row.group}`,
      desc ? `Description: ${desc.slice(0, 800)}` : null,
      row.claimUrl ? `Claim URL (do not fetch): ${row.claimUrl}` : null,
      "Source: ransomlook.io",
    ].filter(Boolean);

    classifyCalls += 1;
    const result = await classifyEntity({
      title: row.victim,
      body: bodyParts.join("\n"),
      country: row.country ?? undefined,
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
      entityType: "ransomware",
      entityId: id,
      threatLevel: result.threat_level,
      category: result.category,
      malaysiaRelevance: result.malaysia_relevance,
      sector: result.sector,
      confidence: result.confidence,
      rationale: result.rationale,
      model:
        lastResolvedOllamaModel() ||
        process.env.OLLAMA_MODEL ||
        "llama3.2:latest",
    });
    if (!row.sector && result.sector) {
      await db
        .update(ransomwareVictims)
        .set({ sector: result.sector })
        .where(eq(ransomwareVictims.id, id));
    }
    if (
      !row.country &&
      result.malaysia_relevance === "Direct"
    ) {
      await db
        .update(ransomwareVictims)
        .set({ country: "MY" })
        .where(eq(ransomwareVictims.id, id));
    }
    classified += 1;
  }

  return { classified, unclassified };
}

function dedupeRecords(
  records: NormalizedRansomLookVictim[],
): NormalizedRansomLookVictim[] {
  const map = new Map<string, NormalizedRansomLookVictim>();
  for (const r of records) {
    const key = `${r.victim.toLowerCase()}|${r.group.toLowerCase()}|${r.attackDate}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, r);
      continue;
    }
    map.set(key, {
      ...prev,
      country: prev.country ?? r.country,
      claimUrl: prev.claimUrl ?? r.claimUrl,
      description: prev.description ?? r.description,
      discoveredAt: prev.discoveredAt ?? r.discoveredAt,
      rawJson: { ...prev.rawJson, ...r.rawJson },
    });
  }
  return [...map.values()];
}

/**
 * Ingest RansomLook recent + windowed posts + Malaysia search hits.
 * Never fetches claim/link targets — stored as text only.
 */
export async function ingestRansomLook(options?: {
  days?: number;
}): Promise<IngestRansomLookResult> {
  const days = Math.min(Math.max(options?.days ?? 90, 1), 90);
  const startedAt = new Date();
  const [run] = await db
    .insert(ingestRuns)
    .values({
      source: PROVIDER,
      startedAt,
      status: "running",
      counts: {},
    })
    .returning({ id: ingestRuns.id });

  const emptyCounts = {
    fetchedRecent: 0,
    fetchedWindow: 0,
    fetchedMySearch: 0,
    upserted: 0,
    inserted: 0,
    updated: 0,
    classified: 0,
    unclassified: 0,
  };

  try {
    const [recentRaw, postsRaw, myRaw] = await Promise.all([
      fetchJson("/recent"),
      fetchJson("/posts", { days: String(days) }),
      // Live API expects `q` (docs still say `query`).
      fetchJson("/search", { q: "malaysia" }),
    ]);

    const recent = unwrapPostsPayload(recentRaw)
      .map((p) => normalizeRansomLookPost(p))
      .filter((x): x is NormalizedRansomLookVictim => x != null);
    const windowed = unwrapPostsPayload(postsRaw)
      .map((p) => normalizeRansomLookPost(p))
      .filter((x): x is NormalizedRansomLookVictim => x != null);
    // Search returns { groups, posts, ... } — unwrap posts only.
    const myHits = unwrapPostsPayload(myRaw)
      .map((p) => normalizeRansomLookPost(p, { country: "MY" }))
      .filter((x): x is NormalizedRansomLookVictim => x != null);

    const records = dedupeRecords([...recent, ...windowed, ...myHits]);
    const { insertedIds, updated, upserted } = await upsertVictims(records);

    const descriptions = new Map<number, string | null>();
    for (const id of insertedIds) {
      const row = await db.query.ransomwareVictims.findFirst({
        where: eq(ransomwareVictims.id, id),
        columns: { rawJson: true },
      });
      const raw = row?.rawJson as { description?: string } | null;
      descriptions.set(
        id,
        typeof raw?.description === "string" ? raw.description : null,
      );
    }

    const { classified, unclassified } = await classifyNewVictims(
      insertedIds,
      descriptions,
    );

    const counts = {
      fetchedRecent: recent.length,
      fetchedWindow: windowed.length,
      fetchedMySearch: myHits.length,
      upserted,
      inserted: insertedIds.length,
      updated,
      classified,
      unclassified,
    };

    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "success",
        counts,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      source: PROVIDER,
      status: "success",
      ingestRunId: run.id,
      counts,
    };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "error",
        error,
        counts: emptyCounts,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      source: PROVIDER,
      status: "error",
      ingestRunId: run.id,
      counts: emptyCounts,
      error,
    };
  }
}
