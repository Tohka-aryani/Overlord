import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  actors,
  classifications,
  ingestRuns,
  newsItems,
  ransomwareVictims,
} from "@/db/schema";
import {
  queryAttention,
  queryHighThreatCount,
  queryThreatBuckets,
} from "@/lib/overview-attention";

export type NeedsAttentionItem = {
  key: string;
  kind: "ransomware" | "news";
  title: string;
  detail: string;
  threatLevel: string | null;
  at: string | null;
  href: string;
  /** True when href opens the original article / clearnet source. */
  external?: boolean;
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

export type CountryCaseCount = {
  country: string;
  count: number;
};

export type OverviewData = {
  myVictimCount: number;
  rwVictimTotal: number;
  newsCount: number;
  actorCount: number;
  highThreatCount: number | null;
  unclassifiedEntityCount: number;
  classifiedEntityCount: number;
  archiveClassified: number;
  archiveTotal: number;
  threatBuckets: ThreatBucket[];
  byCountry: CountryCaseCount[];
  ingest: IngestStatusRow[];
  /** First page of full-archive Needs Attention (client re-fetches on filter). */
  attention: {
    items: NeedsAttentionItem[];
    total: number;
    page: number;
    pageSize: number;
  };
};

const INGEST_SOURCES: { source: string; label: string }[] = [
  { source: "ransomware.live", label: "Ransomware" },
  { source: "ransomlook.io", label: "RansomLook" },
  { source: "google-news-rss", label: "News RSS" },
  { source: "telegram:breachdetect", label: "Telegram" },
  { source: "public-data", label: "Public Data" },
  { source: "classify-backfill", label: "Classify backfill" },
  { source: "tor-sites", label: "Tor Apify" },
];

export type OverviewAttentionOpts = {
  threat?: string;
  sort?: "threat" | "signal" | "source" | "when";
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

/** Pulse KPIs + full-archive threat buckets (Needs Attention via /api/overview/attention). */
export async function getOverviewData(
  attentionOpts: OverviewAttentionOpts = {},
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

  const [rwTotalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(ransomwareVictims);

  const rwVictimTotal = rwTotalRow?.count ?? 0;

  const [rwClassifiedRow] = await db
    .select({
      count: sql<number>`count(distinct ${classifications.entityId})::int`,
    })
    .from(classifications)
    .where(eq(classifications.entityType, "ransomware"));

  const [newsClassifiedRow] = await db
    .select({
      count: sql<number>`count(distinct ${classifications.entityId})::int`,
    })
    .from(classifications)
    .where(eq(classifications.entityType, "news"));

  const archiveTotal = rwVictimTotal + newsCount;
  const archiveClassified =
    (rwClassifiedRow?.count ?? 0) + (newsClassifiedRow?.count ?? 0);
  const unclassifiedEntityCount = Math.max(0, archiveTotal - archiveClassified);

  const [threatBuckets, highThreatCount, attention, countryRows] =
    await Promise.all([
      queryThreatBuckets(),
      queryHighThreatCount(),
      queryAttention({
        threat: attentionOpts.threat ?? "All",
        sort: attentionOpts.sort ?? "threat",
        dir: attentionOpts.dir ?? "asc",
        page: attentionOpts.page ?? 1,
        pageSize: attentionOpts.pageSize ?? 50,
      }),
      db
        .select({
          country: ransomwareVictims.country,
          count: sql<number>`count(*)::int`,
        })
        .from(ransomwareVictims)
        .groupBy(ransomwareVictims.country)
        .orderBy(desc(sql`count(*)`)),
    ]);

  const byCountry: CountryCaseCount[] = countryRows
    .map((r) => ({
      country: (r.country ?? "").trim().toUpperCase() || "??",
      count: Number(r.count) || 0,
    }))
    .filter((r) => r.count > 0);

  const highThreatOrNull =
    highThreatCount > 0
      ? highThreatCount
      : archiveClassified === 0 || unclassifiedEntityCount > archiveClassified
        ? null
        : 0;

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

  return {
    myVictimCount,
    rwVictimTotal,
    newsCount,
    actorCount,
    highThreatCount: highThreatOrNull,
    unclassifiedEntityCount,
    classifiedEntityCount: archiveClassified,
    archiveClassified,
    archiveTotal,
    threatBuckets,
    byCountry,
    ingest,
    attention,
  };
}
