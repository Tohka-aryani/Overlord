import { asc, countDistinct, eq, ilike, sql } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { actorIps, actors } from "@/db/schema";

/**
 * Autocomplete actors by username substring.
 * GET /api/public-data/search?q=luci
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1),
    50,
  );

  if (q.length < 1) {
    return NextResponse.json({ q, count: 0, items: [] });
  }

  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;

  const rows = await db
    .select({
      id: actors.id,
      username: actors.username,
      forums: actors.forums,
      firstSeenAt: actors.firstSeenAt,
      lastSeenAt: actors.lastSeenAt,
      ipCount: countDistinct(actorIps.ip),
    })
    .from(actors)
    .leftJoin(actorIps, eq(actorIps.actorId, actors.id))
    .where(ilike(actors.username, pattern))
    .groupBy(
      actors.id,
      actors.username,
      actors.forums,
      actors.firstSeenAt,
      actors.lastSeenAt,
    )
    .orderBy(sql`count(distinct ${actorIps.ip}) desc`, asc(actors.username))
    .limit(limit);

  return NextResponse.json({
    q,
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      username: r.username,
      forums: r.forums,
      firstSeenAt: r.firstSeenAt,
      lastSeenAt: r.lastSeenAt,
      ipCount: Number(r.ipCount ?? 0),
    })),
  });
}
