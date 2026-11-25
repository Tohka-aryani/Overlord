import { sql } from "drizzle-orm";
import { db } from "@/db";
import type { NeedsAttentionItem } from "@/lib/overview";
import { resolveOpenableSourceUrl } from "@/lib/source-links";
import { threatSortRank } from "@/lib/threat-rank";

export type AttentionSortKey = "threat" | "signal" | "source" | "when";

export type AttentionQuery = {
  threat?: string;
  sort?: AttentionSortKey;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

type RawRow = {
  kind: "ransomware" | "news";
  id: number;
  title: string;
  detail: string;
  threat_level: string | null;
  at: string | null;
  link: string | null;
  source: string | null;
  sources: string[] | null;
};

/**
 * Full-archive Needs Attention page (ransomware ∪ news with latest classification).
 */
export async function queryAttention(
  opts: AttentionQuery = {},
): Promise<{ items: NeedsAttentionItem[]; total: number; page: number; pageSize: number }> {
  const threat = (opts.threat ?? "All").trim();
  const sort: AttentionSortKey = opts.sort ?? "threat";
  const dir = opts.dir === "desc" ? "desc" : "asc";
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(Math.max(opts.pageSize ?? 50, 1), 200);
  const offset = (page - 1) * pageSize;

  const rows = await db.execute<RawRow>(sql`
    WITH latest_class AS (
      SELECT DISTINCT ON (entity_type, entity_id)
        entity_type,
        entity_id,
        threat_level
      FROM classifications
      WHERE entity_type IN ('ransomware', 'news')
      ORDER BY entity_type, entity_id, classified_at DESC
    ),
    unioned AS (
      SELECT
        'ransomware'::text AS kind,
        v.id,
        v.victim AS title,
        v."group" AS detail,
        lc.threat_level,
        COALESCE(v.attack_date::text, v.discovered_at::text) AS at,
        v.claim_url AS link,
        v.source,
        v.sources
      FROM ransomware_victims v
      LEFT JOIN latest_class lc
        ON lc.entity_type = 'ransomware' AND lc.entity_id = v.id
      UNION ALL
      SELECT
        'news'::text AS kind,
        n.id,
        n.title,
        COALESCE(n.keyword_hit, n.source, 'News') AS detail,
        lc.threat_level,
        COALESCE(n.published_at::text, n.created_at::text) AS at,
        n.link AS link,
        COALESCE(n.source, 'news') AS source,
        NULL::text[] AS sources
      FROM news_items n
      LEFT JOIN latest_class lc
        ON lc.entity_type = 'news' AND lc.entity_id = n.id
    )
    SELECT kind, id, title, detail, threat_level, at, link, source, sources
    FROM unioned
    ${
      threat && threat !== "All"
        ? threat === "Unclassified"
          ? sql`WHERE threat_level IS NULL`
          : sql`WHERE threat_level = ${threat}`
        : sql``
    }
  `);

  const rawList = Array.isArray(rows)
    ? rows
    : ((rows as { rows?: RawRow[] }).rows ?? []);

  const all: NeedsAttentionItem[] = rawList.map((r) => {
    if (r.kind === "news") {
      const external = (r.link ?? "").trim();
      const isHttp =
        external.startsWith("http://") || external.startsWith("https://");
      return {
        key: `${r.kind}:${r.id}`,
        kind: r.kind,
        title: r.title,
        detail: r.detail,
        threatLevel: r.threat_level,
        at: r.at,
        href: isHttp ? external : "/news",
        external: isHttp,
      };
    }

    const openable = resolveOpenableSourceUrl({
      victim: r.title,
      group: r.detail,
      source: r.source ?? "ransomware.live",
      sources: r.sources,
      claimUrl: r.link,
    });

    return {
      key: `${r.kind}:${r.id}`,
      kind: r.kind,
      title: r.title,
      detail: r.detail,
      threatLevel: r.threat_level,
      at: r.at,
      href:
        openable?.url ?? `/ransomware?q=${encodeURIComponent(r.title)}`,
      external: Boolean(openable),
    };
  });

  const mult = dir === "asc" ? 1 : -1;
  all.sort((a, b) => {
    if (sort === "threat") {
      const rank =
        threatSortRank(a.threatLevel) - threatSortRank(b.threatLevel);
      if (rank !== 0) return mult * rank;
      return (b.at ?? "").localeCompare(a.at ?? "");
    }
    if (sort === "signal") {
      return mult * a.title.localeCompare(b.title);
    }
    if (sort === "source") {
      return mult * a.kind.localeCompare(b.kind);
    }
    return mult * (a.at ?? "").localeCompare(b.at ?? "");
  });

  const total = all.length;
  const items = all.slice(offset, offset + pageSize);
  return { items, total, page, pageSize };
}

/** Full-archive threat distribution (latest classification per entity). */
export async function queryThreatBuckets(): Promise<
  { level: string; count: number }[]
> {
  const result = await db.execute<{ level: string; count: number }>(sql`
    WITH latest_class AS (
      SELECT DISTINCT ON (entity_type, entity_id)
        entity_type,
        entity_id,
        threat_level
      FROM classifications
      WHERE entity_type IN ('ransomware', 'news')
      ORDER BY entity_type, entity_id, classified_at DESC
    ),
    unioned AS (
      SELECT lc.threat_level
      FROM ransomware_victims v
      LEFT JOIN latest_class lc
        ON lc.entity_type = 'ransomware' AND lc.entity_id = v.id
      UNION ALL
      SELECT lc.threat_level
      FROM news_items n
      LEFT JOIN latest_class lc
        ON lc.entity_type = 'news' AND lc.entity_id = n.id
    )
    SELECT COALESCE(threat_level, 'Unclassified') AS level, count(*)::int AS count
    FROM unioned
    GROUP BY COALESCE(threat_level, 'Unclassified')
  `);

  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: { level: string; count: number }[] }).rows ?? []);
  return rows.map((r) => ({ level: r.level, count: Number(r.count) }));
}

/** Full-archive Critical+High count across ransomware + news. */
export async function queryHighThreatCount(): Promise<number> {
  const result = await db.execute<{ count: number }>(sql`
    WITH latest_class AS (
      SELECT DISTINCT ON (entity_type, entity_id)
        entity_type,
        entity_id,
        threat_level
      FROM classifications
      WHERE entity_type IN ('ransomware', 'news')
      ORDER BY entity_type, entity_id, classified_at DESC
    ),
    unioned AS (
      SELECT lc.threat_level
      FROM ransomware_victims v
      INNER JOIN latest_class lc
        ON lc.entity_type = 'ransomware' AND lc.entity_id = v.id
      UNION ALL
      SELECT lc.threat_level
      FROM news_items n
      INNER JOIN latest_class lc
        ON lc.entity_type = 'news' AND lc.entity_id = n.id
    )
    SELECT count(*)::int AS count
    FROM unioned
    WHERE threat_level IN ('Critical', 'High')
  `);
  const rows = Array.isArray(result)
    ? result
    : ((result as { rows?: { count: number }[] }).rows ?? []);
  return Number(rows[0]?.count ?? 0);
}
