export type NormalizedVictim = {
  victim: string;
  group: string;
  country: string | null;
  sector: string | null;
  attackDate: string;
  claimUrl: string | null;
  discoveredAt: Date | null;
  rawJson: Record<string, unknown>;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** YYYY-MM-DD from ISO timestamps or bare dates; null if unusable. */
export function toAttackDate(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const match = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (match) return match[1];
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function claimUrlText(value: unknown): string | null {
  // API sometimes returns boolean false instead of a URL string.
  return asString(value);
}

export function victimKey(
  v: Pick<NormalizedVictim, "victim" | "group" | "attackDate">,
): string {
  return `${v.victim}\0${v.group}\0${v.attackDate}`;
}

/**
 * Normalize ransomware.live victim rows (countryvictims / recentvictims / yearly).
 * Field map: post_title|victim, group_name|group, activity→sector, post_url|claim_url|url.
 */
export function normalizeCountryVictim(
  row: unknown,
): NormalizedVictim | null {
  const r = asRecord(row);
  if (!r) return null;

  const victim = asString(r.post_title) ?? asString(r.victim);
  const group = asString(r.group_name) ?? asString(r.group);
  const attackDate =
    toAttackDate(r.published) ??
    toAttackDate(r.attackdate) ??
    toAttackDate(r.discovered);
  if (!victim || !group || !attackDate) return null;

  const discoveredRaw = asString(r.discovered);
  const discoveredAt = discoveredRaw ? new Date(discoveredRaw) : null;

  const countryRaw = asString(r.country)?.toUpperCase() ?? null;
  const country =
    countryRaw && countryRaw !== "?" && countryRaw !== "NULL"
      ? countryRaw
      : null;

  const claim =
    claimUrlText(r.post_url) ??
    claimUrlText(r.claim_url) ??
    claimUrlText(r.url);

  return {
    victim,
    group,
    country,
    sector: asString(r.activity) ?? asString(r.sector),
    attackDate,
    claimUrl: claim,
    discoveredAt:
      discoveredAt && !Number.isNaN(discoveredAt.getTime())
        ? discoveredAt
        : null,
    rawJson: r,
  };
}

/**
 * Normalize countrycyberattacks row.
 * Unattributed gangs use group "unattributed" so the unique key stays valid.
 */
export function normalizeCyberattack(row: unknown): NormalizedVictim | null {
  const r = asRecord(row);
  if (!r) return null;

  const victim = asString(r.victim) ?? asString(r.title);
  const gang =
    asString(r.claim_gang) ?? asString(r.group) ?? asString(r.group_name);
  const group = gang ?? "unattributed";
  const attackDate =
    toAttackDate(r.date) ?? toAttackDate(r.added) ?? toAttackDate(r.attackdate);
  if (!victim || !attackDate) return null;

  return {
    victim,
    group,
    country: asString(r.country)?.toUpperCase() ?? null,
    sector: asString(r.sector) ?? asString(r.activity),
    attackDate,
    claimUrl: claimUrlText(r.claim_url),
    discoveredAt: null,
    rawJson: r,
  };
}
