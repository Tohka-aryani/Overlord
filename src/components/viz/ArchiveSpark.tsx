"use client";

type ArchiveSparkProps = {
  label: string;
  value: number | string;
  hint: string;
  accent?: boolean;
  /** Optional sparkline; omit to avoid the decorative line. */
  series?: number[];
  className?: string;
};

/** Compact metric with optional sparkline path. */
export function ArchiveSpark({
  label,
  value,
  hint,
  accent = false,
  series = [],
  className = "",
}: ArchiveSparkProps) {
  const path = sparkPath(series);
  const long = String(value).length > 10;

  return (
    <div
      className={`bg-[var(--surface)] p-4 transition-colors hover:bg-[var(--surface-raised)] ${className}`}
    >
      <p className="font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </p>
      <div className="mt-2 flex min-h-[2.25rem] items-end justify-between gap-2">
        <p
          className={`min-w-0 font-[family-name:var(--font-ui)] font-bold tabular-nums tracking-tight leading-none ${
            long ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
          } ${accent ? "text-[var(--threat)]" : "text-[var(--text)]"}`}
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
