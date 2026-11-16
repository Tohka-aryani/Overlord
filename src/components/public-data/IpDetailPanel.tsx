"use client";

import Link from "next/link";
import type { IpDetailResponse } from "@/components/public-data/types";

type IpDetailPanelProps = {
  detail: IpDetailResponse | null;
  loading: boolean;
  closeHref?: string;
  onClose: () => void;
};

export function IpDetailPanel({
  detail,
  loading,
  closeHref = "/public-data",
  onClose,
}: IpDetailPanelProps) {
  if (!detail && !loading) return null;

  return (
    <div
      className="ol-pd-fade absolute inset-x-3 bottom-3 z-[600] max-h-[40%] overflow-auto border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[0_16px_48px_color-mix(in_oklab,var(--bg)_55%,transparent)] sm:inset-x-auto sm:right-3 sm:bottom-3 sm:w-[22rem]"
      role="dialog"
      aria-label="IP enrichment"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Enrichment
          </p>
          <p className="font-mono text-sm font-semibold text-[var(--text)]">
            {detail?.ip ?? "…"}
          </p>
        </div>
        <Link
          href={closeHref}
          onClick={onClose}
          className="font-mono text-xs text-[var(--muted)] hover:text-[var(--text)]"
          aria-label="Close enrichment"
        >
          Close
        </Link>
      </div>
      {loading ? (
        <p className="text-xs text-[var(--muted)]">Fetching ip-detail…</p>
      ) : detail ? (
        <div className="space-y-2 text-xs">
          <p className="text-[var(--muted)]">
            Archive users:{" "}
            {detail.dbUsers.length === 0
              ? "—"
              : detail.dbUsers
                  .map((u) => u.username ?? "?")
                  .filter(Boolean)
                  .join(", ")}
          </p>
          {detail.ipinfo ? (
            <dl className="space-y-1">
              {(["city", "region", "country", "org", "hostname"] as const).map(
                (k) => {
                  const v = detail.ipinfo?.[k];
                  if (v == null || v === "") return null;
                  return (
                    <div key={k} className="flex justify-between gap-2">
                      <dt className="uppercase tracking-wider text-[var(--muted)]">
                        {k}
                      </dt>
                      <dd className="text-right font-mono text-[var(--text)]">
                        {String(v)}
                      </dd>
                    </div>
                  );
                },
              )}
            </dl>
          ) : (
            <p className="text-[var(--muted)]">
              {detail.ipinfoError ?? "No ipinfo payload"}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
