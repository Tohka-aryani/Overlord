"use client";

import type { RefObject } from "react";
import type { ActorSummary } from "@/components/public-data/types";

type SearchBarProps = {
  query: string;
  onQueryChange: (v: string) => void;
  forum: string;
  forums: string[];
  onForumChange: (v: string) => void;
  country: string;
  countries: string[];
  onCountryChange: (v: string) => void;
  suggestions: ActorSummary[];
  searchOpen: boolean;
  searchLoading: boolean;
  searchTotal: number;
  searchWrapRef: RefObject<HTMLDivElement | null>;
  onSelectActor: (actor: ActorSummary) => void;
  onReset: () => void;
  loaded: number;
  totalActors: number;
};

const inputClass =
  "w-full border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--muted)]";

const selectClass =
  "border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 font-mono text-xs uppercase tracking-wider text-[var(--text)] outline-none focus:border-[var(--muted)]";

export function SearchBar({
  query,
  onQueryChange,
  forum,
  forums,
  onForumChange,
  country,
  countries,
  onCountryChange,
  suggestions,
  searchOpen,
  searchLoading,
  searchTotal,
  searchWrapRef,
  onSelectActor,
  onReset,
  loaded,
  totalActors,
}: SearchBarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-end gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 sm:px-4">
      <div ref={searchWrapRef} className="relative min-w-[12rem] flex-1 basis-56">
        <label className="mb-0.5 block font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          Actor search
        </label>
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0) {
              /* open handled by parent via suggestions */
            }
          }}
          placeholder="Username…"
          aria-label="Search actors"
          aria-autocomplete="list"
          aria-expanded={searchOpen}
          className={inputClass}
        />
        {searchOpen && (suggestions.length > 0 || searchLoading) ? (
          <ul
            role="listbox"
            className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-y-auto border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_12px_40px_color-mix(in_oklab,var(--bg)_60%,transparent)]"
          >
            {searchLoading ? (
              <li className="px-3 py-2 text-xs text-[var(--muted)]">Searching…</li>
            ) : (
              suggestions.map((a) => (
                <li key={a.id} role="option">
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-baseline justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-[var(--surface)]"
                    onClick={() => onSelectActor(a)}
                  >
                    <span className="truncate font-medium text-[var(--text)]">
                      {a.username}
                    </span>
                    <span className="shrink-0 font-mono text-[0.65rem] tabular-nums text-[var(--muted)]">
                      {a.ipCount} ip
                    </span>
                  </button>
                </li>
              ))
            )}
            {!searchLoading && searchTotal > suggestions.length ? (
              <li className="border-t border-[var(--border)] px-3 py-1.5 font-mono text-[0.6rem] text-[var(--muted)]">
                Showing {suggestions.length} of {searchTotal} matches
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          Forum
        </label>
        <select
          className={selectClass}
          value={forum}
          onChange={(e) => onForumChange(e.target.value)}
          aria-label="Forum filter"
        >
          <option value="ALL">All forums</option>
          {forums.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1 block font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          Country
        </label>
        <select
          className={selectClass}
          value={country}
          onChange={(e) => onCountryChange(e.target.value)}
          aria-label="Country filter"
        >
          <option value="ALL">All</option>
          {countries.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onReset}
        className="border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--text)]"
        aria-label="Reset search and filters"
      >
        Reset
      </button>

      <p className="ml-auto self-center font-mono text-[0.65rem] tabular-nums text-[var(--muted)]">
        Directory {loaded}/{totalActors}
      </p>
    </div>
  );
}
