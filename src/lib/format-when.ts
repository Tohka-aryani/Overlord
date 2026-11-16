/** Display helper for attack dates and archive timestamps. */
export function formatWhen(iso: string | Date | null | undefined): string {
  if (iso == null) return "—";
  const raw = typeof iso === "string" ? iso : iso.toISOString();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

/** Relative upload/discovery time: "5 mins ago", "3h ago", "2d ago". */
export function formatRelativeWhen(
  iso: string | Date | null | undefined,
  now: Date = new Date(),
): string {
  if (iso == null) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  const diffSec = Math.round((now.getTime() - d.getTime()) / 1000);
  if (diffSec < 0) return "just now";
  if (diffSec < 60) return "just now";
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 14) return `${days}d ago`;
  return formatWhen(d);
}

/** Clearnet http(s) URLs are safe to open; onion / empty stay text-only. */
export function isOpenableClaimUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (u.hostname.endsWith(".onion")) return false;
    return true;
  } catch {
    return false;
  }
}
