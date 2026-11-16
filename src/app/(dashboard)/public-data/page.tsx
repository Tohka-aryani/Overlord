import { Suspense } from "react";
import { connection } from "next/server";
import { and, asc, count, countDistinct, desc, eq, sql } from "drizzle-orm";
import { PublicDataClient } from "@/components/public-data/PublicDataClient";
import type {
  ActorSummary,
  IpDetailResponse,
  IpItem,
} from "@/components/public-data/types";
import { db } from "@/db";
import { actorIps, actors } from "@/db/schema";
import { jitterCountryCentroidStable } from "@/lib/geo/country-centroids";

const PAGE_SIZE = 100;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

async function loadInitial(sp: Record<string, string | string[] | undefined>) {
  await connection();

  const actorParam = (first(sp.actor) ?? "").trim();
  const detailIp = (first(sp.detailIp) ?? "").trim();
  const limitRaw = Number.parseInt(first(sp.limit) ?? String(PAGE_SIZE), 10);
  const limit = Math.min(
    Math.max(Number.isFinite(limitRaw) ? limitRaw : PAGE_SIZE, PAGE_SIZE),
    2000,
  );

  const [totalRow] = await db.select({ count: count() }).from(actors);
  const total = Number(totalRow?.count ?? 0);

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
    .groupBy(
      actors.id,
      actors.username,
      actors.forums,
      actors.firstSeenAt,
      actors.lastSeenAt,
    )
    .orderBy(desc(sql`count(distinct ${actorIps.ip})`), asc(actors.username))
    .limit(limit);

  const forumRows = await db
    .select({ forums: actors.forums })
    .from(actors)
    .limit(5000);
  const forumSet = new Set<string>();
  for (const row of forumRows) {
    for (const f of row.forums ?? []) {
      const v = f.trim().toLowerCase();
      if (v) forumSet.add(v);
    }
  }

  const initialActors: ActorSummary[] = rows.map((r) => ({
    id: r.id,
    username: r.username,
    forums: r.forums ?? [],
    firstSeenAt: r.firstSeenAt?.toISOString() ?? null,
    lastSeenAt: r.lastSeenAt?.toISOString() ?? null,
    ipCount: Number(r.ipCount ?? 0),
  }));

  let seed =
    (actorParam
      ? initialActors.find(
          (a) => a.username.toLowerCase() === actorParam.toLowerCase(),
        )
      : null) ?? null;

  if (!seed && actorParam) {
    const [named] = await db
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
      .where(sql`lower(${actors.username}) = ${actorParam.toLowerCase()}`)
      .groupBy(
        actors.id,
        actors.username,
        actors.forums,
        actors.firstSeenAt,
        actors.lastSeenAt,
      )
      .limit(1);
    if (named) {
      seed = {
        id: named.id,
        username: named.username,
        forums: named.forums ?? [],
        firstSeenAt: named.firstSeenAt?.toISOString() ?? null,
        lastSeenAt: named.lastSeenAt?.toISOString() ?? null,
        ipCount: Number(named.ipCount ?? 0),
      };
    }
  }

  if (!seed) {
    seed = initialActors.find((a) => a.ipCount > 0) ?? null;
  }

  let initialIps: IpItem[] = [];

  if (seed) {
    const ipRows = await db
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
      .where(and(eq(actorIps.actorId, seed.id)))
      .orderBy(
        sql`case when ${actorIps.countryIso} = 'MY' then 0 else 1 end`,
        asc(actorIps.countryIso),
        asc(actorIps.ip),
      );

    initialIps = ipRows.map((r) => {
      const mapPoint = r.countryIso
        ? jitterCountryCentroidStable(r.countryIso, r.ip)
        : null;
      return {
        id: r.id,
        actorId: r.actorId,
        username: r.username,
        ip: r.ip,
        hostname: r.hostname,
        countryIso: r.countryIso,
        source: r.source,
        createdAt:
          r.createdAt instanceof Date
            ? r.createdAt.toISOString()
            : String(r.createdAt),
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
  }

  let initialDetail: IpDetailResponse | null = null;
  if (detailIp && /^[\d.a-fA-F:]+$/.test(detailIp)) {
    const dbUsers = await db
      .select({
        username: actorIps.username,
        hostname: actorIps.hostname,
        countryIso: actorIps.countryIso,
        actorId: actorIps.actorId,
      })
      .from(actorIps)
      .where(eq(actorIps.ip, detailIp));

    const token = process.env.IPINFO_TOKEN?.trim();
    let ipinfo: Record<string, unknown> | null = null;
    let ipinfoError: string | null = null;
    if (token) {
      try {
        const res = await fetch(
          `https://ipinfo.io/${encodeURIComponent(detailIp)}?token=${encodeURIComponent(token)}`,
          { signal: AbortSignal.timeout(8_000) },
        );
        if (!res.ok) ipinfoError = `ipinfo HTTP ${res.status}`;
        else ipinfo = (await res.json()) as Record<string, unknown>;
      } catch (err) {
        ipinfoError = err instanceof Error ? err.message : String(err);
      }
    } else {
      ipinfoError = "IPINFO_TOKEN not configured";
    }

    initialDetail = { ip: detailIp, dbUsers, ipinfo, ipinfoError };
  }

  return {
    initialActors,
    initialTotal: total,
    initialHasMore: initialActors.length < total,
    initialForums: [...forumSet].sort(),
    initialSelected: seed,
    initialIps,
    initialDetail,
    pageLimit: limit,
  };
}

async function PublicDataBody({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const data = await loadInitial(sp);
  return <PublicDataClient {...data} />;
}

export default function PublicDataPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <Suspense
        fallback={
          <p className="px-4 py-8 text-sm text-[var(--muted)]">
            Loading public data archive…
          </p>
        }
      >
        <PublicDataBody searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
