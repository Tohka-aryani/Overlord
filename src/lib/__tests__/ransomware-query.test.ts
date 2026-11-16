import { describe, expect, it } from "vitest";
import { aggregateRansomwareStats } from "@/lib/ransomware-stats";

describe("ransomware query SSR seed shape", () => {
  it("aggregates MY window stats for client seed", () => {
    const stats = aggregateRansomwareStats([
      {
        group: "lockbit",
        country: "MY",
        sector: "Healthcare",
        attackDate: "2024-01-01",
        source: "ransomware.live",
        classification: {
          threatLevel: "High",
          sector: "Healthcare",
          malaysiaRelevance: "Direct",
        },
      },
      {
        group: "lockbit",
        country: "MY",
        sector: null,
        attackDate: "2024-01-02",
        source: "ransomlook.io",
        classification: null,
      },
    ]);
    expect(stats.posts).toBe(2);
    expect(stats.classified).toBe(1);
    expect(stats.myVictims).toBe(2);
    expect(stats.bySector[0]?.[0]).toBe("Healthcare");
  });
});
