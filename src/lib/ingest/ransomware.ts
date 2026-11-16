import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  classifications,
  ingestRuns,
  ransomwareVictims,
} from "@/db/schema";
import { classifyEntity, lastResolvedOllamaModel } from "@/lib/ollama";
import { inferCountryFromText } from "@/lib/geo/infer-country";
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
/** Cap classifyEntity calls per ingest run (serverless maxDuration budget). */
export const MAX_CLASSIFY_PER_RUN = Math.max(
  0,
  Number.parseInt(process.env.MAX_CLASSIFY_PER_RUN ?? "25", 10) || 25,
);

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
    countryBackfilled?: number;
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
      columns: {
        id: true,
        sources: true,
        country: true,
        sector: true,
        claimUrl: true,
      },
    });

    if (existing) {
      const sources = [
        ...new Set([...(existing.sources ?? []), "ransomware.live"]),
      ];
      await db
        .update(ransomwareVictims)
        .set({
          country: rec.country ?? existing.country ?? null,
          sector: rec.sector ?? existing.sector ?? null,
          claimUrl: rec.claimUrl ?? existing.claimUrl ?? null,
          source: "ransomware.live",
          sources,
          rawJson: rec.rawJson,
          ...(rec.discoveredAt ? { discoveredAt: rec.discoveredAt } : {}),
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
          source: "ransomware.live",
          sources: ["ransomware.live"],
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

    const bodyParts = [
      `Group: ${row.group}`,
      row.sector ? `Sector: ${row.sector}` : null,
      row.claimUrl ? `Claim URL (do not fetch): ${row.claimUrl}` : null,
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
    classified += 1;
  }

  return { classified, unclassified };
}

function pushUnique(
  out: NormalizedVictim[],
  seen: Set<string>,
  n: NormalizedVictim,
) {
  const key = victimKey(n);
  if (seen.has(key)) return;
  seen.add(key);
  const country =
    n.country ?? inferCountryFromText(n.victim, n.sector) ?? null;
  out.push(country === n.country ? n : { ...n, country });
}

/** Backfill null countries from victim text / matching rows with a country. */
async function backfillMissingCountries(): Promise<number> {
  const missing = await db
    .select({
      id: ransomwareVictims.id,
      victim: ransomwareVictims.victim,
      group: ransomwareVictims.group,
      sector: ransomwareVictims.sector,
    })
    .from(ransomwareVictims)
    .where(isNull(ransomwareVictims.country))
    .limit(5000);

  let updated = 0;
  for (const row of missing) {
    const inferred = inferCountryFromText(row.victim, row.sector);
    if (!inferred) continue;
    await db
      .update(ransomwareVictims)
      .set({ country: inferred })
      .where(eq(ransomwareVictims.id, row.id));
    updated += 1;
  }

  // Copy country from same victim+group when another source already has it.
  await db.execute(sql`
    UPDATE ransomware_victims AS a
    SET country = b.country
    FROM ransomware_victims AS b
    WHERE a.country IS NULL
      AND b.country IS NOT NULL
      AND lower(a.victim) = lower(b.victim)
      AND lower(a."group") = lower(b."group")
      AND a.id <> b.id
  `);

  return updated;
}

/**
 * Poll ransomware.live — country mode (default MY) or global recent + yearly dumps.
 * Never fetches Tor claim_url values — stored as text only.
 */
export async function ingestRansomware(options?: {
  country?: string;
}): Promise<IngestRansomwareResult> {
  const country = (options?.country ?? "MY").toUpperCase();
  const global = country === "ALL" || country === "*";
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

  let runFinalized = false;
  let partialCounts = { ...emptyCounts };

  try {
    const normalized: NormalizedVictim[] = [];
    const seen = new Set<string>();
    let victimRows: unknown[] = [];
    let cyberRows: unknown[] = [];

    if (global) {
      const year = new Date().getUTCFullYear();
      const paths = [
        "/recentvictims",
        `/victims/${year}`,
        `/victims/${year - 1}`,
      ];
      for (let i = 0; i < paths.length; i++) {
        if (i > 0) await sleep(RANSOMWARE_LIVE_MIN_INTERVAL_MS);
        const payload = await fetchRansomwareLive(paths[i]!);
        const rows = Array.isArray(payload) ? payload : [];
        victimRows = victimRows.concat(rows);
        for (const row of rows) {
          const n = normalizeCountryVictim(row);
          if (n) pushUnique(normalized, seen, n);
        }
      }
    } else {
      const victimsPayload = await fetchRansomwareLive(
        `/countryvictims/${country}`,
      );
      await sleep(RANSOMWARE_LIVE_MIN_INTERVAL_MS);
      const cyberPayload = await fetchRansomwareLive(
        `/countrycyberattacks/${country}`,
      );

      victimRows = Array.isArray(victimsPayload) ? victimsPayload : [];
      cyberRows = Array.isArray(cyberPayload) ? cyberPayload : [];

      for (const row of victimRows) {
        const n = normalizeCountryVictim(row);
        if (!n) continue;
        if (n.country && n.country !== country) continue;
        pushUnique(normalized, seen, {
          ...n,
          country: n.country ?? country,
        });
      }

      for (const row of cyberRows) {
        const n = normalizeCyberattack(row);
        if (!n) continue;
        if (n.country && n.country !== country) continue;
        pushUnique(normalized, seen, {
          ...n,
          country: n.country ?? country,
        });
      }
    }

    partialCounts = {
      ...emptyCounts,
      fetchedVictims: victimRows.length,
      fetchedCyberattacks: cyberRows.length,
    };

    const { insertedIds, updated, upserted } = await upsertVictims(normalized);
    // Global dumps are large — defer classify to /api/ingest/classify-backfill.
    const { classified, unclassified } = global
      ? { classified: 0, unclassified: insertedIds.length }
      : await classifyNewVictims(insertedIds);
    const countryBackfilled = await backfillMissingCountries();

    const counts = {
      fetchedVictims: victimRows.length,
      fetchedCyberattacks: cyberRows.length,
      upserted,
      inserted: insertedIds.length,
      updated,
      classified,
      unclassified,
      countryBackfilled,
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
      source: "ransomware.live",
      country: global ? "ALL" : country,
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
      source: "ransomware.live",
      country: global ? "ALL" : country,
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
