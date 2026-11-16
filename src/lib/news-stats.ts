import { fillDaySeries } from "@/lib/ransomware-stats";

export type NewsStatItem = {
  publishedAt: string | null;
  createdAt: string;
  source: string | null;
  classification: {
    threatLevel: string;
    category: string;
  } | null;
};

export type NewsStats = {
  posts: number;
  classified: number;
  byThreat: [string, number][];
  byCategory: [string, number][];
  bySource: [string, number][];
  byDay: [string, number][];
};

const THREAT_ORDER = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Info",
  "Unclassified",
] as const;

function topN(map: Map<string, number>, n = 10): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Aggregate News archive for charts. */
export function aggregateNewsStats(items: NewsStatItem[]): NewsStats {
  const byThreat = new Map<string, number>();
  const byCategory = new Map<string, number>();
  const bySource = new Map<string, number>();
  const byDay = new Map<string, number>();
  let classified = 0;

  for (const item of items) {
    const threat = item.classification?.threatLevel?.trim() || "Unclassified";
    byThreat.set(threat, (byThreat.get(threat) ?? 0) + 1);

    const category = item.classification?.category?.trim() || "Unclassified";
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);

    const source = (item.source ?? "").trim() || "Unknown";
    bySource.set(source, (bySource.get(source) ?? 0) + 1);

    if (item.classification) classified += 1;

    const day = String(item.publishedAt || item.createdAt).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(day)) {
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
  }

  const threatRows: [string, number][] = THREAT_ORDER.filter((level) =>
    byThreat.has(level),
  ).map((level) => [level, byThreat.get(level) ?? 0]);
  for (const [level, n] of byThreat) {
    if (!THREAT_ORDER.includes(level as (typeof THREAT_ORDER)[number])) {
      threatRows.push([level, n]);
    }
  }

  return {
    posts: items.length,
    classified,
    byThreat: threatRows,
    byCategory: topN(byCategory, 10),
    bySource: topN(bySource, 8),
    byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  };
}

export function newsTimeline(byDay: [string, number][], windowDays = 30) {
  return fillDaySeries(byDay, windowDays);
}
