"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ThreatBadge } from "@/components/ThreatBadge";
import { ColumnChart } from "@/components/viz/ColumnChart";
import { DonutChart } from "@/components/viz/DonutChart";
import { HBarChart } from "@/components/viz/HBarChart";
import { ThreatInfo } from "@/components/viz/ThreatInfo";
import { formatRelativeWhen, formatWhen } from "@/lib/format-when";
import type {
  RansomwareItem,
  RansomwareQueryResult,
} from "@/lib/ransomware-query";
import { resolveOpenableSourceUrl } from "@/lib/source-links";
import type { RansomwareStats } from "@/lib/ransomware-stats";
import {
  fillDaySeries,
  threatChartColor,
} from "@/lib/ransomware-stats";
import { threatSortRank } from "@/lib/threat-rank";

type Stats = RansomwareStats;

type ApiResponse = RansomwareQueryResult;

export type RansomwareClientProps = {
  initial: RansomwareQueryResult;
};

type Scope = "MY" | "ALL";
type SourceFilter = "all" | "ransomware.live" | "ransomlook.io";
type SortKey = "date" | "victim" | "group" | "country" | "threat";

const WINDOWS = [7, 30, 90, 0] as const; // 0 = all time
const LIST_LIMIT = 5000;
const THREAT_FILTERS = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
  "Info",
  "Unclassified",
] as const;

const chipClass =
  "inline-flex h-7 cursor-pointer items-center gap-1 border border-[var(--border)] bg-[var(--surface)] px-2 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--muted)] transition-colors duration-150 hover:border-[var(--border-strong)] hover:text-[var(--text)]";

const chipActive =
  "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--text)]";

export function RansomwareClient({ initial }: RansomwareClientProps) {
  const [scope, setScope] = useState<Scope>("ALL");
  const [source, setSource] = useState<SourceFilter>("all");
  const [days, setDays] = useState<(typeof WINDOWS)[number]>(0);
  const [group, setGroup] = useState("");
  const [sector, setSector] = useState("");
  const [countryChip, setCountryChip] = useState("");
  const [threat, setThreat] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<RansomwareItem[]>(initial.items);
  const [stats, setStats] = useState<Stats | null>(initial.stats);
  const [totalMatched, setTotalMatched] = useState(initial.total ?? initial.count);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [dayFocus, setDayFocus] = useState("");
  const skipFirstFetch = useRef(true);

  useEffect(() => {
    const t = window.setTimeout(() => setQ(search.trim()), 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        country: scope,
        source,
        days: String(days),
        limit: String(LIST_LIMIT),
      });
      if (group) params.set("group", group);
      if (sector) params.set("sector", sector);
      if (countryChip) params.set("country", countryChip);
      if (threat !== "All") params.set("threat", threat);
      if (q) params.set("q", q);
      const res = await fetch(`/api/ransomware?${params}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      setItems(data.items);
      setStats(data.stats);
      setTotalMatched(data.total ?? data.count);
    } catch (e) {
      setItems([]);
      setStats(null);
      setError(e instanceof Error ? e.message : "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }, [scope, source, days, group, sector, countryChip, threat, q]);

  useEffect(() => {
    if (skipFirstFetch.current) {
      skipFirstFetch.current = false;
      return;
    }
    void load();
  }, [load]);

  useEffect(() => {
    setExpanded(null);
    setDayFocus("");
  }, [scope, source, days, group, sector, countryChip, threat, q]);

  const timelineRows = useMemo(
    () => fillDaySeries(stats?.byDay ?? [], days > 0 ? days : null),
    [stats?.byDay, days],
  );

  const sortedItems = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const pool = dayFocus
      ? items.filter((it) => {
          const d = String(it.discoveredAt || it.attackDate).slice(0, 10);
          return d === dayFocus;
        })
      : items;
    return [...pool].sort((a, b) => {
      if (sortKey === "date") {
        return (
          dir *
          String(a.attackDate).localeCompare(String(b.attackDate))
        );
      }
      if (sortKey === "victim") {
        return dir * a.victim.localeCompare(b.victim);
      }
      if (sortKey === "group") {
        return dir * a.group.localeCompare(b.group);
      }
      if (sortKey === "country") {
        return (
          dir *
          (a.country ?? "").localeCompare(b.country ?? "")
        );
      }
      return (
        dir *
        (threatSortRank(a.classification?.threatLevel) -
          threatSortRank(b.classification?.threatLevel))
      );
    });
  }, [items, sortKey, sortDir, dayFocus]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "date" || key === "threat" ? "desc" : "asc");
    }
  };

  const sortMark = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const classifiedShare =
    stats && stats.posts > 0
      ? Math.round((stats.classified / stats.posts) * 100)
      : 0;

  const activeChips = [
    scope === "MY" && !countryChip
      ? { key: "scope", label: "Malaysia" }
      : null,
    source !== "all" ? { key: "source", label: source } : null,
    group ? { key: "group", label: `Group: ${group}` } : null,
    sector ? { key: "sector", label: `Sector: ${sector}` } : null,
    countryChip ? { key: "country", label: `Country: ${countryChip}` } : null,
    threat !== "All" ? { key: "threat", label: `Threat: ${threat}` } : null,
    q ? { key: "q", label: `Search: ${q}` } : null,
  ].filter(Boolean) as { key: string; label: string }[];

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border)] px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
              Ransomware
            </h1>
            <p className="mt-0.5 max-w-2xl text-xs text-[var(--muted)] sm:text-sm">
              Dual-source leak-site archive — filters, KPIs, and ranked
              sector/country/actor bars. Claim URLs stay text-only.
            </p>
          </div>
          <p className="font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            <a
              href="https://www.ransomware.live"
              className="text-[var(--text)] hover:text-[var(--accent)]"
              target="_blank"
              rel="noreferrer"
            >
              ransomware.live
            </a>
            <span className="mx-2 text-[var(--border-strong)]">·</span>
            <a
              href="https://www.ransomlook.io/"
              className="text-[var(--text)] hover:text-[var(--accent)]"
              target="_blank"
              rel="noreferrer"
            >
              ransomlook.io
            </a>
          </p>
        </div>
      </header>

      <div
        className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3 sm:px-6 lg:px-8"
        role="group"
        aria-label="Ransomware filters"
      >
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search victims, groups…"
          aria-label="Search victims and groups"
          className="h-7 w-full max-w-xs border border-[var(--border)] bg-[var(--bg)] px-2 text-xs text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--muted)] sm:w-64"
        />

        <div
          className="inline-flex border border-[var(--border)] bg-[var(--surface)] p-0.5"
          role="group"
          aria-label="Window"
        >
          {WINDOWS.map((d) => (
            <button
              key={d === 0 ? "all" : d}
              type="button"
              onClick={() => setDays(d)}
              className={`h-6 cursor-pointer px-2 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-150 ${
                days === d
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              aria-pressed={days === d}
            >
              {d === 0 ? "All" : `${d}d`}
            </button>
          ))}
        </div>

        <div
          className="inline-flex border border-[var(--border)] bg-[var(--surface)] p-0.5"
          role="group"
          aria-label="Scope"
        >
          <button
            type="button"
            aria-pressed={scope === "ALL" && !countryChip}
            onClick={() => {
              setCountryChip("");
              setScope("ALL");
            }}
            className={`h-6 cursor-pointer px-2 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-150 ${
              scope === "ALL" && !countryChip
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Global
          </button>
          <button
            type="button"
            aria-pressed={scope === "MY" && !countryChip}
            onClick={() => {
              setCountryChip("");
              setScope("MY");
            }}
            className={`h-6 cursor-pointer px-2 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-150 ${
              scope === "MY" && !countryChip
                ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                : "text-[var(--muted)] hover:text-[var(--text)]"
            }`}
          >
            Malaysia
          </button>
        </div>

        <div
          className="inline-flex border border-[var(--border)] bg-[var(--surface)] p-0.5"
          role="group"
          aria-label="Source"
        >
          {(
            [
              ["all", "All sources"],
              ["ransomware.live", "live"],
              ["ransomlook.io", "RansomLook"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setSource(id)}
              className={`h-6 cursor-pointer px-2 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-150 ${
                source === id
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              aria-pressed={source === id}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            Threat
          </span>
          {THREAT_FILTERS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setThreat(level)}
              aria-pressed={threat === level}
              className={`${chipClass} ${threat === level ? chipActive : ""}`}
            >
              {level}
            </button>
          ))}
          <ThreatInfo />
        </div>

        {activeChips.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${chipClass} ${chipActive}`}
            onClick={() => {
              if (c.key === "scope") setScope("ALL");
              if (c.key === "source") setSource("all");
              if (c.key === "group") setGroup("");
              if (c.key === "sector") setSector("");
              if (c.key === "country") setCountryChip("");
              if (c.key === "threat") setThreat("All");
              if (c.key === "q") {
                setSearch("");
                setQ("");
              }
            }}
            aria-label={`Clear ${c.label}`}
          >
            {c.label}
            <span aria-hidden>×</span>
          </button>
        ))}

        <span className="ml-auto font-mono text-[0.65rem] tabular-nums text-[var(--muted)]">
          {loading
            ? "Loading…"
            : items.length < totalMatched
              ? `${items.length.toLocaleString()} / ${totalMatched.toLocaleString()} posts`
              : `${totalMatched.toLocaleString()} posts`}
        </span>
      </div>

      <div className="ol-scroll-pane flex min-h-0 flex-1 flex-col gap-4 overflow-auto px-4 py-4 pr-5 sm:px-6 sm:pr-7 lg:px-8 lg:pr-9">
        {error ? (
          <p className="text-sm text-[var(--threat)]">Archive error: {error}</p>
        ) : null}

        <div className="grid grid-cols-2 gap-px bg-[var(--border)] sm:grid-cols-4">
          <Kpi
            label="Victims"
            value={stats?.posts ?? 0}
            hint={days > 0 ? `${days}d window` : "All time"}
          />
          <Kpi label="Groups" value={stats?.groups ?? 0} />
          <Kpi
            label="Postings"
            value={totalMatched}
            hint={
              items.length < totalMatched
                ? `Showing ${items.length.toLocaleString()} of archive`
                : "Combined sources"
            }
          />
          <Kpi
            label="Classified"
            value={classifiedShare}
            suffix="%"
            hint={`${stats?.classified ?? 0} labeled · ${stats?.highCritical ?? 0} High+Critical`}
            accent
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ColumnChart
            title={`Victims over time · ${days}d`}
            rows={timelineRows}
            empty="No timeline yet."
            height={148}
            active={dayFocus}
            onSelect={setDayFocus}
          />
          <DonutChart
            title="Threat mix"
            rows={stats?.byThreat ?? []}
            active={threat === "All" ? "" : threat}
            onSelect={(v) => setThreat(v || "All")}
            colorFor={threatChartColor}
            empty="No threat labels yet."
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <HBarChart
            title="Top 10 · Sector"
            rows={stats?.bySector ?? []}
            active={sector}
            onSelect={setSector}
            empty="No sector labels yet."
          />
          <HBarChart
            title="Top 10 · Country"
            rows={stats?.byCountry ?? []}
            active={countryChip}
            onSelect={(v) => {
              setCountryChip(v);
              if (v) setScope("ALL");
            }}
            empty="No countries."
          />
          <HBarChart
            title="Top 10 · Threat actors"
            rows={stats?.byGroup ?? []}
            active={group}
            onSelect={setGroup}
            empty="No groups."
          />
        </div>

        {(stats?.bySource?.length ?? 0) > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <HBarChart
              title="By source"
              rows={stats?.bySource ?? []}
              empty="No sources."
            />
          </div>
        ) : null}

        <div className="border border-[var(--border)] bg-[var(--surface)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Victims · {sortedItems.length}
            </p>
            <ThreatInfo />
          </div>
          {loading && items.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--muted)]">
              Collecting leak-site posts…
            </p>
          ) : sortedItems.length === 0 ? (
            <p className="px-3 py-4 text-sm text-[var(--muted)]">
              No posts match. Widen the window, clear a filter, or run ingest.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-[var(--surface-raised)] text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    {(
                      [
                        ["date", "Date"],
                        ["victim", "Victim"],
                        ["country", "Country"],
                        ["group", "Group"],
                        ["threat", "Threat"],
                      ] as const
                    ).map(([key, label]) => (
                      <th key={key} className="px-3 py-2.5 font-medium">
                        <button
                          type="button"
                          className="cursor-pointer uppercase tracking-[0.12em] hover:text-[var(--text)]"
                          onClick={() => toggleSort(key)}
                        >
                          {label}
                          {sortMark(key)}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item, i) => {
                    const open = expanded === item.id;
                    const secondary =
                      item.classification?.sector ??
                      item.sector ??
                      (item.claimUrl
                        ? (() => {
                            try {
                              return new URL(item.claimUrl).hostname;
                            } catch {
                              return item.source;
                            }
                          })()
                        : item.source);
                    return (
                      <tr
                        key={item.id}
                        className={`border-b border-[var(--border)]/60 align-top ${
                          i % 2 === 1
                            ? "bg-[color-mix(in_oklab,var(--surface-raised)_55%,transparent)]"
                            : "bg-[var(--surface)]"
                        }`}
                      >
                        <td className="px-3 py-2.5 font-mono text-xs tabular-nums text-[var(--muted)]">
                          <button
                            type="button"
                            className="cursor-pointer text-left hover:text-[var(--text)]"
                            onClick={() => setExpanded(open ? null : item.id)}
                            aria-expanded={open}
                          >
                            {String(item.attackDate).slice(0, 10)}
                          </button>
                          <p
                            className="mt-0.5 text-[0.6rem] text-[var(--accent)]"
                            title={formatWhen(item.discoveredAt)}
                          >
                            {formatRelativeWhen(item.discoveredAt)}
                          </p>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            type="button"
                            className="cursor-pointer text-left font-medium text-[var(--text)] hover:text-[var(--accent)]"
                            onClick={() => setExpanded(open ? null : item.id)}
                          >
                            {item.victim}
                          </button>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {secondary}
                          </p>
                          {(() => {
                            const openable = resolveOpenableSourceUrl({
                              victim: item.victim,
                              group: item.group,
                              source: item.source,
                              sources: item.sources,
                              claimUrl: item.claimUrl,
                            });
                            if (openable) {
                              return (
                                <a
                                  href={openable.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-1 inline-block max-w-full truncate font-mono text-[0.65rem] text-[var(--accent)] underline-offset-2 hover:underline"
                                  title={openable.url}
                                >
                                  Open {openable.label} →
                                </a>
                              );
                            }
                            if (item.claimUrl?.trim()) {
                              return (
                                <p className="mt-1 break-all font-mono text-[0.6rem] text-[var(--muted)]">
                                  {item.claimUrl.trim()}
                                </p>
                              );
                            }
                            return null;
                          })()}
                          {open ? (
                            <div className="mt-2 max-w-xl space-y-1 text-xs text-[var(--muted)]">
                              <p>
                                <span className="uppercase tracking-wider">
                                  Uploaded ·{" "}
                                </span>
                                {formatWhen(item.discoveredAt)} (
                                {formatRelativeWhen(item.discoveredAt)})
                              </p>
                              <p>
                                <span className="uppercase tracking-wider">
                                  MY ·{" "}
                                </span>
                                {item.classification?.malaysiaRelevance ?? "—"}
                              </p>
                              <p>
                                <span className="uppercase tracking-wider">
                                  Rationale ·{" "}
                                </span>
                                {item.classification?.rationale ?? "—"}
                              </p>
                              <p className="break-all font-mono">
                                {(() => {
                                  const openable = resolveOpenableSourceUrl({
                                    victim: item.victim,
                                    group: item.group,
                                    source: item.source,
                                    sources: item.sources,
                                    claimUrl: item.claimUrl,
                                  });
                                  if (openable) {
                                    return (
                                      <>
                                        Source ({openable.label}):{" "}
                                        <a
                                          href={openable.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-[var(--accent)] underline-offset-2 hover:underline"
                                        >
                                          {openable.url}
                                        </a>
                                      </>
                                    );
                                  }
                                  return (
                                    <>
                                      Claim (onion / text only):{" "}
                                      {item.claimUrl?.trim() || "—"}
                                    </>
                                  );
                                })()}
                              </p>
                              <p className="font-mono">
                                Sources:{" "}
                                {(item.sources?.length
                                  ? item.sources
                                  : [item.source]
                                ).join(", ")}
                              </p>
                            </div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs uppercase text-[var(--muted)]">
                          <button
                            type="button"
                            className="cursor-pointer hover:text-[var(--text)]"
                            onClick={() => {
                              const c = item.country ?? "";
                              if (!c) return;
                              setCountryChip(c === countryChip ? "" : c);
                              if (c) setScope("ALL");
                            }}
                          >
                            {item.country ?? "—"}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-[var(--muted)]">
                          <button
                            type="button"
                            className="cursor-pointer hover:text-[var(--text)]"
                            onClick={() =>
                              setGroup(item.group === group ? "" : item.group)
                            }
                          >
                            {item.group}
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <ThreatBadge
                            level={item.classification?.threatLevel}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent,
  suffix = "",
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: boolean;
  suffix?: string;
}) {
  return (
    <div className="bg-[var(--bg)] px-4 py-3">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`mt-1 font-mono text-2xl font-bold tabular-nums tracking-tight ${
          accent ? "text-[var(--threat)]" : "text-[var(--text)]"
        }`}
      >
        {value.toLocaleString()}
        {suffix}
      </p>
      {hint ? (
        <p className="mt-0.5 truncate text-[0.65rem] text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
