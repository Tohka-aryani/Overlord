import { describe, expect, it } from "vitest";
import { hostFromUrl, normalizeTorHitUrl } from "@/lib/tor/normalize-url";

describe("normalizeTorHitUrl", () => {
  it("lowercases host and strips trailing slash", () => {
    expect(normalizeTorHitUrl("HTTP://AbC.onion/Path/")).toBe(
      "http://abc.onion/Path",
    );
  });

  it("returns null for empty", () => {
    expect(normalizeTorHitUrl("  ")).toBeNull();
  });

  it("accepts bare onion host", () => {
    const v3 = "abcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopq.onion";
    expect(normalizeTorHitUrl(v3)).toBe(`http://${v3}`);
  });
});

describe("hostFromUrl", () => {
  it("extracts host", () => {
    expect(hostFromUrl("http://example.onion/x")).toBe("example.onion");
  });
});
