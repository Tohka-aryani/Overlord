"use client";

type ArchiveSparkProps = {
  label: string;
  value: number | string;
  hint: string;
  accent?: boolean;
  series?: number[];
};

/** Compact metric with optional sparkline path. */
export function ArchiveSpark({
  label,
  value,
  hint,
  accent = false,
  series = [],
}: ArchiveSparkProps) {
  const path = sparkPath(series);

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)]">
      <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p
          className={`font-mono text-3xl tabular-nums tracking-tight ${
            accent ? "text-[var(--threat)]" : "text-[var(--text)]"
          }`}
        >
          {value}
        </p>
        {path ? (
          <svg
            width="72"
            height="28"
            viewBox="0 0 72 28"
            className="shrink-0 opacity-80"
            aria-hidden
          >
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function sparkPath(series: number[]): string | null {
  if (series.length < 2) return null;
  const max = Math.max(...series, 1);
  const min = Math.min(...series, 0);
  const span = Math.max(max - min, 1);
  const w = 72;
  const h = 28;
  const step = w / (series.length - 1);
  return series
    .map((v, i) => {
      const x = i * step;
      const y = h - ((v - min) / span) * (h - 4) - 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}
