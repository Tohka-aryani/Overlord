export type RansomwareStatItem = {
  group: string;
  country: string | null;
  sector: string | null;
  attackDate: string;
  /** ISO timestamp — preferred for timeline when window filters on discovery. */
  discoveredAt?: string | null;
  source: string;
  sources?: string[] | null;
  classification: {
    threatLevel: string;
    sector: string | null;
    malaysiaRelevance: string;
  } | null;
};

export type RansomwareStats = {
  posts: number;
  groups: number;
  myVictims: number;
  classified: number;
  highCritical: number;
  byGroup: [string, number][];
  bySector: [string, number][];
  byCountry: [string, number][];
  byThreat: [string, number][];
  byDay: [string, number][];
  bySource: [string, number][];
};

const THREAT_ORDER = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Info",
  "Unclassified",
] as const;

/** Fill calendar gaps so the column chart reads as a continuous timeline. */
export function fillDaySeries(
  byDay: [string, number][],
  windowDays: number | null,
): [string, number][] {
  const map = new Map(byDay);
  if (windowDays && windowDays > 0) {
    const out: [string, number][] = [];
    const end = new Date();
    end.setUTCHours(0, 0, 0, 0);
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setUTCDate(d.getUTCDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push([key, map.get(key) ?? 0]);
    }
    return out;
  }
  if (byDay.length === 0) return [];
  const keys = byDay.map(([k]) => k).sort();
  const start = new Date(`${keys[0]}T00:00:00Z`);
  const finish = new Date(`${keys[keys.length - 1]}T00:00:00Z`);
  const out: [string, number][] = [];
  for (let d = new Date(start); d <= finish; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    out.push([key, map.get(key) ?? 0]);
  }
  return out;
}

export function topN(
  map: Map<string, number>,
  n = 10,
): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

/** Aggregate KPI + Top-10 panels from filtered ransomware rows. */
export function aggregateRansomwareStats(
  items: RansomwareStatItem[],
): RansomwareStats {
  const byGroup = new Map<string, number>();
  const byDay = new Map<string, number>();
  const bySource = new Map<string, number>();
  const bySector = new Map<string, number>();
  const byCountry = new Map<string, number>();
  const byThreat = new Map<string, number>();
  let myCount = 0;
  let classifiedCount = 0;
  let highCriticalCount = 0;

  for (const item of items) {
    byGroup.set(item.group, (byGroup.get(item.group) ?? 0) + 1);
    const day = String(item.discoveredAt || item.attackDate)
      .slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}/.test(day)) {
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    const threat = item.classification?.threatLevel?.trim() || "Unclassified";
    byThreat.set(threat, (byThreat.get(threat) ?? 0) + 1);
    const srcs =
      item.sources && item.sources.length > 0
        ? item.sources
        : [item.source ?? "unknown"];
    for (const s of srcs) {
      bySource.set(s, (bySource.get(s) ?? 0) + 1);
    }

    const sector =
      item.classification?.sector?.trim() ||
      item.sector?.trim() ||
      "Unspecified";
    bySector.set(sector, (bySector.get(sector) ?? 0) + 1);

    const ctry = (item.country ?? "").trim() || "Unknown";
    byCountry.set(ctry, (byCountry.get(ctry) ?? 0) + 1);

    const isMy =
      (item.country ?? "").toUpperCase() === "MY" ||
      item.classification?.malaysiaRelevance === "Direct";
    if (isMy) myCount += 1;

    if (item.classification) {
      classifiedCount += 1;
      const tl = item.classification.threatLevel;
      if (tl === "Critical" || tl === "High") highCriticalCount += 1;
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
    groups: byGroup.size,
    myVictims: myCount,
    classified: classifiedCount,
    highCritical: highCriticalCount,
    byGroup: topN(byGroup, 10),
    bySector: topN(bySector, 10),
    byCountry: topN(byCountry, 10),
    byThreat: threatRows,
    byDay: [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    bySource: [...bySource.entries()].sort((a, b) => b[1] - a[1]),
  };
}

/** Distinct threat palette — avoid Critical/High and Low/Info collapsing together. */
export function threatChartColor(level: string): string {
  switch (level) {
    case "Critical":
      return "#e11d48"; // rose
    case "High":
      return "#ea580c"; // orange
    case "Medium":
      return "#ca8a04"; // amber
    case "Low":
      return "#16a34a"; // green
    case "Info":
      return "#0284c7"; // sky
    case "Unclassified":
      return "#64748b"; // slate
    default:
      return "var(--muted)";
  }
}

export function matchesThreatFilter(
  threatLevel: string | null | undefined,
  filter: string,
): boolean {
  if (!filter || filter === "All") return true;
  const level = threatLevel ?? "Unclassified";
  return level.toLowerCase() === filter.toLowerCase();
}

export function matchesSectorFilter(
  itemSector: string | null | undefined,
  classSector: string | null | undefined,
  filter: string,
): boolean {
  if (!filter) return true;
  const sector = classSector?.trim() || itemSector?.trim() || "";
  return sector.toLowerCase() === filter.toLowerCase();
}
