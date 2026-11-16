import { describe, expect, it } from "vitest";
import {
  aggregateRansomwareStats,
  fillDaySeries,
  matchesSectorFilter,
  matchesThreatFilter,
  topN,
} from "@/lib/ransomware-stats";
import { threatSortRank } from "@/lib/threat-rank";

describe("matchesThreatFilter", () => {
  it("passes All and matches Unclassified for null", () => {
    expect(matchesThreatFilter(null, "All")).toBe(true);
    expect(matchesThreatFilter(null, "Unclassified")).toBe(true);
    expect(matchesThreatFilter("High", "High")).toBe(true);
    expect(matchesThreatFilter("High", "Low")).toBe(false);
  });
});

describe("matchesSectorFilter", () => {
  it("prefers classification sector", () => {
    expect(matchesSectorFilter("Retail", "Finance", "Finance")).toBe(true);
    expect(matchesSectorFilter("Retail", null, "Retail")).toBe(true);
    expect(matchesSectorFilter(null, null, "Finance")).toBe(false);
  });
});

describe("aggregateRansomwareStats", () => {
  it("builds top-10 sector/country/group and classified KPIs", () => {
    const stats = aggregateRansomwareStats([
      {
        group: "lockbit",
        country: "MY",
        sector: null,
        attackDate: "2026-01-02",
        source: "ransomware.live",
        sources: ["ransomware.live"],
        classification: {
          threatLevel: "High",
          sector: "Finance",
          malaysiaRelevance: "Direct",
        },
      },
      {
        group: "lockbit",
        country: "US",
        sector: "Healthcare",
        attackDate: "2026-01-01",
        source: "ransomlook.io",
        sources: ["ransomlook.io"],
        classification: null,
      },
      {
        group: "akira",
        country: "MY",
        sector: null,
        attackDate: "2026-01-02",
        source: "ransomware.live",
        classification: {
          threatLevel: "Critical",
          sector: "Finance",
          malaysiaRelevance: "Direct",
        },
      },
    ]);

    expect(stats.posts).toBe(3);
    expect(stats.groups).toBe(2);
    expect(stats.myVictims).toBe(2);
    expect(stats.classified).toBe(2);
    expect(stats.highCritical).toBe(2);
    expect(stats.bySector[0]).toEqual(["Finance", 2]);
    expect(stats.byCountry.find(([c]) => c === "MY")?.[1]).toBe(2);
    expect(stats.byGroup[0]).toEqual(["lockbit", 2]);
    expect(stats.byThreat.find(([t]) => t === "High")?.[1]).toBe(1);
    expect(stats.byThreat.find(([t]) => t === "Critical")?.[1]).toBe(1);
    expect(stats.byThreat.find(([t]) => t === "Unclassified")?.[1]).toBe(1);
  });

  it("fills calendar gaps for timeline charts", () => {
    const filled = fillDaySeries(
      [
        ["2026-01-01", 2],
        ["2026-01-03", 1],
      ],
      null,
    );
    expect(filled).toEqual([
      ["2026-01-01", 2],
      ["2026-01-02", 0],
      ["2026-01-03", 1],
    ]);
    expect(fillDaySeries([["2026-01-01", 1]], 3)).toHaveLength(3);
  });
});

describe("topN + threat sort for Needs Attention", () => {
  it("orders Critical before Unclassified", () => {
    const levels = ["Info", "Critical", null, "High"];
    const sorted = [...levels].sort(
      (a, b) => threatSortRank(a) - threatSortRank(b),
    );
    expect(sorted[0]).toBe("Critical");
    expect(sorted[sorted.length - 1]).toBe(null);
  });

  it("slices top N", () => {
    const map = new Map([
      ["a", 1],
      ["b", 5],
      ["c", 3],
    ]);
    expect(topN(map, 2)).toEqual([
      ["b", 5],
      ["c", 3],
    ]);
  });
});
