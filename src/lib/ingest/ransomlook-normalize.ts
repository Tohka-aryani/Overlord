import { inferCountryFromText } from "@/lib/geo/infer-country";

export type RansomLookPost = {
  post_title?: string;
  group_name?: string;
  discovered?: string;
  description?: string | null;
  link?: string | null;
  magnet?: string | null;
  screen?: string | null;
  private?: boolean;
  misp_uuid?: string | null;
};

const RANSOMLOOK_ORIGIN = "https://www.ransomlook.io";

function absoluteClaimUrl(link: string | null | undefined): string | null {
  if (!link?.trim()) return null;
  const raw = link.trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (raw.startsWith("/")) return `${RANSOMLOOK_ORIGIN}${raw}`;
  return raw;
}

export type NormalizedRansomLookVictim = {
  victim: string;
  group: string;
  country: string | null;
  sector: string | null;
  attackDate: string;
  claimUrl: string | null;
  discoveredAt: Date | null;
  description: string | null;
  rawJson: Record<string, unknown>;
};

/** YYYY-MM-DD from RansomLook discovered timestamps. */
export function toAttackDate(discovered: string | null | undefined): string | null {
  if (!discovered?.trim()) return null;
  const raw = discovered.trim();
  const isoDay = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoDay) return isoDay[1];
  const d = new Date(raw.includes("T") || raw.includes("Z") ? raw : raw.replace(" ", "T") + "Z");
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export function parseDiscoveredAt(
  discovered: string | null | undefined,
): Date | null {
  if (!discovered?.trim()) return null;
  const raw = discovered.trim();
  const d = new Date(
    raw.includes("T") || /Z|[+-]\d{2}:?\d{2}$/.test(raw)
      ? raw
      : raw.replace(" ", "T") + "Z",
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Map a RansomLook recent/posts/search item into archive shape.
 * Country is usually absent — leave null for LLM / search enrichment.
 */
export function normalizeRansomLookPost(
  post: RansomLookPost,
  opts?: { country?: string | null },
): NormalizedRansomLookVictim | null {
  const victim = (post.post_title ?? "").trim();
  const group = (post.group_name ?? "").trim();
  const attackDate = toAttackDate(post.discovered);
  if (!victim || !group || !attackDate) return null;

  const description =
    typeof post.description === "string" && post.description.trim()
      ? post.description.trim()
      : null;

  const country =
    opts?.country?.trim().toUpperCase() ||
    inferCountryFromText(victim, description) ||
    null;

  return {
    victim,
    group,
    country,
    sector: null,
    attackDate,
    claimUrl: absoluteClaimUrl(
      typeof post.link === "string" ? post.link : null,
    ),
    discoveredAt: parseDiscoveredAt(post.discovered),
    description,
    rawJson: {
      provider: "ransomlook.io",
      ...post,
    },
  };
}

export function unwrapPostsPayload(data: unknown): RansomLookPost[] {
  if (Array.isArray(data)) return data as RansomLookPost[];
  if (data && typeof data === "object" && Array.isArray((data as { posts?: unknown }).posts)) {
    return (data as { posts: RansomLookPost[] }).posts;
  }
  return [];
}
