"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ThreatBadge } from "@/components/ThreatBadge";
import { DonutChart } from "@/components/viz/DonutChart";
import { ThreatBars } from "@/components/viz/ThreatBars";
import { ThreatInfo } from "@/components/viz/ThreatInfo";
import type {
  IngestStatusRow,
  NeedsAttentionItem,
  ThreatBucket,
} from "@/lib/overview";
import { threatChartColor } from "@/lib/ransomware-stats";

const THREAT_FILTERS = [
  "All",
  "Critical",
  "High",
  "Medium",
  "Low",
  "Info",
  "Unclassified",
] as const;

type SortKey = "threat" | "signal" | "source" | "when";

type OverviewPulseProps = {
  threatBuckets: ThreatBucket[];
  ingest: IngestStatusRow[];
  classifiedEntityCount: number;
  unclassifiedEntityCount: number;
  archiveClassified: number;
  archiveTotal: number;
  attentionTotal?: number;
  initialAttention: {
    items: NeedsAttentionItem[];
    total: number;
    page: number;
    pageSize: number;
  };
  initialThreat?: string;
  initialSort?: SortKey;
  initialDir?: "asc" | "desc";
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

function statusTone(status: string): string {
  if (status === "success") return "var(--ok)";
  if (status === "error" || status === "failed") return "var(--threat)";
  if (status === "running") return "var(--info)";
  return "var(--muted)";
}

function attentionHref(opts: {
  threat: string;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
}): string {
  const params = new URLSearchParams();
  if (opts.threat && opts.threat !== "All") params.set("threat", opts.threat);
  if (opts.sort !== "threat") params.set("sort", opts.sort);
  if (opts.dir !== "asc") params.set("dir", opts.dir);
  if (opts.page > 1) params.set("page", String(opts.page));
  const q = params.toString();
  return q ? `/?${q}` : "/";
}

/** Full-archive threat filter + server-paged Needs Attention (URL-driven). */
export function OverviewPulse({
  threatBuckets,
  ingest,
  classifiedEntityCount,
  unclassifiedEntityCount,
  archiveClassified,
  archiveTotal,
  attentionTotal,
  initialAttention,
  initialThreat = "All",
  initialSort = "threat",
  initialDir = "asc",
}: OverviewPulseProps) {
  const router = useRouter();
  const threatFilter = initialThreat;
  const sortKey = initialSort;
  const sortDir = initialDir;
  const page = initialAttention.page;
  const items = initialAttention.items;
  const total = attentionTotal ?? initialAttention.total;
  const pageSize = initialAttention.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const threatTotal = threatBuckets.reduce((s, b) => s + b.count, 0);

  const sortMark = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : "";

  const nextSortDir = (key: SortKey): "asc" | "desc" => {
    if (sortKey === key) return sortDir === "asc" ? "desc" : "asc";
    return key === "when" ? "desc" : "asc";
  };

  return (
    <>
      <section className="grid grid-cols-1 gap-6 border-b border-[var(--border)] px-4 py-6 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="space-y-4 lg:col-span-3">
          <ThreatBars
            buckets={threatBuckets}
            selected={threatFilter === "All" ? null : threatFilter}
            hrefForLevel={(level) =>
              attentionHref({
                threat: level ?? "All",
                sort: sortKey,
                dir: sortDir,
                page: 1,
              })
            }
          />
          <DonutChart
            title="Threat share"
            rows={threatBuckets.map((b) => [b.level, b.count])}
            active={threatFilter === "All" ? "" : threatFilter}
            onSelect={(v) => {
              router.push(
                attentionHref({
                  threat: v || "All",
                  sort: sortKey,
                  dir: sortDir,
                  page: 1,
                }),
              );
            }}
            colorFor={threatChartColor}
            size={120}
            empty="No classifications yet."
          />
          <p className="font-mono text-[0.65rem] tabular-nums text-[var(--muted)]">
            Threat total {threatTotal.toLocaleString()}
            {" · "}
            Archive classified {archiveClassified.toLocaleString()}/
            {archiveTotal.toLocaleString()}
            {" · "}
            Unclassified {unclassifiedEntityCount.toLocaleString()}
            {" · "}
            Labeled {classifiedEntityCount.toLocaleString()}
          </p>
        </div>
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
          <h2 className="text-sm font-medium tracking-tight">Last ingest</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Source health from archive runs.
          </p>
          <ul className="mt-4 space-y-3">
            {ingest.map((row) => (
              <li
                key={row.source}
                className="flex items-baseline justify-between gap-3 border-b border-[var(--border)]/60 pb-2 text-sm last:border-0"
              >
                <span className="text-[var(--muted)]">{row.label}</span>
                <span className="font-mono text-xs tabular-nums">
                  <span style={{ color: statusTone(row.status) }}>
                    {row.status}
                  </span>
                  {row.finishedAt || row.startedAt ? (
                    <span
                      className="ml-2 text-[var(--muted)]"
                      suppressHydrationWarning
                    >
                      {formatWhen(row.finishedAt ?? row.startedAt)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        aria-label="Needs attention"
        className="px-4 py-6 sm:px-6 lg:px-8"
      >
        <header className="mb-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
                Needs attention
              </h2>
              <ThreatInfo />
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Full archive — ranked by threat, then recency. Server-paged.
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-[var(--muted)]">
            {`${items.length.toLocaleString()} shown · ${total.toLocaleString()} total`}
            {threatFilter !== "All" ? ` · ${threatFilter}` : ""}
          </p>
        </header>

        <div
          className="mb-4 flex flex-wrap gap-1.5"
          role="group"
          aria-label="Threat filter"
        >
          {THREAT_FILTERS.map((level) => {
            const href = attentionHref({
              threat: level,
              sort: sortKey,
              dir: sortDir,
              page: 1,
            });
            const active = threatFilter === level;
            return (
              <Link
                key={level}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`border px-2 py-1 font-mono text-[0.65rem] uppercase tracking-wider transition-colors duration-150 ${
                  active
                    ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--text)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {level}
              </Link>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No signals for this threat filter.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto border border-[var(--border)]">
              <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[0.7rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                    {(
                      [
                        ["threat", "Threat"],
                        ["signal", "Signal"],
                        ["source", "Source"],
                        ["when", "When"],
                      ] as const
                    ).map(([key, label]) => (
                      <th key={key} className="px-4 py-3 font-medium">
                        <Link
                          href={attentionHref({
                            threat: threatFilter,
                            sort: key,
                            dir: nextSortDir(key),
                            page: 1,
                          })}
                          className="uppercase tracking-[0.12em] hover:text-[var(--text)]"
                        >
                          {label}
                          {sortMark(key)}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const openExternal = Boolean(item.external);
                    const openItem = () => {
                      if (openExternal) {
                        window.open(item.href, "_blank", "noopener,noreferrer");
                      } else {
                        router.push(item.href);
                      }
                    };
                    return (
                      <tr
                        key={item.key}
                        role="link"
                        tabIndex={0}
                        onClick={openItem}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            openItem();
                          }
                        }}
                        className="ol-attn-row cursor-pointer border-b border-[var(--border)]/70 hover:bg-[color-mix(in_oklab,var(--accent)_6%,transparent)]"
                      >
                        <td className="px-4 py-3 align-top">
                          <ThreatBadge level={item.threatLevel} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className="text-[var(--text)] underline-offset-2 group-hover:underline">
                            {item.title}
                          </span>
                          <p className="mt-0.5 text-xs text-[var(--muted)]">
                            {item.detail}
                            {openExternal ? " · opens source" : ""}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top font-mono text-xs uppercase tracking-wide text-[var(--muted)]">
                          {item.kind}
                        </td>
                        <td
                          className="px-4 py-3 align-top font-mono text-xs tabular-nums text-[var(--muted)]"
                          suppressHydrationWarning
                        >
                          {formatWhen(item.at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="font-mono text-xs tabular-nums text-[var(--muted)]">
                Page {page} / {totalPages}
              </p>
              <div className="flex gap-2">
                {page <= 1 ? (
                  <span className="border border-[var(--border)] px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--muted)] opacity-40">
                    Previous
                  </span>
                ) : (
                  <Link
                    href={attentionHref({
                      threat: threatFilter,
                      sort: sortKey,
                      dir: sortDir,
                      page: page - 1,
                    })}
                    className="border border-[var(--border)] px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    Previous
                  </Link>
                )}
                {page >= totalPages ? (
                  <span className="border border-[var(--border)] px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--muted)] opacity-40">
                    Next
                  </span>
                ) : (
                  <Link
                    href={attentionHref({
                      threat: threatFilter,
                      sort: sortKey,
                      dir: sortDir,
                      page: page + 1,
                    })}
                    className="border border-[var(--border)] px-3 py-1.5 font-mono text-[0.65rem] uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)]"
                  >
                    Next
                  </Link>
                )}
              </div>
            </div>
          </>
        )}
      </section>
    </>
  );
}
