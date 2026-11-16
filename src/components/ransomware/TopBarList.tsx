"use client";

type TopBarListProps = {
  title: string;
  rows: [string, number][];
  active: string;
  onSelect: (value: string) => void;
  empty?: string;
};

/** Horizontal top-N bars that toggle a table filter on click. */
export function TopBarList({
  title,
  rows,
  active,
  onSelect,
  empty = "No data.",
}: TopBarListProps) {
  const max = Math.max(1, ...rows.map(([, n]) => n));

  return (
    <div className="border border-[var(--border)] bg-[var(--surface)]">
      <div className="border-b border-[var(--border)] px-3 py-2 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {title}
      </div>
      <ul className="max-h-56 space-y-1 overflow-y-auto px-3 py-3">
        {rows.length === 0 ? (
          <li className="text-xs text-[var(--muted)]">{empty}</li>
        ) : (
          rows.map(([label, n]) => {
            const pct = Math.round((n / max) * 100);
            const on = active === label;
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => onSelect(on ? "" : label)}
                  aria-pressed={on}
                  className={`group flex w-full cursor-pointer flex-col gap-1 text-left ${
                    on ? "text-[var(--text)]" : "text-[var(--muted)]"
                  }`}
                >
                  <span className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate group-hover:text-[var(--text)]">
                      {label}
                    </span>
                    <span className="shrink-0 font-mono tabular-nums">{n}</span>
                  </span>
                  <span className="relative h-1.5 w-full bg-[var(--bg)]">
                    <span
                      className="absolute inset-y-0 left-0 bg-[var(--accent)] transition-[width] duration-200"
                      style={{
                        width: `${pct}%`,
                        opacity: on ? 1 : 0.7,
                      }}
                    />
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
