import path from "node:path";

/** Default Threat-Actor username lists for a practical demo subset. */
export const DEFAULT_USERNAME_FILES = [
  "forum_users_darkforums.txt",
  "forum_users_hackforums.txt",
  "forum_users_cracked.txt",
  "forum_users_xss.txt",
  "forum_users_breached2026.txt",
] as const;

export type NormalizedActorUsername = {
  username: string;
  forum: string;
};

export type NormalizedActorIp = {
  username: string;
  ip: string;
  hostname: string | null;
  countryIso: string | null;
  source: string;
};

/** `forum_users_darkforums.txt` → `darkforums` */
export function forumTagFromFilename(filename: string): string {
  const base = path.basename(filename).toLowerCase();
  const m = /^forum_users_(.+)\.txt$/.exec(base);
  if (m?.[1]) return m[1];
  return base.replace(/\.[^.]+$/, "") || "unknown";
}

/**
 * Threat-Actor lists use `# ` comments; usernames may start with `#`
 * (e.g. `#AfterDark` on HackForums).
 */
export function parseUsernameLine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("# ")) return null;
  if (trimmed === "#") return null;
  return trimmed;
}

export function parseUsernameFileContent(
  content: string,
  forum: string,
  limit?: number,
): NormalizedActorUsername[] {
  const out: NormalizedActorUsername[] = [];
  const seen = new Set<string>();
  for (const raw of content.split(/\r?\n/)) {
    if (limit !== undefined && out.length >= limit) break;
    const username = parseUsernameLine(raw);
    if (!username) continue;
    const key = username.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ username, forum });
  }
  return out;
}

function looksLikeIp(value: string): boolean {
  // IPv4 or rough IPv6 — enough to reject empty / error placeholders
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(value)) return true;
  if (value.includes(":") && /^[0-9a-fA-F:]+$/.test(value)) return true;
  return false;
}

export function normalizeDarkforumsIpRow(
  row: unknown,
  source = "darkforums-ip-intel",
): NormalizedActorIp | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const username = typeof r.username === "string" ? r.username.trim() : "";
  const ip = typeof r.ip === "string" ? r.ip.trim() : "";
  if (!username || !ip || !looksLikeIp(ip)) return null;
  const hostname =
    typeof r.hostname === "string" && r.hostname.trim()
      ? r.hostname.trim()
      : null;
  const countryRaw =
    typeof r.country_iso === "string"
      ? r.country_iso
      : typeof r.countryIso === "string"
        ? r.countryIso
        : typeof r.country === "string"
          ? r.country
          : null;
  const countryIso = countryRaw ? countryRaw.trim().toUpperCase() || null : null;
  return { username, ip, hostname, countryIso, source };
}

/** darkforums.json is `{ "postId": { username, ip, hostname }, ... }`. */
export function parseDarkforumsJsonObject(
  data: unknown,
  limit?: number,
  source = "darkforums-ip-intel",
): NormalizedActorIp[] {
  if (!data || typeof data !== "object") return [];
  const out: NormalizedActorIp[] = [];
  const seen = new Set<string>();
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (limit !== undefined && out.length >= limit) break;
    const n = normalizeDarkforumsIpRow(value, source);
    if (!n) continue;
    const key = `${n.ip}\0${n.username.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(n);
  }
  return out;
}

export function mergeForumTags(
  existing: string[] | null | undefined,
  next: string,
): string[] {
  const set = new Set(
    (existing ?? []).map((f) => f.trim().toLowerCase()).filter(Boolean),
  );
  const tag = next.trim().toLowerCase();
  if (tag) set.add(tag);
  return [...set].sort();
}
