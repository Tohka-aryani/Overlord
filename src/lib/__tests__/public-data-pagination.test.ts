import { describe, expect, it } from "vitest";

/** Mirror actors route clamp logic for unit coverage without DB. */
function clampActorsLimit(raw: string | null): number {
  return Math.min(
    Math.max(Number.parseInt(raw ?? "100", 10) || 100, 1),
    500,
  );
}

function pageMeta(total: number, offset: number, count: number) {
  return {
    total,
    hasMore: offset + count < total,
    loaded: offset + count,
  };
}

describe("public-data actors pagination math", () => {
  it("defaults limit to 100 and clamps to 500", () => {
    expect(clampActorsLimit(null)).toBe(100);
    expect(clampActorsLimit("0")).toBe(100);
    expect(clampActorsLimit("250")).toBe(250);
    expect(clampActorsLimit("9999")).toBe(500);
  });

  it("computes hasMore from total/offset/count", () => {
    expect(pageMeta(250, 0, 100)).toEqual({
      total: 250,
      hasMore: true,
      loaded: 100,
    });
    expect(pageMeta(250, 200, 50)).toEqual({
      total: 250,
      hasMore: false,
      loaded: 250,
    });
  });
});
