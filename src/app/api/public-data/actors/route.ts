import { asc, countDistinct, desc, eq, sql } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { actorIps, actors } from "@/db/schema";

/**
 * List archived actors (with IP counts).
 * GET /api/public-data/actors?limit=50&offset=0&forum=darkforums
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const limit = Math.min(
    Math.max(Number.parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1),
    500,
  );
  const offset = Math.max(
    Number.parseInt(url.searchParams.get("offset") ?? "0", 10) || 0,
    0,
  );
  const forum = (url.searchParams.get("forum") ?? "").trim().toLowerCase();

  const whereForum = forum
    ? sql`${forum} = ANY(${actors.forums})`
    : undefined;

  const rows = await db
    .select({
      id: actors.id,
      username: actors.username,
      forums: actors.forums,
      firstSeenAt: actors.firstSeenAt,
      lastSeenAt: actors.lastSeenAt,
      createdAt: actors.createdAt,
      ipCount: countDistinct(actorIps.ip),
    })
    .from(actors)
    .leftJoin(actorIps, eq(actorIps.actorId, actors.id))
    .where(whereForum)
    .groupBy(
      actors.id,
      actors.username,
      actors.forums,
      actors.firstSeenAt,
      actors.lastSeenAt,
      actors.createdAt,
    )
    .orderBy(desc(sql`count(distinct ${actorIps.ip})`), asc(actors.username))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({
    forum: forum || null,
    limit,
    offset,
    count: rows.length,
    items: rows.map((r) => ({
      id: r.id,
      username: r.username,
      forums: r.forums,
      firstSeenAt: r.firstSeenAt,
      lastSeenAt: r.lastSeenAt,
      createdAt: r.createdAt,
      ipCount: Number(r.ipCount ?? 0),
    })),
  });
}
