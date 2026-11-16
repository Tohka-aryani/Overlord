"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ThreatInfo } from "@/components/viz/ThreatInfo";

export type ThreatBucket = {
  level: string;
  count: number;
};

const ORDER = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Info",
  "Unclassified",
] as const;

function barColor(level: string): string {
  if (level === "Critical" || level === "High") return "var(--threat)";
  if (level === "Medium") return "var(--info)";
  if (level === "Low" || level === "Info") return "var(--ok)";
  return "var(--muted)";
}

type ThreatBarsProps = {
  buckets: ThreatBucket[];
  title?: string;
  /** Controlled selected band (for Overview threat filter). */
  selected?: string | null;
  onSelect?: (level: string | null) => void;
  /** Prefer URL navigation when provided (SSR-friendly filters). */
  hrefForLevel?: (level: string | null) => string;
};

/** Interactive horizontal threat distribution. */
export function ThreatBars({
  buckets,
  title = "Threat distribution",
  selected = null,
  onSelect,
  hrefForLevel,
}: ThreatBarsProps) {
  const [hover, setHover] = useState<string | null>(null);

  const rows = useMemo(() => {
    const map = new Map(buckets.map((b) => [b.level, b.count]));
    return ORDER.map((level) => ({
      level,
      count: map.get(level) ?? 0,
    })).filter((r) => r.count > 0 || levelAlways(r.level));
  }, [buckets]);

  const max = Math.max(1, ...rows.map((r) => r.count));
  const total = rows.reduce((s, r) => s + r.count, 0);
  const active = selected ?? hover;
  const focus = active ? rows.find((r) => r.level === active) : null;

  return (
    <section
      aria-label={title}
      className="border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <header className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium tracking-tight text-[var(--text)]">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            Click a bar to filter Needs attention.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <ThreatInfo />
          <p className="font-mono text-xs tabular-nums text-[var(--muted)]">
            {focus
              ? `${focus.level}: ${focus.count.toLocaleString()} / ${total.toLocaleString()}`
              : `total ${total.toLocaleString()}`}
          </p>
        </div>
      </header>

      <ul className="space-y-2.5">
        {rows.map((row) => {
          const pct = Math.round((row.count / max) * 100);
          const dimmed = active !== null && active !== row.level;
          const pressed = selected === row.level;
          const className =
            "group flex w-full cursor-pointer items-center gap-3 text-left";
          const body = (
            <>
              <span className="w-24 shrink-0 font-mono text-[0.65rem] uppercase tracking-wide text-[var(--muted)] group-hover:text-[var(--text)]">
                {row.level}
              </span>
              <span className="relative h-2.5 flex-1 bg-[var(--bg)]">
                <span
                  className="absolute inset-y-0 left-0 transition-[width,opacity] duration-200"
                  style={{
                    width: `${pct}%`,
                    background: barColor(row.level),
                    opacity: dimmed ? 0.25 : 1,
                  }}
                />
              </span>
              <span className="w-8 shrink-0 text-right font-mono text-xs tabular-nums text-[var(--text)]">
                {row.count}
              </span>
            </>
          );

          if (hrefForLevel) {
            const href = hrefForLevel(pressed ? null : row.level);
            return (
              <li key={row.level}>
                <Link
                  href={href}
                  className={className}
                  aria-current={pressed ? "page" : undefined}
                  onMouseEnter={() => setHover(row.level)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(row.level)}
                  onBlur={() => setHover(null)}
                >
                  {body}
                </Link>
              </li>
            );
          }

          return (
            <li key={row.level}>
              <button
                type="button"
                className={className}
                onMouseEnter={() => setHover(row.level)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(row.level)}
                onBlur={() => setHover(null)}
                onClick={() => {
                  if (!onSelect) return;
                  onSelect(selected === row.level ? null : row.level);
                }}
                aria-pressed={pressed}
              >
                {body}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function levelAlways(level: string): boolean {
  return level === "Unclassified";
}
