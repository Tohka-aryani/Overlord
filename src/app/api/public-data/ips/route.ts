import { and, asc, eq, sql } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { actorIps, actors } from "@/db/schema";
import { jitterCountryCentroidStable } from "@/lib/geo/country-centroids";

/**
 * IPs for an actor. Prefer Malaysia-first ordering when ISO is known.
 * GET /api/public-data/ips?username=Lucifer
 * GET /api/public-data/ips?actorId=1&country=MY
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const username = (url.searchParams.get("username") ?? "").trim();
  const actorIdRaw = url.searchParams.get("actorId");
  const country = (url.searchParams.get("country") ?? "").trim().toUpperCase();
  const includeMap =
    (url.searchParams.get("map") ?? "1") !== "0" &&
    (url.searchParams.get("map") ?? "true") !== "false";

  const actorId =
    actorIdRaw !== null && actorIdRaw !== ""
      ? Number.parseInt(actorIdRaw, 10)
      : undefined;

  if (!username && (actorId === undefined || !Number.isFinite(actorId))) {
    return NextResponse.json(
      { error: "Provide username= or actorId=" },
      { status: 400 },
    );
  }

  let resolvedActor: {
    id: number;
    username: string;
    forums: string[];
  } | null = null;

  if (actorId !== undefined && Number.isFinite(actorId)) {
    const row = await db.query.actors.findFirst({
      where: eq(actors.id, actorId),
      columns: { id: true, username: true, forums: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }
    resolvedActor = row;
  } else {
    const row = await db.query.actors.findFirst({
      where: eq(actors.username, username),
      columns: { id: true, username: true, forums: true },
    });
    if (!row) {
      // Fallback: case-insensitive match for search UX
      const rows = await db
        .select({
          id: actors.id,
          username: actors.username,
          forums: actors.forums,
        })
        .from(actors)
        .where(sql`lower(${actors.username}) = ${username.toLowerCase()}`)
        .limit(1);
      resolvedActor = rows[0] ?? null;
    } else {
      resolvedActor = row;
    }
    if (!resolvedActor) {
      return NextResponse.json({ error: "Actor not found" }, { status: 404 });
    }
  }

  const filters = [eq(actorIps.actorId, resolvedActor.id)];
  if (country) {
    filters.push(eq(actorIps.countryIso, country));
  }

  const rows = await db
    .select({
      id: actorIps.id,
      actorId: actorIps.actorId,
      username: actorIps.username,
      ip: actorIps.ip,
      hostname: actorIps.hostname,
      countryIso: actorIps.countryIso,
      source: actorIps.source,
      createdAt: actorIps.createdAt,
    })
    .from(actorIps)
    .where(and(...filters))
    .orderBy(
      // Malaysia-first when ISO present; nulls last
      sql`case when ${actorIps.countryIso} = 'MY' then 0 else 1 end`,
      asc(actorIps.countryIso),
      asc(actorIps.ip),
    );

  const items = rows.map((r) => {
    const mapPoint =
      includeMap && r.countryIso
        ? jitterCountryCentroidStable(r.countryIso, r.ip)
        : null;
    return {
      ...r,
      map: mapPoint
        ? {
            iso: mapPoint.iso,
            lat: mapPoint.jitterLat,
            lon: mapPoint.jitterLon,
            centroidLat: mapPoint.lat,
            centroidLon: mapPoint.lon,
          }
        : null,
    };
  });

  return NextResponse.json({
    actor: resolvedActor,
    country: country || null,
    count: items.length,
    items,
  });
}
