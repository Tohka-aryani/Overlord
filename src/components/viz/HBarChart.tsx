"use client";

import { useState } from "react";

type HBarChartProps = {
  title: string;
  rows: [string, number][];
  active?: string;
  onSelect?: (value: string) => void;
  empty?: string;
  colorFor?: (label: string) => string;
};

/** Interactive horizontal bar chart (filter chips when onSelect is set). */
export function HBarChart({
  title,
  rows,
  active = "",
  onSelect,
  empty = "No data.",
  colorFor,
}: HBarChartProps) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  const total = rows.reduce((s, [, n]) => s + n, 0);
  const focus =
    rows.find(([label]) => label === (hover || active)) ?? null;

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <p className="font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          {title}
        </p>
        {focus ? (
          <p className="truncate font-[family-name:var(--font-ui)] text-[0.6rem] tabular-nums text-[var(--text)]">
            {focus[0]} · {focus[1]}
          </p>
        ) : total > 0 ? (
          <p className="font-[family-name:var(--font-ui)] text-[0.6rem] tabular-nums text-[var(--muted)]">
            n={total}
          </p>
        ) : null}
      </div>
      <ul className="max-h-56 space-y-2 overflow-y-auto px-3 py-3">
        {rows.length === 0 ? (
          <li className="text-xs text-[var(--muted)]">{empty}</li>
        ) : (
          rows.map(([label, n]) => {
            const pct = Math.round((n / max) * 100);
            const share = total > 0 ? Math.round((n / total) * 100) : 0;
            const on = active === label;
            const isHover = hover === label;
            const dim =
              (active && !on) || (hover && !isHover && !on);
            const barColor = colorFor?.(label) ?? "var(--accent)";
            const inner = (
              <>
                <span className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate group-hover:text-[var(--text)]">
                    {label}
                  </span>
                  <span className="shrink-0 font-[family-name:var(--font-ui)] tabular-nums text-[var(--muted)]">
                    {n}
                    <span className="ml-1 opacity-70">{share}%</span>
                  </span>
                </span>
                <span className="relative mt-1 block h-2 w-full bg-[var(--bg)]">
                  <span
                    className="ol-chart-bar absolute inset-y-0 left-0 transition-[width] duration-200"
                    data-active={on || isHover ? "true" : "false"}
                    data-dim={dim ? "true" : "false"}
                    style={{
                      width: `${pct}%`,
                      background: barColor,
                      opacity: dim ? 0.28 : on ? 1 : 0.75,
                    }}
                  />
                </span>
              </>
            );

            return (
              <li key={label}>
                {onSelect ? (
                  <button
                    type="button"
                    onClick={() => onSelect(on ? "" : label)}
                    onMouseEnter={() => setHover(label)}
                    onMouseLeave={() => setHover(null)}
                    aria-pressed={on}
                    className={`group flex w-full cursor-pointer flex-col text-left ${
                      on || isHover ? "text-[var(--text)]" : "text-[var(--muted)]"
                    }`}
                  >
                    {inner}
                  </button>
                ) : (
                  <div
                    className={`flex flex-col ${on || isHover ? "text-[var(--text)]" : "text-[var(--muted)]"}`}
                    onMouseEnter={() => setHover(label)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {inner}
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
