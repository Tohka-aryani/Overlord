import { describe, expect, it } from "vitest";
import {
  isUnreliableRansomLookClaimUrl,
  ransomLookGroupUrl,
  ransomwareLiveVictimUrl,
  resolveOpenableSourceUrl,
} from "@/lib/source-links";

describe("source-links", () => {
  it("builds ransomware.live id without padding", () => {
    expect(ransomwareLiveVictimUrl("Port of Tanjung Pelepas", "direwolf")).toBe(
      "https://www.ransomware.live/id/UG9ydCBvZiBUYW5qdW5nIFBlbGVwYXNAZGlyZXdvbGY",
    );
  });

  it("builds ransomlook group url", () => {
    expect(ransomLookGroupUrl("qilin")).toBe(
      "https://www.ransomlook.io/group/qilin",
    );
  });

  it("flags flaky ransomlook claim paths", () => {
    expect(
      isUnreliableRansomLookClaimUrl(
        "https://www.ransomlook.io/post/abc123",
      ),
    ).toBe(true);
    expect(
      isUnreliableRansomLookClaimUrl("https://www.ransomlook.io/group/qilin"),
    ).toBe(false);
  });

  it("prefers ransomware.live id when source includes live", () => {
    const r = resolveOpenableSourceUrl({
      victim: "ock.com.my",
      group: "lockbit5",
      source: "ransomware.live",
      sources: ["ransomware.live", "ransomlook.io"],
      claimUrl: "https://www.ransomlook.io/post/dead",
    });
    expect(r?.label).toBe("ransomware.live");
    expect(r?.url).toContain("ransomware.live/id/");
  });

  it("uses ransomlook group for ransomlook-only rows", () => {
    const r = resolveOpenableSourceUrl({
      victim: "Quetico LLC",
      group: "aurora",
      source: "ransomlook.io",
      sources: ["ransomlook.io"],
      claimUrl: "https://www.ransomlook.io/blog/quetico-llc-4de8651c",
    });
    expect(r).toEqual({
      url: "https://www.ransomlook.io/group/aurora",
      label: "ransomlook.io",
    });
  });
});
