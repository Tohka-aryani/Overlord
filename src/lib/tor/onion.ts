/** Extract and normalize .onion claim hosts from archive URLs. */

const ONION_HOST_RE = /^[a-z2-7]{16,56}\.onion$/i;

export function isOnionHostname(host: string): boolean {
  return ONION_HOST_RE.test(host.trim());
}

/**
 * Parse a claim URL / raw onion string into host + absolute sample URL.
 * Returns null when the value is not a .onion target.
 */
export function parseOnionClaim(
  raw: string | null | undefined,
): { host: string; sampleUrl: string } | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  let candidate = text;
  if (!/^https?:\/\//i.test(candidate) && /\.onion(\/|$)/i.test(candidate)) {
    candidate = `http://${candidate.replace(/^\/+/, "")}`;
  }

  try {
    const u = new URL(candidate);
    const host = u.hostname.toLowerCase();
    if (!isOnionHostname(host)) return null;
    const path = u.pathname && u.pathname !== "/" ? u.pathname : "";
    const sampleUrl = `http://${host}${path}${u.search}`;
    return { host, sampleUrl };
  } catch {
    return null;
  }
}

/** Strip tags and collapse whitespace for a page <title>. */
export function extractHtmlTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return null;
  const title = m[1]
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return title ? title.slice(0, 240) : null;
}
