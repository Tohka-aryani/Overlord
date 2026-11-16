"use client";

import Link from "next/link";
import type { IpItem } from "@/components/public-data/types";

type IpTableProps = {
  items: IpItem[];
  loading: boolean;
  error: string | null;
  focusIp: string | null;
  actorUsername?: string | null;
  pageLimit?: number;
  onFocusIp: (ip: string) => void;
  onDetail: (ip: string) => void;
};

export function IpTable({
  items,
  loading,
  error,
  focusIp,
  actorUsername,
  pageLimit = 100,
  onFocusIp,
  onDetail,
}: IpTableProps) {
  return (
    <div className="flex h-full min-h-0 flex-col border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-3 py-1.5">
        <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          IP footprint · {items.length}
        </p>
        {loading ? (
          <span className="font-mono text-[0.6rem] text-[var(--muted)]">
            Loading…
          </span>
        ) : null}
      </div>
      {error ? (
        <p className="px-3 py-2 text-xs text-[var(--threat)]">{error}</p>
      ) : null}
      <div className="ol-scroll-pane min-h-0 flex-1 overflow-auto">
        {items.length === 0 && !loading ? (
          <p className="px-3 py-4 text-xs text-[var(--muted)]">
            No IPs for this actor / country filter.
          </p>
        ) : (
          <table className="w-full min-w-[28rem] border-collapse text-left text-xs">
            <thead className="sticky top-0 z-[1] bg-[var(--surface-raised)] text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)]">
              <tr className="border-b border-[var(--border)]">
                <th className="px-3 py-2 font-medium">IP</th>
                <th className="px-3 py-2 font-medium">Country</th>
                <th className="hidden px-3 py-2 font-medium sm:table-cell">
                  Host
                </th>
                <th className="px-3 py-2 font-medium">Map</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => {
                const mappable = Boolean(row.map);
                const focused = focusIp === row.ip;
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-[var(--border)]/50 ${
                      i % 2 === 1
                        ? "bg-[color-mix(in_oklab,var(--surface-raised)_45%,transparent)]"
                        : ""
                    } ${!mappable ? "opacity-60" : ""} ${
                      focused
                        ? "bg-[color-mix(in_oklab,var(--accent)_16%,transparent)]"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      <button
                        type="button"
                        disabled={!mappable}
                        onClick={() => onFocusIp(row.ip)}
                        className="cursor-pointer font-mono text-[0.7rem] text-[var(--text)] enabled:hover:text-[var(--accent)] disabled:cursor-default"
                        title={
                          mappable
                            ? "Pinpoint on map"
                            : "No country ISO — unmappable"
                        }
                      >
                        {row.ip}
                      </button>
                    </td>
                    <td className="px-3 py-1.5 font-mono uppercase text-[var(--muted)]">
                      {row.countryIso ?? "—"}
                    </td>
                    <td className="hidden truncate px-3 py-1.5 text-[var(--muted)] sm:table-cell">
                      {row.hostname ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <Link
                        href={`/public-data?${new URLSearchParams({
                          ...(actorUsername ? { actor: actorUsername } : {}),
                          ...(pageLimit > 100
                            ? { limit: String(pageLimit) }
                            : {}),
                          detailIp: row.ip,
                        }).toString()}`}
                        onClick={() => onDetail(row.ip)}
                        className="font-mono text-[0.6rem] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--accent)]"
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
