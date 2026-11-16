"use client";

import { useMemo, useState } from "react";

type DonutChartProps = {
  title: string;
  rows: [string, number][];
  active?: string;
  onSelect?: (value: string) => void;
  empty?: string;
  colorFor?: (label: string) => string;
  size?: number;
};

const DEFAULT_COLORS = [
  "var(--threat)",
  "var(--accent)",
  "var(--info)",
  "var(--ok)",
  "var(--muted)",
];

/** SVG donut — clickable slices + legend. */
export function DonutChart({
  title,
  rows,
  active = "",
  onSelect,
  empty = "No data.",
  colorFor,
  size = 128,
}: DonutChartProps) {
  const [hover, setHover] = useState<string | null>(null);
  const total = rows.reduce((s, [, n]) => s + n, 0);
  const r = size / 2;
  const stroke = 18;
  const radius = r - stroke / 2;
  const circ = 2 * Math.PI * radius;

  const slices = useMemo(() => {
    let offset = 0;
    return rows.map(([label, n], i) => {
      const frac = total > 0 ? n / total : 0;
      const len = frac * circ;
      const slice = {
        label,
        n,
        frac,
        dash: `${len} ${circ - len}`,
        offset: -offset,
        color:
          colorFor?.(label) ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]!,
      };
      offset += len;
      return slice;
    });
  }, [rows, total, circ, colorFor]);

  const focus =
    slices.find((s) => s.label === (hover || active)) ?? null;

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <p className="font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          {title}
        </p>
        {focus ? (
          <p className="truncate font-[family-name:var(--font-ui)] text-[0.6rem] text-[var(--text)]">
            {focus.label} · {focus.n}
          </p>
        ) : null}
      </div>
      {total === 0 ? (
        <p className="px-3 py-4 text-xs text-[var(--muted)]">{empty}</p>
      ) : (
        <div className="flex flex-wrap items-center gap-4 px-3 py-3">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="shrink-0"
            role="img"
            aria-label={title}
          >
            <circle
              cx={r}
              cy={r}
              r={radius}
              fill="none"
              stroke="var(--bg)"
              strokeWidth={stroke}
            />
            {slices.map((s) => {
              const on = active === s.label;
              const dim =
                (active && !on) || (hover && hover !== s.label && !on);
              return (
                <circle
                  key={s.label}
                  cx={r}
                  cy={r}
                  r={radius}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={on || hover === s.label ? stroke + 2 : stroke}
                  strokeDasharray={s.dash}
                  strokeDashoffset={s.offset}
                  transform={`rotate(-90 ${r} ${r})`}
                  opacity={dim ? 0.28 : 1}
                  className={`ol-chart-slice transition-opacity duration-150 ${
                    onSelect ? "cursor-pointer" : ""
                  }`}
                  onMouseEnter={() => setHover(s.label)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => {
                    if (!onSelect) return;
                    onSelect(on ? "" : s.label);
                  }}
                />
              );
            })}
            <text
              x={r}
              y={r - 4}
              textAnchor="middle"
              className="fill-[var(--text)] font-[family-name:var(--font-ui)] text-[0.7rem] font-semibold"
            >
              {focus ? focus.n : total}
            </text>
            <text
              x={r}
              y={r + 12}
              textAnchor="middle"
              className="fill-[var(--muted)] font-[family-name:var(--font-ui)] text-[0.55rem] uppercase"
            >
              {focus ? Math.round(focus.frac * 100) + "%" : "total"}
            </text>
          </svg>
          <ul className="min-w-[8rem] flex-1 space-y-1.5">
            {slices.map((s) => {
              const on = active === s.label;
              const pct = Math.round(s.frac * 100);
              const body = (
                <>
                  <span
                    className="mt-1 h-2 w-2 shrink-0"
                    style={{ background: s.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{s.label}</span>
                  <span className="font-[family-name:var(--font-ui)] tabular-nums text-[var(--muted)]">
                    {s.n} · {pct}%
                  </span>
                </>
              );
              return (
                <li key={s.label}>
                  {onSelect ? (
                    <button
                      type="button"
                      onClick={() => onSelect(on ? "" : s.label)}
                      onMouseEnter={() => setHover(s.label)}
                      onMouseLeave={() => setHover(null)}
                      aria-pressed={on}
                      className={`flex w-full cursor-pointer items-center gap-2 text-left text-xs ${
                        on || hover === s.label
                          ? "text-[var(--text)]"
                          : "text-[var(--muted)]"
                      }`}
                    >
                      {body}
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-2 text-xs text-[var(--muted)]"
                      onMouseEnter={() => setHover(s.label)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
