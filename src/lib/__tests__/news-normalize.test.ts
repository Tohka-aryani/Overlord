import { describe, expect, it } from "vitest";
import {
  NEWS_KEYWORDS,
  buildGoogleNewsRssUrl,
  normalizeRssItem,
  toPublishedAt,
} from "@/lib/ingest/news-normalize";

describe("NEWS_KEYWORDS", () => {
  it("includes the Malaysia CTI keyword set from the plan", () => {
    expect(NEWS_KEYWORDS).toEqual([
      "ransomware Malaysia",
      "data breach Malaysia",
      "cyber attack Malaysia",
      '"Bank Negara" cyber OR hack',
      "dark web Malaysia",
      "critical infrastructure Malaysia cyber",
    ]);
  });
});

describe("buildGoogleNewsRssUrl", () => {
  it("builds en-MY Google News RSS search URL", () => {
    const url = buildGoogleNewsRssUrl("ransomware Malaysia");
    expect(url).toBe(
      "https://news.google.com/rss/search?q=ransomware%20Malaysia&hl=en-MY&gl=MY&ceid=MY:en",
    );
  });

  it("encodes quotes and OR operators in the query", () => {
    const url = buildGoogleNewsRssUrl('"Bank Negara" cyber OR hack');
    expect(url).toContain("q=%22Bank%20Negara%22%20cyber%20OR%20hack");
    expect(url).toContain("hl=en-MY");
    expect(url).toContain("gl=MY");
    expect(url).toContain("ceid=MY:en");
  });
});

describe("toPublishedAt", () => {
  it("parses RSS pubDate / isoDate strings", () => {
    const d = toPublishedAt("Mon, 10 Nov 2026 12:00:00 GMT");
    expect(d).toBeInstanceOf(Date);
    expect(d?.toISOString()).toBe("2026-11-10T12:00:00.000Z");
  });

  it("returns null for missing or invalid values", () => {
    expect(toPublishedAt(undefined)).toBeNull();
    expect(toPublishedAt("")).toBeNull();
    expect(toPublishedAt("not-a-date")).toBeNull();
  });
});

describe("normalizeRssItem", () => {
  it("maps title, link, publishedAt, source, summary, keywordHit", () => {
    const n = normalizeRssItem(
      {
        title: "Bank hit by ransomware - The Star",
        link: "https://news.google.com/rss/articles/CBMiabc",
        isoDate: "2026-11-10T08:30:00.000Z",
        contentSnippet: "A Malaysian bank reported a ransomware incident.",
        source: "The Star",
      },
      "ransomware Malaysia",
    );

    expect(n).toMatchObject({
      title: "Bank hit by ransomware - The Star",
      link: "https://news.google.com/rss/articles/CBMiabc",
      source: "The Star",
      keywordHit: "ransomware Malaysia",
      summary: "A Malaysian bank reported a ransomware incident.",
    });
    expect(n?.publishedAt?.toISOString()).toBe("2026-11-10T08:30:00.000Z");
  });

  it("rejects items missing title or link", () => {
    expect(
      normalizeRssItem(
        { title: "x", link: "" },
        "ransomware Malaysia",
      ),
    ).toBeNull();
    expect(
      normalizeRssItem(
        { link: "https://example.com/a" },
        "ransomware Malaysia",
      ),
    ).toBeNull();
  });

  it("falls back to pubDate and content when isoDate/snippet missing", () => {
    const n = normalizeRssItem(
      {
        title: "Breach reported",
        link: "https://example.com/breach",
        pubDate: "Mon, 10 Nov 2026 12:00:00 GMT",
        content: "<p>Details of the breach</p>",
      },
      "data breach Malaysia",
    );
    expect(n?.publishedAt?.toISOString()).toBe("2026-11-10T12:00:00.000Z");
    expect(n?.summary).toBe("Details of the breach");
    expect(n?.source).toBeNull();
  });
});
