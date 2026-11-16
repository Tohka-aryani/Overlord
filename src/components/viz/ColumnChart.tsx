"use client";

import { useState } from "react";

type ColumnChartProps = {
  title: string;
  rows: [string, number][];
  empty?: string;
  /** Bar track height in px (avoids % height collapse in flex). */
  height?: number;
  formatLabel?: (key: string) => string;
  accentVar?: string;
  /** Click a column to filter / highlight (toggle off when same key). */
  active?: string;
  onSelect?: (key: string) => void;
};

/** Vertical column chart — hover tooltips, optional click-to-select. */
export function ColumnChart({
  title,
  rows,
  empty = "No data yet.",
  height = 140,
  formatLabel = (k) => {
    if (k.length >= 10 && k[4] === "-" && k[7] === "-") return k.slice(5);
    return k;
  },
  accentVar = "var(--accent)",
  active = "",
  onSelect,
}: ColumnChartProps) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map(([, n]) => n));
  const nonzero = rows.some(([, n]) => n > 0);
  const colRem =
    rows.length > 60 ? 1.65 : rows.length > 30 ? 1.85 : rows.length > 14 ? 2.05 : 2.35;
  const labelSize =
    rows.length > 45 ? "0.55rem" : rows.length > 20 ? "0.6rem" : "0.65rem";
  const barMax = Math.max(24, height - 18);
  const focusKey = hover ?? (active || null);
  const focusRow = focusKey
    ? rows.find(([k]) => k === focusKey)
    : null;

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="flex items-baseline justify-between gap-2 border-b border-[var(--border)] px-3 py-2">
        <p className="font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          {title}
        </p>
        {focusRow ? (
          <p className="font-[family-name:var(--font-ui)] text-[0.6rem] tabular-nums text-[var(--text)]">
            {focusRow[0]} · <span className="text-[var(--accent)]">{focusRow[1]}</span>
          </p>
        ) : null}
      </div>
      {!nonzero ? (
        <p className="px-3 py-4 text-xs text-[var(--muted)]">{empty}</p>
      ) : (
        <div className="overflow-x-auto px-3 py-3">
          <div style={{ minWidth: `${Math.max(rows.length * colRem, 12)}rem` }}>
            <div
              className="flex items-end gap-px"
              style={{ height }}
              role="img"
              aria-label={title}
            >
              {rows.map(([key, n]) => {
                const h =
                  n <= 0 ? 2 : Math.max(4, Math.round((n / max) * barMax));
                const isActive = active === key;
                const isHover = hover === key;
                const dim =
                  (active && !isActive) ||
                  (hover && !isHover && !isActive);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={!onSelect}
                    onClick={() => {
                      if (!onSelect) return;
                      onSelect(isActive ? "" : key);
                    }}
                    onMouseEnter={() => setHover(key)}
                    onMouseLeave={() => setHover(null)}
                    onFocus={() => setHover(key)}
                    onBlur={() => setHover(null)}
                    title={`${key}: ${n}`}
                    aria-pressed={onSelect ? isActive : undefined}
                    className={`ol-chart-bar flex min-w-0 flex-1 flex-col items-center justify-end border-0 bg-transparent p-0 ${
                      onSelect ? "cursor-pointer" : "cursor-default"
                    }`}
                    data-active={isActive || isHover ? "true" : "false"}
                    data-dim={dim ? "true" : "false"}
                  >
                    {n > 0 ? (
                      <span className="mb-0.5 font-[family-name:var(--font-ui)] text-[0.5rem] tabular-nums text-[var(--muted)]">
                        {n}
                      </span>
                    ) : (
                      <span className="mb-0.5 h-[0.65rem]" aria-hidden />
                    )}
                    <div
                      className="w-full max-w-[1.35rem] transition-[height] duration-300"
                      style={{
                        height: h,
                        background: accentVar,
                        opacity: n > 0 ? 0.9 : 0.14,
                      }}
                    />
                  </button>
                );
              })}
            </div>

            <div
              className="mt-1.5 flex gap-px border-t border-[var(--border)] pt-1.5"
              aria-hidden={false}
            >
              {rows.map(([key]) => (
                <div
                  key={`lbl-${key}`}
                  className="min-w-0 flex-1 text-center"
                  title={key}
                >
                  <span
                    className="block font-[family-name:var(--font-ui)] tabular-nums leading-tight text-[var(--text)]"
                    style={{ fontSize: labelSize }}
                  >
                    {formatLabel(key)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-between font-[family-name:var(--font-ui)] text-[0.55rem] tabular-nums text-[var(--muted)]">
              <span>
                {onSelect ? "Click a day to focus · click again to clear" : ""}
              </span>
              <span>
                peak {max}
                {rows.length > 1 ? ` · ${rows.length} days` : ""}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
