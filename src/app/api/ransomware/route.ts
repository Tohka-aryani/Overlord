import { and, desc, eq, inArray } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { classifications, ransomwareVictims } from "@/db/schema";

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

export async function GET(request: Request) {
  // Opt into request-time rendering (Next 16 cacheComponents).
  await connection();

  const url = new URL(request.url);
  const country = (url.searchParams.get("country") ?? "MY").toUpperCase();

  const victims = await db
    .select({
      id: ransomwareVictims.id,
      victim: ransomwareVictims.victim,
      group: ransomwareVictims.group,
      country: ransomwareVictims.country,
      sector: ransomwareVictims.sector,
      attackDate: ransomwareVictims.attackDate,
      claimUrl: ransomwareVictims.claimUrl,
      discoveredAt: ransomwareVictims.discoveredAt,
    })
    .from(ransomwareVictims)
    .where(eq(ransomwareVictims.country, country))
    .orderBy(
      desc(ransomwareVictims.attackDate),
      desc(ransomwareVictims.discoveredAt),
    );

  const latestByEntity = new Map<number, LatestClassification>();

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

  const items = victims.map((v) => ({
    ...v,
    classification: latestByEntity.get(v.id) ?? null,
  }));

  return NextResponse.json({
    country,
    count: items.length,
    items,
  });
}
