import { and, desc, eq, notExists, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  classifications,
  ingestRuns,
  newsItems,
  ransomwareVictims,
} from "@/db/schema";
import { classifyEntity, lastResolvedOllamaModel } from "@/lib/ollama";

/** Cap classifyEntity calls per backfill run (raise via env for local catch-up). */
export const MAX_CLASSIFY_PER_RUN = Math.max(
  0,
  Number.parseInt(process.env.MAX_CLASSIFY_PER_RUN ?? "25", 10) || 25,
);

const MAX_CONSECUTIVE_CLASSIFY_NULLS = 3;

export type ClassifyBackfillResult = {
  source: "classify-backfill";
  status: "success" | "error";
  ingestRunId: number;
  counts: {
    ransomwareCandidates: number;
    newsCandidates: number;
    attempted: number;
    classified: number;
    unclassified: number;
    remainingEstimate: number;
  };
  model: string | null;
  error?: string;
};

/**
 * Label ransomware + news rows that have no classifications row yet.
 * Prefer recent victims/news; stop after MAX_CLASSIFY_PER_RUN or consecutive nulls.
 */
export async function runClassifyBackfill(): Promise<ClassifyBackfillResult> {
  const startedAt = new Date();
  const [run] = await db
    .insert(ingestRuns)
    .values({
      source: "classify-backfill",
      startedAt,
      status: "running",
      counts: {},
    })
    .returning({ id: ingestRuns.id });

  const ingestRunId = run.id;
  let classified = 0;
  let unclassified = 0;
  let attempted = 0;
  let consecutiveNulls = 0;
  let ransomwareCandidates = 0;
  let newsCandidates = 0;

  try {
    const rwMissing = await db
      .select({
        id: ransomwareVictims.id,
        victim: ransomwareVictims.victim,
        group: ransomwareVictims.group,
        country: ransomwareVictims.country,
        sector: ransomwareVictims.sector,
        attackDate: ransomwareVictims.attackDate,
        claimUrl: ransomwareVictims.claimUrl,
        source: ransomwareVictims.source,
      })
      .from(ransomwareVictims)
      .where(
        notExists(
          db
            .select({ one: sql`1` })
            .from(classifications)
            .where(
              and(
                eq(classifications.entityType, "ransomware"),
                eq(classifications.entityId, ransomwareVictims.id),
              ),
            ),
        ),
      )
      .orderBy(
        desc(ransomwareVictims.attackDate),
        desc(ransomwareVictims.discoveredAt),
      )
      .limit(MAX_CLASSIFY_PER_RUN);

    ransomwareCandidates = rwMissing.length;

    const remainingBudget = Math.max(0, MAX_CLASSIFY_PER_RUN - rwMissing.length);

    const newsMissing =
      remainingBudget === 0
        ? []
        : await db
            .select({
              id: newsItems.id,
              title: newsItems.title,
              source: newsItems.source,
              keywordHit: newsItems.keywordHit,
              summary: newsItems.summary,
              link: newsItems.link,
            })
            .from(newsItems)
            .where(
              notExists(
                db
                  .select({ one: sql`1` })
                  .from(classifications)
                  .where(
                    and(
                      eq(classifications.entityType, "news"),
                      eq(classifications.entityId, newsItems.id),
                    ),
                  ),
              ),
            )
            .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt))
            .limit(remainingBudget);

    newsCandidates = newsMissing.length;

    let skipClassify = false;

    for (const row of rwMissing) {
      if (skipClassify || attempted >= MAX_CLASSIFY_PER_RUN) break;
      attempted += 1;
      const bodyParts = [
        `group: ${row.group}`,
        row.country ? `country: ${row.country}` : null,
        row.sector ? `sector: ${row.sector}` : null,
        `attack_date: ${row.attackDate}`,
        row.claimUrl ? `claim_url: ${row.claimUrl}` : null,
        `source: ${row.source}`,
      ].filter(Boolean) as string[];

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
        entityId: row.id,
        threatLevel: result.threat_level,
        category: result.category,
        malaysiaRelevance: result.malaysia_relevance,
        sector: result.sector,
        confidence: result.confidence,
        rationale: result.rationale,
        model: lastResolvedOllamaModel() ?? process.env.OLLAMA_MODEL ?? null,
      });
      classified += 1;
    }

    for (const row of newsMissing) {
      if (skipClassify || attempted >= MAX_CLASSIFY_PER_RUN) break;
      attempted += 1;
      const bodyParts = [
        row.source ? `source: ${row.source}` : null,
        row.keywordHit ? `keyword: ${row.keywordHit}` : null,
        row.summary ? `summary: ${row.summary}` : null,
        `link: ${row.link}`,
      ].filter(Boolean) as string[];

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
        entityId: row.id,
        threatLevel: result.threat_level,
        category: result.category,
        malaysiaRelevance: result.malaysia_relevance,
        sector: result.sector,
        confidence: result.confidence,
        rationale: result.rationale,
        model: lastResolvedOllamaModel() ?? process.env.OLLAMA_MODEL ?? null,
      });
      classified += 1;
    }

    const [rwLeft] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(ransomwareVictims)
      .where(
        notExists(
          db
            .select({ one: sql`1` })
            .from(classifications)
            .where(
              and(
                eq(classifications.entityType, "ransomware"),
                eq(classifications.entityId, ransomwareVictims.id),
              ),
            ),
        ),
      );

    const [newsLeft] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(newsItems)
      .where(
        notExists(
          db
            .select({ one: sql`1` })
            .from(classifications)
            .where(
              and(
                eq(classifications.entityType, "news"),
                eq(classifications.entityId, newsItems.id),
              ),
            ),
        ),
      );

    const remainingEstimate = (rwLeft?.count ?? 0) + (newsLeft?.count ?? 0);

    const counts = {
      ransomwareCandidates,
      newsCandidates,
      attempted,
      classified,
      unclassified,
      remainingEstimate,
    };

    await db
      .update(ingestRuns)
      .set({
        status: "success",
        finishedAt: new Date(),
        counts,
      })
      .where(eq(ingestRuns.id, ingestRunId));

    return {
      source: "classify-backfill",
      status: "success",
      ingestRunId,
      counts,
      model: lastResolvedOllamaModel(),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(ingestRuns)
      .set({
        status: "error",
        finishedAt: new Date(),
        error: message,
        counts: {
          ransomwareCandidates,
          newsCandidates,
          attempted,
          classified,
          unclassified,
        },
      })
      .where(eq(ingestRuns.id, ingestRunId));

    return {
      source: "classify-backfill",
      status: "error",
      ingestRunId,
      counts: {
        ransomwareCandidates,
        newsCandidates,
        attempted,
        classified,
        unclassified,
        remainingEstimate: -1,
      },
      model: lastResolvedOllamaModel(),
      error: message,
    };
  }
}
