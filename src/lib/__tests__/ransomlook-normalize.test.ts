import { describe, expect, it } from "vitest";
import {
  normalizeRansomLookPost,
  toAttackDate,
  unwrapPostsPayload,
} from "@/lib/ingest/ransomlook-normalize";

describe("ransomlook-normalize", () => {
  it("parses attack date from discovered", () => {
    expect(toAttackDate("2026-11-11 23:05:46.283433")).toBe("2026-11-11");
    expect(toAttackDate("2026-10-13T09:46:00Z")).toBe("2026-10-13");
  });

  it("normalizes a recent post", () => {
    const rec = normalizeRansomLookPost({
      post_title: "Leware Construction",
      group_name: "akira",
      discovered: "2026-11-11 23:05:46.283433",
      description: "bridge contractor",
      link: null,
    });
    expect(rec).toMatchObject({
      victim: "Leware Construction",
      group: "akira",
      attackDate: "2026-11-11",
      country: null,
      claimUrl: null,
    });
    expect(rec?.rawJson).toMatchObject({ provider: "ransomlook.io" });
  });

  it("tags MY from search enrichment", () => {
    const rec = normalizeRansomLookPost(
      {
        post_title: "Prasarana",
        group_name: "lockbit",
        discovered: "2026-11-01T12:00:00Z",
      },
      { country: "MY" },
    );
    expect(rec?.country).toBe("MY");
  });

  it("unwraps posts object or array", () => {
    expect(unwrapPostsPayload([{ post_title: "a" }])).toHaveLength(1);
    expect(
      unwrapPostsPayload({ posts: [{ post_title: "b" }, { post_title: "c" }] }),
    ).toHaveLength(2);
  });

  it("rejects incomplete posts", () => {
    expect(
      normalizeRansomLookPost({ post_title: "x", group_name: "" }),
    ).toBeNull();
  });
});
