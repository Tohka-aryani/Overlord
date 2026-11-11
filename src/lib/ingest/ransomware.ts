import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  classifications,
  ingestRuns,
  ransomwareVictims,
} from "@/db/schema";
import { classifyEntity } from "@/lib/ollama";
import {
  normalizeCountryVictim,
  normalizeCyberattack,
  victimKey,
  type NormalizedVictim,
} from "@/lib/ingest/ransomware-normalize";

export {
  normalizeCountryVictim,
  normalizeCyberattack,
  toAttackDate,
  type NormalizedVictim,
} from "@/lib/ingest/ransomware-normalize";

const API_BASE = "https://api.ransomware.live/v2";
/** Free-tier: ~1 request per minute per endpoint. */
export const RANSOMWARE_LIVE_MIN_INTERVAL_MS = 60_000;
const MAX_429_ATTEMPTS = 5;
/** Stop further Ollama calls after this many consecutive nulls (model down / missing). */
const MAX_CONSECUTIVE_CLASSIFY_NULLS = 3;

export type IngestRansomwareResult = {
  source: "ransomware.live";
  country: string;
  status: "success" | "error";
  ingestRunId: number;
  counts: {
    fetchedVictims: number;
    fetchedCyberattacks: number;
    upserted: number;
    inserted: number;
    updated: number;
    classified: number;
    unclassified: number;
  };
  error?: string;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchRansomwareLive(path: string): Promise<unknown> {
  let attempt = 0;
  while (attempt < MAX_429_ATTEMPTS) {
    attempt += 1;
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (res.status === 429) {
      const backoff = Math.min(
        RANSOMWARE_LIVE_MIN_INTERVAL_MS * 2 ** (attempt - 1),
        5 * 60_000,
      );
      await sleep(backoff);
      continue;
    }

    if (!res.ok) {
      throw new Error(`ransomware.live ${path} → HTTP ${res.status}`);
    }

    return res.json();
  }

  throw new Error(`ransomware.live ${path} → rate limited after retries`);
}

async function upsertVictims(
  records: NormalizedVictim[],
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
      columns: { id: true },
    });

    if (existing) {
      await db
        .update(ransomwareVictims)
        .set({
          country: rec.country,
          sector: rec.sector,
          claimUrl: rec.claimUrl,
          rawJson: rec.rawJson,
        })
        .where(eq(ransomwareVictims.id, existing.id));
      updated += 1;
    } else {
      const [row] = await db
        .insert(ransomwareVictims)
        .values({
          victim: rec.victim,
          group: rec.group,
          country: rec.country,
          sector: rec.sector,
          attackDate: rec.attackDate,
          claimUrl: rec.claimUrl,
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
): Promise<{ classified: number; unclassified: number }> {
  if (insertedIds.length === 0) {
    return { classified: 0, unclassified: 0 };
  }

  let classified = 0;
  let unclassified = 0;
  let consecutiveNulls = 0;
  let skipClassify = false;

  for (const id of insertedIds) {
    if (skipClassify) {
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

    const bodyParts = [
      `Group: ${row.group}`,
      row.sector ? `Sector: ${row.sector}` : null,
      row.claimUrl ? `Claim URL (do not fetch): ${row.claimUrl}` : null,
    ].filter(Boolean);

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
      model: process.env.OLLAMA_MODEL || "qwen2.5:14b",
    });
    classified += 1;
  }

  return { classified, unclassified };
}

/**
 * Poll ransomware.live MY (or given ISO2) victims + cyberattacks,
 * upsert archive rows, classify new inserts via Ollama when available.
 * Never fetches Tor claim_url values — stored as text only.
 */
export async function ingestRansomware(options?: {
  country?: string;
}): Promise<IngestRansomwareResult> {
  const country = (options?.country ?? "MY").toUpperCase();
  const startedAt = new Date();
  const [run] = await db
    .insert(ingestRuns)
    .values({
      source: "ransomware.live",
      startedAt,
      status: "running",
      counts: {},
    })
    .returning({ id: ingestRuns.id });

  const emptyCounts = {
    fetchedVictims: 0,
    fetchedCyberattacks: 0,
    upserted: 0,
    inserted: 0,
    updated: 0,
    classified: 0,
    unclassified: 0,
  };

  try {
    const victimsPayload = await fetchRansomwareLive(
      `/countryvictims/${country}`,
    );
    // Respect ~1 req/min per endpoint before the second call.
    await sleep(RANSOMWARE_LIVE_MIN_INTERVAL_MS);
    const cyberPayload = await fetchRansomwareLive(
      `/countrycyberattacks/${country}`,
    );

    const victimRows = Array.isArray(victimsPayload) ? victimsPayload : [];
    const cyberRows = Array.isArray(cyberPayload) ? cyberPayload : [];

    const normalized: NormalizedVictim[] = [];
    const seen = new Set<string>();

    for (const row of victimRows) {
      const n = normalizeCountryVictim(row);
      if (!n) continue;
      if (n.country && n.country !== country) continue;
      const key = victimKey(n);
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(n);
    }

    for (const row of cyberRows) {
      const n = normalizeCyberattack(row);
      if (!n) continue;
      if (n.country && n.country !== country) continue;
      const key = victimKey(n);
      if (seen.has(key)) continue;
      seen.add(key);
      normalized.push(n);
    }

    const { insertedIds, updated, upserted } = await upsertVictims(normalized);
    const { classified, unclassified } = await classifyNewVictims(insertedIds);

    const counts = {
      fetchedVictims: victimRows.length,
      fetchedCyberattacks: cyberRows.length,
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
        error: null,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      source: "ransomware.live",
      country,
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
        counts: emptyCounts,
        error: message,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      source: "ransomware.live",
      country,
      status: "error",
      ingestRunId: run.id,
      counts: emptyCounts,
      error: message,
    };
  }
}
