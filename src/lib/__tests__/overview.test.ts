import { describe, expect, it } from "vitest";
import { threatSortRank } from "@/lib/threat-rank";

describe("threatSortRank", () => {
  it("ranks Critical ahead of High and unlabeled last", () => {
    expect(threatSortRank("Critical")).toBeLessThan(threatSortRank("High"));
    expect(threatSortRank("High")).toBeLessThan(threatSortRank("Medium"));
    expect(threatSortRank("Info")).toBeLessThan(threatSortRank(null));
    expect(threatSortRank(undefined)).toBe(threatSortRank(null));
  });
});
