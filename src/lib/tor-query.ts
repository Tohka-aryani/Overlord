import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ingestRuns, torHits } from "@/db/schema";

export type TorHitRow = {
  id: number;
  url: string;
  host: string | null;
  query: string | null;
  statusCode: number | null;
  title: string | null;
  searchTitle: string | null;
  searchDescription: string | null;
  textSnippet: string | null;
  error: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  status: "up" | "down" | "unknown";
};

/** @deprecated Use TorHitRow — kept for TorClient import compatibility during rename. */
export type TorSiteRow = TorHitRow;

export type TorQueryResult = {
  items: TorHitRow[];
  total: number;
  q: string;
  status: string;
  lastIngest: {
    status: string;
    finishedAt: string | null;
    counts: unknown;
    error: string | null;
  } | null;
  stats: { up: number; down: number; unknown: number; sites: number };
};

function iso(d: Date | string | null | undefined): string | null {
  if (!d) return null;
  if (typeof d === "string") {
    const parsed = new Date(d);
    return Number.isNaN(parsed.getTime()) ? d : parsed.toISOString();
  }
  return d.toISOString();
}

function rowStatus(ok: number | null, statusCode: number | null): TorHitRow["status"] {
  if (ok === 1) return "up";
  if (ok === 0 && statusCode != null) return "down";
  if (ok === 0) return "down";
  return "unknown";
}

export async function queryTorSites(opts?: {
  q?: string;
  status?: string;
  limit?: number;
}): Promise<TorQueryResult> {
  const q = (opts?.q ?? "").trim().slice(0, 120);
  const statusFilter = (opts?.status ?? "all").trim().toLowerCase();
  const limit = Math.min(500, Math.max(1, opts?.limit ?? 200));

  const filters = [];
  if (q) {
    const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
    filters.push(
      or(
        ilike(torHits.url, pattern),
        ilike(torHits.host, pattern),
        ilike(torHits.title, pattern),
        ilike(torHits.searchTitle, pattern),
        ilike(torHits.query, pattern),
        ilike(torHits.textSnippet, pattern),
      ),
    );
  }
  if (statusFilter === "up") {
    filters.push(eq(torHits.ok, 1));
  } else if (statusFilter === "down") {
    filters.push(eq(torHits.ok, 0));
  } else if (statusFilter === "unknown") {
    filters.push(sql`${torHits.statusCode} is null`);
  }

  const where = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select()
    .from(torHits)
    .where(where)
    .orderBy(desc(torHits.firstSeenAt), desc(torHits.id))
    .limit(limit);

  const items: TorHitRow[] = rows.map((r) => ({
    id: r.id,
    url: r.url,
    host: r.host,
    query: r.query,
    statusCode: r.statusCode,
    title: r.title,
    searchTitle: r.searchTitle,
    searchDescription: r.searchDescription,
    textSnippet: r.textSnippet,
    error: r.error,
    firstSeenAt: iso(r.firstSeenAt)!,
    lastSeenAt: iso(r.lastSeenAt)!,
    status: rowStatus(r.ok, r.statusCode),
  }));

  const [statsRow] = await db
    .select({
      sites: sql<number>`count(*)::int`,
      up: sql<number>`count(*) filter (where ${torHits.ok} = 1)::int`,
      down: sql<number>`count(*) filter (where ${torHits.ok} = 0)::int`,
      unknown: sql<number>`count(*) filter (where ${torHits.statusCode} is null)::int`,
    })
    .from(torHits);

  const [countRow] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(torHits)
    .where(where);

  const [run] = await db
    .select({
      status: ingestRuns.status,
      finishedAt: ingestRuns.finishedAt,
      counts: ingestRuns.counts,
      error: ingestRuns.error,
    })
    .from(ingestRuns)
    .where(eq(ingestRuns.source, "tor-sites"))
    .orderBy(desc(ingestRuns.startedAt))
    .limit(1);

  return {
    items,
    total: Number(countRow?.total ?? items.length),
    q,
    status: statusFilter,
    lastIngest: run
      ? {
          status: run.status,
          finishedAt: iso(run.finishedAt),
          counts: run.counts,
          error: run.error,
        }
      : null,
    stats: {
      up: Number(statsRow?.up ?? 0),
      down: Number(statsRow?.down ?? 0),
      unknown: Number(statsRow?.unknown ?? 0),
      sites: Number(statsRow?.sites ?? 0),
    },
  };
}
