"use client";

import Link from "next/link";
import type { ActorSummary } from "@/components/public-data/types";

type ActorDirectoryProps = {
  actors: ActorSummary[];
  selectedId: number | null;
  total: number;
  loading: boolean;
  hasMore: boolean;
  pageLimit: number;
  onSelect: (actor: ActorSummary) => void;
  onLoadMore: () => void;
};

function hrefForActor(username: string, limit: number, detailIp?: string | null) {
  const params = new URLSearchParams();
  params.set("actor", username);
  if (limit > 100) params.set("limit", String(limit));
  if (detailIp) params.set("detailIp", detailIp);
  return `/public-data?${params.toString()}`;
}

export function ActorDirectory({
  actors,
  selectedId,
  total,
  loading,
  hasMore,
  pageLimit,
  onSelect,
  onLoadMore,
}: ActorDirectoryProps) {
  const nextLimit = Math.min(pageLimit + 100, 2000);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-[var(--border)] px-3 py-2">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          Actor directory
        </p>
        <p className="mt-0.5 font-mono text-[0.65rem] tabular-nums text-[var(--text)]">
          {actors.length} loaded · {total} total
        </p>
      </div>
      <ul className="ol-scroll-pane min-h-0 flex-1 overflow-y-auto">
        {actors.length === 0 && !loading ? (
          <li className="px-3 py-4 text-xs text-[var(--muted)]">
            No actors. Run public-data import.
          </li>
        ) : (
          actors.map((a, i) => {
            const on = a.id === selectedId;
            return (
              <li
                key={a.id}
                className="ol-pd-fade"
                style={{ animationDelay: `${Math.min(i, 12) * 20}ms` }}
              >
                <Link
                  href={hrefForActor(a.username, pageLimit)}
                  aria-current={on ? "page" : undefined}
                  onClick={() => onSelect(a)}
                  className={`flex w-full items-baseline justify-between gap-2 border-b border-[var(--border)]/50 px-3 py-2 text-left text-sm transition-colors duration-150 ${
                    on
                      ? "bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--text)]"
                      : "text-[var(--muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]"
                  }`}
                >
                  <span className="truncate font-medium">{a.username}</span>
                  <span className="shrink-0 font-mono text-[0.65rem] tabular-nums">
                    {a.ipCount}
                  </span>
                </Link>
              </li>
            );
          })
        )}
      </ul>
      {hasMore ? (
        <div className="border-t border-[var(--border)] p-2">
          <Link
            href={`/public-data?limit=${nextLimit}`}
            onClick={onLoadMore}
            className="block w-full border border-[var(--border)] px-2 py-1.5 text-center font-mono text-[0.65rem] uppercase tracking-wider text-[var(--muted)] transition-colors duration-150 hover:text-[var(--text)]"
          >
            {loading ? "Loading…" : "Load more"}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
