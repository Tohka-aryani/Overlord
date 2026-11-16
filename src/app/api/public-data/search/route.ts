import { and, asc, count, countDistinct, eq, ilike, sql } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { actorIps, actors } from "@/db/schema";

/**
 * Autocomplete actors by username substring — returns page + total matches.
 * GET /api/public-data/search?q=luci&forum=darkforums&limit=50
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") ?? "").trim();
  const forum = (url.searchParams.get("forum") ?? "").trim().toLowerCase();
  const limit = Math.min(
    Math.max(
      Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50,
      1,
    ),
    50,
  );

  if (q.length < 1) {
    return NextResponse.json({
      q,
      forum: forum || null,
      count: 0,
      total: 0,
      items: [],
    });
  }

  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const whereForum = forum
    ? sql`${forum} = ANY(${actors.forums})`
    : undefined;
  const whereClause = whereForum
    ? and(ilike(actors.username, pattern), whereForum)
    : ilike(actors.username, pattern);

  const [totalRow] = await db
    .select({ count: count() })
    .from(actors)
    .where(whereClause);

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
    .where(whereClause)
    .groupBy(
      actors.id,
      actors.username,
      actors.forums,
      actors.firstSeenAt,
      actors.lastSeenAt,
    )
    .orderBy(sql`count(distinct ${actorIps.ip}) desc`, asc(actors.username))
    .limit(limit);

  const total = Number(totalRow?.count ?? 0);

  return NextResponse.json({
    q,
    forum: forum || null,
    count: rows.length,
    total,
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
