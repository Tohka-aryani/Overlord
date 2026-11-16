import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classifications, newsItems } from "@/db/schema";
import { aggregateNewsStats, type NewsStats } from "@/lib/news-stats";

export type NewsClassification = {
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

export type NewsItem = {
  id: number;
  title: string;
  link: string;
  publishedAt: string | null;
  source: string | null;
  keywordHit: string | null;
  summary: string | null;
  createdAt: string;
  classification: NewsClassification | null;
};

export type NewsQueryResult = {
  count: number;
  stats: NewsStats;
  items: NewsItem[];
};

function iso(v: Date | string | null | undefined): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

export async function queryNews(): Promise<NewsQueryResult> {
  const rows = await db
    .select({
      id: newsItems.id,
      title: newsItems.title,
      link: newsItems.link,
      publishedAt: newsItems.publishedAt,
      source: newsItems.source,
      keywordHit: newsItems.keywordHit,
      summary: newsItems.summary,
      createdAt: newsItems.createdAt,
    })
    .from(newsItems)
    .orderBy(desc(newsItems.publishedAt), desc(newsItems.createdAt));

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

  if (rows.length > 0) {
    const ids = rows.map((r) => r.id);
    const classRows = await db
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
          eq(classifications.entityType, "news"),
          inArray(classifications.entityId, ids),
        ),
      )
      .orderBy(desc(classifications.classifiedAt));

    for (const row of classRows) {
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

  const items: NewsItem[] = rows.map((r) => {
    const c = latestByEntity.get(r.id) ?? null;
    return {
      id: r.id,
      title: r.title,
      link: r.link,
      publishedAt: iso(r.publishedAt),
      source: r.source,
      keywordHit: r.keywordHit,
      summary: r.summary,
      createdAt: iso(r.createdAt) ?? "",
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
            classifiedAt: iso(c.classifiedAt) ?? "",
          }
        : null,
    };
  });

  return {
    count: items.length,
    stats: aggregateNewsStats(items),
    items,
  };
}
