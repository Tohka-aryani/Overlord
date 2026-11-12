import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { ThreatBadge } from "@/components/ThreatBadge";
import { ArchiveSpark } from "@/components/viz/ArchiveSpark";
import { ThreatBars } from "@/components/viz/ThreatBars";
import { getOverviewData } from "@/lib/overview";

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

async function OverviewBody() {
  await connection();
  const data = await getOverviewData();

  const sparkVictims = [
    Math.max(0, data.myVictimCount - 40),
    Math.max(0, data.myVictimCount - 25),
    Math.max(0, data.myVictimCount - 12),
    data.myVictimCount,
  ];

  return (
    <>
      <section
        aria-label="Archive pulse"
        className="grid grid-cols-1 gap-3 border-b border-[var(--border)] px-4 py-6 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 lg:px-8"
      >
        <ArchiveSpark
          label="MY victims"
          value={data.myVictimCount}
          hint="ransomware.live · country MY"
          series={sparkVictims}
        />
        <ArchiveSpark
          label="High threat"
          value={
            data.highThreatCount === null ? "—" : data.highThreatCount
          }
          hint={
            data.highThreatCount === null
              ? "Labels pending / mostly unclassified"
              : "Critical + High in recent sample"
          }
          accent={data.highThreatCount !== null && data.highThreatCount > 0}
        />
        <ArchiveSpark
          label="News archive"
          value={data.newsCount}
          hint="Google News MY keyword hits"
        />
        <ArchiveSpark
          label="Public actors"
          value={data.actorCount}
          hint="Imported forum usernames"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 border-b border-[var(--border)] px-4 py-6 sm:px-6 lg:grid-cols-5 lg:px-8">
        <div className="lg:col-span-3">
          <ThreatBars buckets={data.threatBuckets} />
        </div>
        <div className="border border-[var(--border)] bg-[var(--surface)] p-4 lg:col-span-2">
          <h2 className="text-sm font-medium tracking-tight">Last ingest</h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Source health from archive runs.
          </p>
          <ul className="mt-4 space-y-3">
            {data.ingest.map((row) => (
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
                    <span className="ml-2 text-[var(--muted)]" suppressHydrationWarning>
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
        className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8"
      >
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
              Needs attention
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ranked by threat, then recency. Click through to feed tabs.
            </p>
          </div>
          <p className="font-mono text-xs tabular-nums text-[var(--muted)]">
            {data.needsAttention.length}
          </p>
        </header>

        {data.needsAttention.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Archive is empty. Run ransomware and news ingest, then refresh.
          </p>
        ) : (
          <div className="overflow-x-auto border border-[var(--border)]">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)] text-[0.7rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="px-4 py-3 font-medium">Threat</th>
                  <th className="px-4 py-3 font-medium">Signal</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {data.needsAttention.map((item) => (
                  <tr key={item.key} className="ol-attn-row border-b border-[var(--border)]/70">
                    <td className="px-4 py-3 align-top">
                      <ThreatBadge level={item.threatLevel} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Link
                        href={item.href}
                        className="text-[var(--text)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {item.detail}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function OverviewFallback() {
  return (
    <div className="px-8 py-10 text-sm text-[var(--muted)]">
      Loading Malaysia pulse…
    </div>
  );
}

export default function OverviewPage() {
  return (
    <main className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--border)] px-4 py-5 sm:px-6 lg:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight">
          Overview
        </h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
          Malaysia-first archive pulse: counts, threat shape, ingest health,
          and ranked signals.
        </p>
      </header>
      <Suspense fallback={<OverviewFallback />}>
        <OverviewBody />
      </Suspense>
    </main>
  );
}
