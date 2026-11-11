/** Malaysia CTI Google News RSS keyword queries (plan Task 5). */
export const NEWS_KEYWORDS = [
  "ransomware Malaysia",
  "data breach Malaysia",
  "cyber attack Malaysia",
  '"Bank Negara" cyber OR hack',
  "dark web Malaysia",
  "critical infrastructure Malaysia cyber",
] as const;

export type NewsKeyword = (typeof NEWS_KEYWORDS)[number];

export type NormalizedNewsItem = {
  title: string;
  link: string;
  publishedAt: Date | null;
  source: string | null;
  keywordHit: string;
  summary: string | null;
};

/** Loose RSS item shape from rss-parser (+ optional Google News `source`). */
export type RawRssItem = {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  contentSnippet?: string;
  content?: string;
  summary?: string;
  source?: unknown;
};

export function buildGoogleNewsRssUrl(query: string): string {
  const q = encodeURIComponent(query);
  return `https://news.google.com/rss/search?q=${q}&hl=en-MY&gl=MY&ceid=MY:en`;
}

export function toPublishedAt(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractSource(raw: unknown): string | null {
  if (typeof raw === "string" && raw.trim()) return raw.trim();
  if (raw && typeof raw === "object") {
    const obj = raw as { _: unknown; "#text"?: unknown };
    if (typeof obj._ === "string" && obj._.trim()) return obj._.trim();
    if (typeof obj["#text"] === "string" && obj["#text"].trim()) {
      return obj["#text"].trim();
    }
  }
  return null;
}

export function normalizeRssItem(
  item: RawRssItem,
  keywordHit: string,
): NormalizedNewsItem | null {
  const title = typeof item.title === "string" ? item.title.trim() : "";
  const link = typeof item.link === "string" ? item.link.trim() : "";
  if (!title || !link) return null;

  const summaryRaw =
    (typeof item.contentSnippet === "string" && item.contentSnippet) ||
    (typeof item.summary === "string" && item.summary) ||
    (typeof item.content === "string" && item.content) ||
    "";
  const summary = summaryRaw ? stripHtml(summaryRaw) || null : null;

  return {
    title,
    link,
    publishedAt: toPublishedAt(item.isoDate) ?? toPublishedAt(item.pubDate),
    source: extractSource(item.source),
    keywordHit,
    summary,
  };
}
