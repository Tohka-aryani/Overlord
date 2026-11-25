/** Normalize scrape URLs for unique-index dedupe. */

export function normalizeTorHitUrl(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;

  let candidate = text;
  if (!/^https?:\/\//i.test(candidate) && /\.onion(\/|$)/i.test(candidate)) {
    candidate = `http://${candidate.replace(/^\/+/, "")}`;
  }

  try {
    const u = new URL(candidate);
    const protocol = u.protocol.toLowerCase();
    if (protocol !== "http:" && protocol !== "https:") return null;
    const host = u.hostname.toLowerCase();
    if (!host) return null;
    const path =
      u.pathname === "/" ? "" : u.pathname.replace(/\/+$/, "") || "";
    const search = u.search;
    return `${protocol}//${host}${path}${search}`;
  } catch {
    return null;
  }
}

export function hostFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase() || null;
  } catch {
    return null;
  }
}
