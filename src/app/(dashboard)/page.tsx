import { connection } from "next/server";
import Link from "next/link";
import { Suspense } from "react";
import { ThreatBadge } from "@/components/ThreatBadge";
import { getOverviewData } from "@/lib/overview";

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  // Prefer date-only attack dates; full ISO for timestamps.
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

  return (
    <>
      <section
        aria-label="Malaysia pulse"
        className="grid grid-cols-1 gap-8 border-b border-[var(--border)] px-8 py-6 sm:grid-cols-3"
      >
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-[var(--muted)]">
            MY victims
          </p>
          <p className="mt-1 font-mono text-3xl tabular-nums tracking-tight text-[var(--text)]">
            {data.myVictimCount}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            ransomware.live archive · country MY
          </p>
        </div>

        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-[var(--muted)]">
            High threat
          </p>
          {data.highThreatCount === null ? (
            <>
              <p className="mt-1 text-lg text-[var(--muted)]">Unclassified</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {data.classifiedEntityCount === 0
                  ? "No Critical/High labels yet — Ollama classifications pending."
                  : `Most of the recent archive is unlabeled (${data.unclassifiedEntityCount} of sampled).`}
              </p>
            </>
          ) : (
            <>
              <p className="mt-1 font-mono text-3xl tabular-nums tracking-tight text-[var(--threat)]">
                {data.highThreatCount}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Critical + High in recent MY sample
              </p>
            </>
          )}
        </div>

        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.16em] text-[var(--muted)]">
            Last ingest
          </p>
          <ul className="mt-2 space-y-1.5">
            {data.ingest.map((row) => (
              <li
                key={row.source}
                className="flex items-baseline justify-between gap-3 text-sm"
              >
                <span className="text-[var(--muted)]">{row.label}</span>
                <span className="font-mono text-xs tabular-nums">
                  <span style={{ color: statusTone(row.status) }}>
                    {row.status}
                  </span>
                  {row.finishedAt || row.startedAt ? (
                    <span className="ml-2 text-[var(--muted)]">
                      {formatWhen(row.finishedAt ?? row.startedAt)}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-label="Needs attention" className="flex min-h-0 flex-1 flex-col px-8 py-6">
        <header className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-lg font-medium tracking-tight">Needs attention</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Ranked by threat, then recency.
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
          <div className="overflow-x-auto border-t border-[var(--border)]">
            <table className="w-full min-w-[40rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[0.7rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="py-3 pr-4 font-medium">Threat</th>
                  <th className="py-3 pr-4 font-medium">Signal</th>
                  <th className="py-3 pr-4 font-medium">Source</th>
                  <th className="py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {data.needsAttention.map((item) => (
                  <tr
                    key={item.key}
                    className="border-b border-[var(--border)]/70 hover:bg-[var(--surface)]/50"
                  >
                    <td className="py-3 pr-4 align-top">
                      <ThreatBadge level={item.threatLevel} />
                    </td>
                    <td className="py-3 pr-4 align-top">
                      <Link
                        href={item.href}
                        className="text-[var(--text)] underline-offset-2 hover:underline"
                      >
                        {item.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--muted)]">
                        {item.detail}
                      </p>
                    </td>
                    <td className="py-3 pr-4 align-top font-mono text-xs uppercase tracking-wide text-[var(--muted)]">
                      {item.kind}
                    </td>
                    <td className="py-3 align-top font-mono text-xs tabular-nums text-[var(--muted)]">
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
      <header className="border-b border-[var(--border)] px-8 py-5">
        <h1 className="text-xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--muted)]">
          Malaysia-first archive: counts, ingest health, needs attention.
        </p>
      </header>
      <Suspense fallback={<OverviewFallback />}>
        <OverviewBody />
      </Suspense>
    </main>
  );
}
