import { describe, expect, it } from "vitest";
import { threatSortRank } from "@/lib/threat-rank";
import {
  hashUnit,
  jitterCountryCentroidStable,
  seededRandom,
} from "@/lib/geo/country-centroids";

describe("attention sort helpers", () => {
  it("keeps Critical ahead of Unclassified for full-archive ranking", () => {
    const rows = [
      { threatLevel: "Info" as string | null },
      { threatLevel: null },
      { threatLevel: "Critical" },
      { threatLevel: "High" },
    ];
    const sorted = [...rows].sort(
      (a, b) => threatSortRank(a.threatLevel) - threatSortRank(b.threatLevel),
    );
    expect(sorted[0].threatLevel).toBe("Critical");
    expect(sorted[sorted.length - 1].threatLevel).toBe(null);
  });
});

describe("stable jitter", () => {
  it("is deterministic per IP seed", () => {
    const a = jitterCountryCentroidStable("MY", "1.2.3.4");
    const b = jitterCountryCentroidStable("MY", "1.2.3.4");
    const c = jitterCountryCentroidStable("MY", "9.9.9.9");
    expect(a).not.toBeNull();
    expect(a!.jitterLat).toBe(b!.jitterLat);
    expect(a!.jitterLon).toBe(b!.jitterLon);
    expect(a!.jitterLat !== c!.jitterLat || a!.jitterLon !== c!.jitterLon).toBe(
      true,
    );
  });

  it("hashUnit stays in 0..1", () => {
    expect(hashUnit("x")).toBeGreaterThanOrEqual(0);
    expect(hashUnit("x")).toBeLessThan(1);
    const r = seededRandom("seed");
    const v = r();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
});
