"use client";

import dynamic from "next/dynamic";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ActorMapPoint } from "@/components/map/ActorMap";
import {
  filterByCountry,
  preferredCountryFilter,
  uniqueCountries,
} from "@/lib/public-data-ui";
import { formatWhen } from "@/lib/format-when";

const ActorMap = dynamic(() => import("@/components/map/ActorMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[16rem] items-center justify-center bg-[var(--surface)] text-sm text-[var(--muted)]">
      Loading map…
    </div>
  ),
});

type ActorSummary = {
  id: number;
  username: string;
  forums: string[];
  firstSeenAt: string | null;
  lastSeenAt: string | null;
  ipCount: number;
};

type IpItem = {
  id: number;
  actorId: number;
  username: string;
  ip: string;
  hostname: string | null;
  countryIso: string | null;
  source: string | null;
  createdAt: string;
  map: {
    iso: string;
    lat: number;
    lon: number;
    centroidLat: number;
    centroidLon: number;
  } | null;
};

type IpsResponse = {
  actor: { id: number; username: string; forums: string[] };
  country: string | null;
  count: number;
  items: IpItem[];
};

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--muted)]";

const selectClass =
  "border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 font-mono text-xs uppercase tracking-wider text-[var(--text)] outline-none focus:border-[var(--muted)]";

export default function PublicDataPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ActorSummary[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [browseActors, setBrowseActors] = useState<ActorSummary[]>([]);
  const [selected, setSelected] = useState<ActorSummary | null>(null);
  const [ips, setIps] = useState<IpItem[]>([]);
  const [ipsLoading, setIpsLoading] = useState(false);
  const [ipsError, setIpsError] = useState<string | null>(null);
  const [country, setCountry] = useState<"ALL" | string>("ALL");
  const searchWrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Browse list for empty state / quick pick
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/public-data/actors?limit=40", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { items: ActorSummary[] };
        if (!cancelled) setBrowseActors(data.items);
      } catch {
        /* browse is optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Autocomplete
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 1) {
      setSuggestions([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(
            `/api/public-data/search?q=${encodeURIComponent(q)}&limit=15`,
            { cache: "no-store" },
          );
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const data = (await res.json()) as { items: ActorSummary[] };
          setSuggestions(data.items);
          setSearchOpen(true);
        } catch {
          setSuggestions([]);
        } finally {
          setSearchLoading(false);
        }
      })();
    }, 220);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const loadIps = useCallback(async (actor: ActorSummary) => {
    setIpsLoading(true);
    setIpsError(null);
    try {
      const res = await fetch(
        `/api/public-data/ips?actorId=${actor.id}&map=1`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as IpsResponse;
      setIps(data.items);
      setSelected({
        id: data.actor.id,
        username: data.actor.username,
        forums: data.actor.forums,
        firstSeenAt: actor.firstSeenAt,
        lastSeenAt: actor.lastSeenAt,
        ipCount: data.count,
      });
      setCountry(preferredCountryFilter(data.items));
    } catch (e) {
      setIps([]);
      setIpsError(e instanceof Error ? e.message : "Failed to load IPs");
    } finally {
      setIpsLoading(false);
    }
  }, []);

  const selectActor = useCallback(
    (actor: ActorSummary) => {
      setQuery(actor.username);
      setSearchOpen(false);
      void loadIps(actor);
    },
    [loadIps],
  );

  const countries = useMemo(() => uniqueCountries(ips), [ips]);

  const filteredIps = useMemo(
    () => filterByCountry(ips, country),
    [ips, country],
  );

  const mapPoints: ActorMapPoint[] = useMemo(() => {
    return filteredIps
      .filter((r) => r.map != null)
      .map((r) => ({
        id: r.id,
        ip: r.ip,
        hostname: r.hostname,
        countryIso: r.countryIso,
        lat: r.map!.lat,
        lon: r.map!.lon,
      }));
  }, [filteredIps]);

  const preferMalaysia =
    country === "MY" ||
    countries.includes("MY") ||
    preferredCountryFilter(ips) === "MY";

  const clearSelection = () => {
    setSelected(null);
    setIps([]);
    setIpsError(null);
    setCountry("ALL");
    setQuery("");
  };

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--border)] px-8 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Public Data</h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
          Actor search and dark basemap — Malaysia-first when ISO data exists.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Stage: search, map, IP list */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-end gap-6 border-b border-[var(--border)] px-8 py-4">
            <div ref={searchWrapRef} className="relative min-w-[14rem] flex-1 max-w-md">
              <label className="block">
                <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Actor
                </span>
                <input
                  type="search"
                  role="combobox"
                  aria-expanded={searchOpen && suggestions.length > 0}
                  aria-controls="actor-search-list"
                  aria-autocomplete="list"
                  className={`mt-1.5 ${inputClass}`}
                  placeholder="Search username…"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    if (suggestions.length > 0) setSearchOpen(true);
                  }}
                  autoComplete="off"
                />
              </label>
              {searchOpen && (suggestions.length > 0 || searchLoading) && (
                <ul
                  id="actor-search-list"
                  role="listbox"
                  className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto border border-[var(--border)] bg-[var(--surface)]"
                >
                  {searchLoading && suggestions.length === 0 && (
                    <li className="px-3 py-2 text-sm text-[var(--muted)]">
                      Searching…
                    </li>
                  )}
                  {suggestions.map((a) => (
                    <li key={a.id} role="option" aria-selected={selected?.id === a.id}>
                      <button
                        type="button"
                        className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[var(--surface-raised)]"
                        onClick={() => selectActor(a)}
                      >
                        <span className="font-medium text-[var(--text)]">
                          {a.username}
                        </span>
                        <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--muted)]">
                          {a.ipCount} IP
                          {a.ipCount === 1 ? "" : "s"}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="block">
              <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                Country
              </span>
              <select
                className={`mt-1.5 block ${selectClass}`}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                aria-label="Country filter"
                disabled={!selected && countries.length === 0}
              >
                <option value="ALL">All</option>
                {(countries.includes("MY") || country === "MY") && (
                  <option value="MY">MY</option>
                )}
                {countries
                  .filter((c) => c !== "MY")
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
            </label>
          </div>

          <div className="relative min-h-[18rem] flex-1 border-b border-[var(--border)] lg:min-h-0">
            <ActorMap
              points={mapPoints}
              preferMalaysia={preferMalaysia}
              className="absolute inset-0 h-full w-full"
            />
            {!selected && (
              <p className="pointer-events-none absolute inset-x-0 top-4 z-[400] px-8 text-sm text-[var(--muted)]">
                Select an actor to plot IPs
              </p>
            )}
            {selected && ipsLoading && (
              <p className="pointer-events-none absolute inset-x-0 top-4 z-[400] px-8 text-sm text-[var(--muted)]">
                Loading IPs…
              </p>
            )}
          </div>

          <div className="max-h-56 overflow-y-auto px-8 py-3 lg:max-h-64">
            {ipsError && (
              <p className="text-sm text-[var(--threat)]">{ipsError}</p>
            )}
            {!selected && !ipsError && (
              <p className="text-sm text-[var(--muted)]">
                IP list appears after an actor is selected.
              </p>
            )}
            {selected && !ipsLoading && filteredIps.length === 0 && !ipsError && (
              <p className="text-sm text-[var(--muted)]">
                No IPs for this country filter.
              </p>
            )}
            {filteredIps.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                    <th className="pb-2 font-normal">IP</th>
                    <th className="pb-2 font-normal">Country</th>
                    <th className="hidden pb-2 font-normal sm:table-cell">
                      Hostname
                    </th>
                    <th className="hidden pb-2 font-normal md:table-cell">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredIps.map((row) => {
                    const my = (row.countryIso ?? "").toUpperCase() === "MY";
                    return (
                      <tr
                        key={row.id}
                        className="border-t border-[var(--border)]/60"
                      >
                        <td className="py-1.5 font-mono text-xs tabular-nums text-[var(--text)]">
                          {row.ip}
                        </td>
                        <td
                          className={`py-1.5 font-mono text-xs ${
                            my
                              ? "text-[var(--threat)]"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          {row.countryIso ?? "—"}
                        </td>
                        <td className="hidden max-w-[12rem] truncate py-1.5 text-[var(--muted)] sm:table-cell">
                          {row.hostname ?? "—"}
                        </td>
                        <td className="hidden py-1.5 font-mono text-xs text-[var(--muted)] md:table-cell">
                          {row.source ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Side panel: actor detail / browse */}
        <aside className="flex w-full shrink-0 flex-col border-t border-[var(--border)] bg-[var(--surface)] lg:w-80 lg:border-l lg:border-t-0">
          {selected ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <header className="flex items-start justify-between gap-3 border-b border-[var(--border)] px-5 py-4">
                <div>
                  <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                    Actor
                  </p>
                  <h2 className="mt-1 text-base font-medium tracking-tight text-[var(--text)]">
                    {selected.username}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={clearSelection}
                  className="shrink-0 font-mono text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)]"
                >
                  Clear
                </button>
              </header>
              <dl className="flex-1 overflow-y-auto px-5 py-2">
                <DetailRow label="IP count">
                  <span className="font-mono text-xs tabular-nums">
                    {selected.ipCount}
                    {country !== "ALL" &&
                      ` · ${filteredIps.length} shown (${country})`}
                  </span>
                </DetailRow>
                <DetailRow label="Forums">
                  {selected.forums?.length ? (
                    <ul className="space-y-1">
                      {selected.forums.map((f) => (
                        <li key={f} className="font-mono text-xs text-[var(--text)]">
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "—"
                  )}
                </DetailRow>
                <DetailRow label="First seen" mono>
                  {formatWhen(selected.firstSeenAt)}
                </DetailRow>
                <DetailRow label="Last seen" mono>
                  {formatWhen(selected.lastSeenAt)}
                </DetailRow>
                <DetailRow label="Mapped points" mono>
                  {String(mapPoints.length)}
                </DetailRow>
              </dl>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <header className="border-b border-[var(--border)] px-5 py-4">
                <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                  Actors
                </p>
                <h2 className="mt-1 text-base font-medium tracking-tight">
                  Top by IP count
                </h2>
              </header>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {browseActors.length === 0 && (
                  <li className="px-5 py-4 text-sm text-[var(--muted)]">
                    No actors in archive yet. Run public-data import.
                  </li>
                )}
                {browseActors.map((a) => (
                  <li key={a.id} className="border-b border-[var(--border)]/50">
                    <button
                      type="button"
                      className="flex w-full items-baseline justify-between gap-3 px-5 py-3 text-left hover:bg-[var(--surface-raised)]"
                      onClick={() => selectActor(a)}
                    >
                      <span className="truncate text-sm text-[var(--text)]">
                        {a.username}
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums text-[var(--muted)]">
                        {a.ipCount}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}

function DetailRow({
  label,
  children,
  mono,
}: {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <>
      <dt className="border-b border-transparent pt-3 text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1 border-b border-[var(--border)]/70 pb-3 break-words text-sm text-[var(--text)] ${
          mono ? "font-mono text-xs tabular-nums" : ""
        }`}
      >
        {children}
      </dd>
    </>
  );
}
