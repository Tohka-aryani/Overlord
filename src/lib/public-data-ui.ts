/** Pure helpers for Public Data map / actor UI (Task 9). */

export type IpCountryRow = {
  countryIso: string | null;
};

/**
 * Prefer MY when the actor has Malaysia IPs; otherwise show all.
 */
export function preferredCountryFilter(
  items: IpCountryRow[],
): "MY" | "ALL" {
  const hasMy = items.some(
    (r) => (r.countryIso ?? "").trim().toUpperCase() === "MY",
  );
  return hasMy ? "MY" : "ALL";
}

/** Distinct ISO codes present, MY first then alpha. */
export function uniqueCountries(items: IpCountryRow[]): string[] {
  const set = new Set<string>();
  for (const r of items) {
    const iso = (r.countryIso ?? "").trim().toUpperCase();
    if (iso) set.add(iso);
  }
  return [...set].sort((a, b) => {
    if (a === "MY") return -1;
    if (b === "MY") return 1;
    return a.localeCompare(b);
  });
}

/**
 * Filter IP rows by country scope. `ALL` keeps every row.
 */
export function filterByCountry<T extends IpCountryRow>(
  items: T[],
  country: string,
): T[] {
  const scope = country.trim().toUpperCase();
  if (!scope || scope === "ALL" || scope === "*") return items;
  return items.filter(
    (r) => (r.countryIso ?? "").trim().toUpperCase() === scope,
  );
}

/**
 * Leaflet empty-view fallback: bias toward Malaysia only when the active
 * filter is MY, or ALL with no plotted points and MY would be the default chip.
 * Non-MY filters must not center on Malaysia just because the actor also has MY IPs.
 */
export function mapPreferMalaysia(
  country: string,
  items: IpCountryRow[],
  mapPointCount: number,
): boolean {
  const scope = country.trim().toUpperCase();
  if (scope === "MY") return true;
  if (mapPointCount > 0) return false;
  if (scope === "ALL") return preferredCountryFilter(items) === "MY";
  return false;
}
