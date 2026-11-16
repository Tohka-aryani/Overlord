export type NormalizedTelegramMessage = {
  channel: string;
  messageId: string;
  postedAt: Date | null;
  text: string;
  mediaKind: string | null;
  mediaUrl: string | null;
  postUrl: string;
};

const DEFAULT_RSS_BASE = "https://tg.i-c-a.su/rss";

export function telegramRssBase(): string {
  return (process.env.TELEGRAM_RSS_BASE ?? DEFAULT_RSS_BASE).replace(/\/$/, "");
}

export function telegramChannels(): string[] {
  const raw = process.env.TELEGRAM_CHANNELS ?? "breachdetect";
  return raw
    .split(",")
    .map((s) => s.trim().replace(/^@/, "").toLowerCase())
    .filter(Boolean);
}

export function buildTelegramRssUrl(
  channel: string,
  limit = 50,
  base = telegramRssBase(),
): string {
  const ch = channel.trim().replace(/^@/, "");
  return `${base.replace(/\/$/, "")}/${encodeURIComponent(ch)}?limit=${limit}`;
}

/** Strip tags / decode entities; keep JSON-ish leak posts readable. */
export function htmlToPlainText(input: string): string {
  let s = input;
  s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\/\s*p\s*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCharCode(Number.parseInt(h, 16)),
    );
  s = s.replace(/\n{3,}/g, "\n\n").trim();
  return s;
}

function extractMessageId(link: string, channel: string): string | null {
  const esc = channel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`t\\.me\\/${esc}\\/(\\d+)`, "i");
  const m = link.match(re);
  return m?.[1] ?? null;
}

function firstEnclosure(
  item: {
    enclosure?: { url?: string; type?: string } | { url?: string; type?: string }[];
  },
): { url: string; kind: string } | null {
  const enc = item.enclosure;
  const one = Array.isArray(enc) ? enc[0] : enc;
  const url = one?.url?.trim();
  if (!url) return null;
  const type = (one?.type ?? "").toLowerCase();
  let kind = "file";
  if (type.startsWith("image/")) kind = "photo";
  else if (type.startsWith("video/")) kind = "video";
  else if (type.startsWith("audio/")) kind = "audio";
  return { url, kind };
}

function mediaFromDescription(html: string): { url: string; kind: string } | null {
  const img = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (img?.[1]) return { url: img[1], kind: "photo" };
  return null;
}

export type RssLikeItem = {
  title?: string;
  link?: string;
  guid?: string | { _: string };
  pubDate?: string;
  isoDate?: string;
  content?: string;
  contentSnippet?: string;
  "content:encoded"?: string;
  description?: string;
  enclosure?: { url?: string; type?: string } | { url?: string; type?: string }[];
};

/**
 * Normalize one RSS item from tg.i-c-a.su (or compatible) into an archive row.
 */
export function normalizeTelegramRssItem(
  item: RssLikeItem,
  channel: string,
): NormalizedTelegramMessage | null {
  const ch = channel.trim().replace(/^@/, "").toLowerCase();
  if (!ch) return null;

  const link = (item.link ?? "").trim();
  const guidRaw =
    typeof item.guid === "string"
      ? item.guid
      : typeof item.guid === "object" && item.guid && "_" in item.guid
        ? String(item.guid._)
        : "";
  const idSource = link || guidRaw;
  const messageId = extractMessageId(idSource, ch);
  if (!messageId) return null;

  const html =
    item["content:encoded"] ||
    item.content ||
    item.description ||
    item.title ||
    "";
  const text = htmlToPlainText(String(html));
  if (!text) return null;

  let postedAt: Date | null = null;
  const when = item.isoDate || item.pubDate;
  if (when) {
    const d = new Date(when);
    if (!Number.isNaN(d.getTime())) postedAt = d;
  }

  const media =
    firstEnclosure(item) ?? mediaFromDescription(String(html));

  return {
    channel: ch,
    messageId,
    postedAt,
    text,
    mediaKind: media?.kind ?? null,
    mediaUrl: media?.url ?? null,
    postUrl: `https://t.me/${ch}/${messageId}`,
  };
}
