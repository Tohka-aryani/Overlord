import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  actors,
  classifications,
  ingestRuns,
  newsItems,
  ransomwareVictims,
} from "@/db/schema";
import { threatSortRank } from "@/lib/threat-rank";

export type NeedsAttentionItem = {
  key: string;
  kind: "ransomware" | "news";
  title: string;
  detail: string;
  threatLevel: string | null;
  at: string | null;
  href: string;
};

export type IngestStatusRow = {
  source: string;
  label: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  error: string | null;
};

export type ThreatBucket = {
  level: string;
  count: number;
};

export type OverviewData = {
  myVictimCount: number;
  newsCount: number;
  actorCount: number;
  highThreatCount: number | null;
  unclassifiedEntityCount: number;
  classifiedEntityCount: number;
  threatBuckets: ThreatBucket[];
  ingest: IngestStatusRow[];
  needsAttention: NeedsAttentionItem[];
};

const INGEST_SOURCES: { source: string; label: string }[] = [
  { source: "ransomware.live", label: "Ransomware" },
  { source: "google-news-rss", label: "News RSS" },
  { source: "public-data", label: "Public Data" },
];

type ClassRow = {
  entityId: number;
  threatLevel: string;
  classifiedAt: Date;
};

function latestByEntity(rows: ClassRow[]): Map<number, ClassRow> {
  const map = new Map<number, ClassRow>();
  for (const row of rows) {
    if (!map.has(row.entityId)) map.set(row.entityId, row);
  }
  return map;
}

export async function getOverviewData(
  attentionLimit = 30,
): Promise<OverviewData> {
  const [myVictimRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ransomwareVictims)
    .where(eq(ransomwareVictims.country, "MY"));

  const [newsCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(newsItems);

  const [actorCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(actors);

  const myVictimCount = myVictimRow?.count ?? 0;
  const newsCount = newsCountRow?.count ?? 0;
  const actorCount = actorCountRow?.count ?? 0;

  const victims = await db
    .select({
      id: ransomwareVictims.id,
      victim: ransomwareVictims.victim,
      group: ransomwareVictims.group,
      attackDate: ransomwareVictims.attackDate,
      discoveredAt: ransomwareVictims.discoveredAt,
    })
    .from(ransomwareVictims)
    .where(eq(ransomwareVictims.country, "MY"))
    .orderBy(
      desc(ransomwareVictims.attackDate),
      desc(ransomwareVictims.discoveredAt),
    )
    .limit(80);

  const news = await db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      source: newsItems.source,
      keywordHit: newsItems.keywordHit,
      publishedAt: newsItems.publishedAt,
      createdAt: newsItems.createdAt,
    })
    .from(newsItems)
    .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt))
    .limit(80);

  const victimIds = victims.map((v) => v.id);
  const newsIds = news.map((n) => n.id);

  const ransomwareClasses =
    victimIds.length === 0
      ? []
      : await db
          .select({
            entityId: classifications.entityId,
            threatLevel: classifications.threatLevel,
            classifiedAt: classifications.classifiedAt,
          })
          .from(classifications)
          .where(
            and(
              eq(classifications.entityType, "ransomware"),
              inArray(classifications.entityId, victimIds),
            ),
          )
          .orderBy(desc(classifications.classifiedAt));

  const newsClasses =
    newsIds.length === 0
      ? []
      : await db
          .select({
            entityId: classifications.entityId,
            threatLevel: classifications.threatLevel,
            classifiedAt: classifications.classifiedAt,
          })
          .from(classifications)
          .where(
            and(
              eq(classifications.entityType, "news"),
              inArray(classifications.entityId, newsIds),
            ),
          )
          .orderBy(desc(classifications.classifiedAt));

  const rwMap = latestByEntity(ransomwareClasses);
  const newsMap = latestByEntity(newsClasses);

  let classifiedEntityCount = 0;
  let highThreatCount = 0;

  for (const v of victims) {
    const c = rwMap.get(v.id);
    if (c) {
      classifiedEntityCount += 1;
      if (c.threatLevel === "Critical" || c.threatLevel === "High") {
        highThreatCount += 1;
      }
    }
  }
  for (const n of news) {
    const c = newsMap.get(n.id);
    if (c) {
      classifiedEntityCount += 1;
      if (c.threatLevel === "Critical" || c.threatLevel === "High") {
        highThreatCount += 1;
      }
    }
  }

  const sampledEntityCount = victims.length + news.length;
  const unclassifiedEntityCount = Math.max(
    0,
    sampledEntityCount - classifiedEntityCount,
  );

  // Honest pulse: if nothing is Critical/High yet and archive is largely unlabeled, surface note.
  const highThreatOrNull =
    highThreatCount > 0
      ? highThreatCount
      : classifiedEntityCount === 0 || unclassifiedEntityCount > classifiedEntityCount
        ? null
        : 0;

  const needsAttention: NeedsAttentionItem[] = [
    ...victims.map((v) => {
      const c = rwMap.get(v.id);
      return {
        key: `ransomware:${v.id}`,
        kind: "ransomware" as const,
        title: v.victim,
        detail: v.group,
        threatLevel: c?.threatLevel ?? null,
        at: v.attackDate ?? v.discoveredAt?.toISOString() ?? null,
        href: "/ransomware",
      };
    }),
    ...news.map((n) => {
      const c = newsMap.get(n.id);
      return {
        key: `news:${n.id}`,
        kind: "news" as const,
        title: n.title,
        detail: n.keywordHit ?? n.source ?? "News",
        threatLevel: c?.threatLevel ?? null,
        at: n.publishedAt?.toISOString() ?? n.createdAt.toISOString(),
        href: "/news",
      };
    }),
  ]
    .sort((a, b) => {
      const rank = threatSortRank(a.threatLevel) - threatSortRank(b.threatLevel);
      if (rank !== 0) return rank;
      const aAt = a.at ?? "";
      const bAt = b.at ?? "";
      return bAt.localeCompare(aAt);
    })
    .slice(0, attentionLimit);

  const recentRuns = await db
    .select({
      source: ingestRuns.source,
      status: ingestRuns.status,
      startedAt: ingestRuns.startedAt,
      finishedAt: ingestRuns.finishedAt,
      error: ingestRuns.error,
    })
    .from(ingestRuns)
    .orderBy(desc(ingestRuns.startedAt))
    .limit(40);

  const latestBySource = new Map<string, (typeof recentRuns)[number]>();
  for (const run of recentRuns) {
    if (!latestBySource.has(run.source)) {
      latestBySource.set(run.source, run);
    }
  }

  const ingest: IngestStatusRow[] = INGEST_SOURCES.map(({ source, label }) => {
    const run = latestBySource.get(source);
    if (!run) {
      return {
        source,
        label,
        status: "never",
        startedAt: "",
        finishedAt: null,
        error: null,
      };
    }
    return {
      source,
      label,
      status: run.status,
      startedAt: run.startedAt.toISOString(),
      finishedAt: run.finishedAt?.toISOString() ?? null,
      error: run.error,
    };
  });

  const threatTally = new Map<string, number>();
  for (const item of needsAttention) {
    const level = item.threatLevel ?? "Unclassified";
    threatTally.set(level, (threatTally.get(level) ?? 0) + 1);
  }
  // Also count remaining unclassified in sample beyond attention list
  threatTally.set(
    "Unclassified",
    Math.max(
      threatTally.get("Unclassified") ?? 0,
      unclassifiedEntityCount,
    ),
  );
  const threatBuckets: ThreatBucket[] = [...threatTally.entries()].map(
    ([level, count]) => ({ level, count }),
  );

  return {
    myVictimCount,
    newsCount,
    actorCount,
    highThreatCount: highThreatOrNull,
    unclassifiedEntityCount,
    classifiedEntityCount,
    threatBuckets,
    ingest,
    needsAttention,
  };
}
