import { and, desc, eq, inArray } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { classifications, newsItems } from "@/db/schema";

type LatestClassification = {
  id: number;
  threatLevel: string;
  category: string;
  malaysiaRelevance: string;
  sector: string | null;
  confidence: number | null;
  rationale: string | null;
  model: string | null;
  classifiedAt: Date;
};

export async function GET() {
  // Opt into request-time rendering (Next 16 cacheComponents).
  await connection();

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

  const latestByEntity = new Map<number, LatestClassification>();

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

  const items = rows.map((r) => ({
    ...r,
    classification: latestByEntity.get(r.id) ?? null,
  }));

  return NextResponse.json({
    count: items.length,
    items,
  });
}
