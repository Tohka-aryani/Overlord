import { and, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { classifications, ransomwareVictims } from "@/db/schema";
import {
  aggregateRansomwareStats,
  matchesSectorFilter,
  matchesThreatFilter,
  type RansomwareStats,
} from "@/lib/ransomware-stats";

export type RansomwareClassification = {
  id: number;
  threatLevel: string;
  category: string;
  malaysiaRelevance: string;
  sector: string | null;
  confidence: number | null;
  rationale: string | null;
  model: string | null;
  classifiedAt: string;
};

export type RansomwareItem = {
  id: number;
  victim: string;
  group: string;
  country: string | null;
  sector: string | null;
  attackDate: string;
  claimUrl: string | null;
  source: string;
  sources: string[];
  discoveredAt: string;
  classification: RansomwareClassification | null;
};

export type RansomwareQueryInput = {
  country?: string;
  source?: string;
  days?: number | null;
  group?: string;
  sector?: string;
  threat?: string;
  q?: string;
  limit?: number;
};

export type RansomwareQueryResult = {
  country: string;
  source: string;
  days: number | null;
  group: string | null;
  sector: string | null;
  threat: string | null;
  q: string | null;
  /** Rows returned in this page (after threat/sector filters). */
  count: number;
  /** Full match count before list limit (country/source/days/q/group). */
  total: number;
  limit: number;
  stats: RansomwareStats;
  items: RansomwareItem[];
};

/** Combined archive list floor — enough for 3k+ dual-source posting. */
export const RANSOMWARE_LIST_LIMIT = 5000;

const victimColumns = {
  id: ransomwareVictims.id,
  victim: ransomwareVictims.victim,
  group: ransomwareVictims.group,
  country: ransomwareVictims.country,
  sector: ransomwareVictims.sector,
  attackDate: ransomwareVictims.attackDate,
  claimUrl: ransomwareVictims.claimUrl,
  source: ransomwareVictims.source,
  sources: ransomwareVictims.sources,
  discoveredAt: ransomwareVictims.discoveredAt,
} as const;

export async function queryRansomware(
  input: RansomwareQueryInput = {},
): Promise<RansomwareQueryResult> {
  const country = (input.country ?? "MY").toUpperCase();
  const sourceFilter = (input.source ?? "all").trim();
  const groupFilter = (input.group ?? "").trim();
  const sectorFilter = (input.sector ?? "").trim();
  const threatFilter = (input.threat ?? "").trim();
  const q = (input.q ?? "").trim();
  const days =
    input.days != null && Number.isFinite(input.days) && input.days > 0
      ? input.days
      : null;
  const limit = Math.min(
    Math.max(input.limit ?? RANSOMWARE_LIST_LIMIT, 1),
    10_000,
  );
  const filterCountry = country !== "ALL" && country !== "*";

  const conditions = [];

  if (filterCountry) {
    conditions.push(eq(ransomwareVictims.country, country));
  }

  if (sourceFilter && sourceFilter !== "all") {
    conditions.push(
      or(
        eq(ransomwareVictims.source, sourceFilter),
        sql`${sourceFilter} = ANY(${ransomwareVictims.sources})`,
      ),
    );
  }

  if (groupFilter) {
    conditions.push(eq(ransomwareVictims.group, groupFilter));
  }

  if (q) {
    const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(ransomwareVictims.victim, pattern),
        ilike(ransomwareVictims.group, pattern),
      ),
    );
  }

  if (days) {
    const since = new Date();
    since.setUTCDate(since.getUTCDate() - days);
    conditions.push(gte(ransomwareVictims.discoveredAt, since));
  }

  const whereClause =
    conditions.length === 0
      ? undefined
      : conditions.length === 1
        ? conditions[0]
        : and(...conditions);

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ransomwareVictims)
    .where(whereClause);
  const totalMatched = Number(totalRow?.count ?? 0);

  const victims = await db
    .select(victimColumns)
    .from(ransomwareVictims)
    .where(whereClause)
    .orderBy(
      desc(ransomwareVictims.attackDate),
      desc(ransomwareVictims.discoveredAt),
    )
    .limit(limit);

  const latestByEntity = new Map<
    number,
    {
      id: number;
      threatLevel: string;
      category: string;
      malaysiaRelevance: string;
      sector: string | null;
      confidence: number | null;
      rationale: string | null;
      model: string | null;
      classifiedAt: Date;
    }
  >();

  if (victims.length > 0) {
    const ids = victims.map((v) => v.id);
    const rows = await db
      .select({
        id: classifications.id,
        entityId: classifications.entityId,
        threatLevel: classifications.threatLevel,
        category: classifications.category,
        malaysiaRelevance: classifications.malaysiaRelevance,
        sector: classifications.sector,
        confidence: classifications.confidence,
        rationale: classifications.rationale,
        model: classifications.model,
        classifiedAt: classifications.classifiedAt,
      })
      .from(classifications)
      .where(
        and(
          eq(classifications.entityType, "ransomware"),
          inArray(classifications.entityId, ids),
        ),
      )
      .orderBy(desc(classifications.classifiedAt));

    for (const row of rows) {
      if (latestByEntity.has(row.entityId)) continue;
      latestByEntity.set(row.entityId, {
        id: row.id,
        threatLevel: row.threatLevel,
        category: row.category,
        malaysiaRelevance: row.malaysiaRelevance,
        sector: row.sector,
        confidence: row.confidence,
        rationale: row.rationale,
        model: row.model,
        classifiedAt: row.classifiedAt,
      });
    }
  }

  let items: RansomwareItem[] = victims.map((v) => {
    const c = latestByEntity.get(v.id) ?? null;
    return {
      id: v.id,
      victim: v.victim,
      group: v.group,
      country: v.country,
      sector: v.sector,
      attackDate: v.attackDate,
      claimUrl: v.claimUrl,
      source: v.source,
      sources: v.sources ?? [],
      discoveredAt:
        v.discoveredAt instanceof Date
          ? v.discoveredAt.toISOString()
          : String(v.discoveredAt),
      classification: c
        ? {
            id: c.id,
            threatLevel: c.threatLevel,
            category: c.category,
            malaysiaRelevance: c.malaysiaRelevance,
            sector: c.sector,
            confidence: c.confidence,
            rationale: c.rationale,
            model: c.model,
            classifiedAt:
              c.classifiedAt instanceof Date
                ? c.classifiedAt.toISOString()
                : String(c.classifiedAt),
          }
        : null,
    };
  });

  if (sectorFilter) {
    items = items.filter((item) =>
      matchesSectorFilter(
        item.sector,
        item.classification?.sector,
        sectorFilter,
      ),
    );
  }

  if (threatFilter) {
    items = items.filter((item) =>
      matchesThreatFilter(item.classification?.threatLevel, threatFilter),
    );
  }

  return {
    country,
    source: sourceFilter,
    days,
    group: groupFilter || null,
    sector: sectorFilter || null,
    threat: threatFilter || null,
    q: q || null,
    count: items.length,
    total: totalMatched,
    limit,
    stats: aggregateRansomwareStats(items),
    items,
  };
}
