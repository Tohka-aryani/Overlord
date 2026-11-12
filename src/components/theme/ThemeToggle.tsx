"use client";

import { useTheme } from "@/components/theme/ThemeProvider";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="inline-flex items-center border border-[var(--border)] bg-[var(--surface)] p-0.5"
      role="group"
      aria-label="Color theme"
    >
      <button
        type="button"
        onClick={() => setTheme("night")}
        aria-pressed={theme === "night"}
        className={`px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] transition-colors ${
          theme === "night"
            ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
      >
        Night
      </button>
      <button
        type="button"
        onClick={() => setTheme("day")}
        aria-pressed={theme === "day"}
        className={`px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] transition-colors ${
          theme === "day"
            ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
            : "text-[var(--muted)] hover:text-[var(--text)]"
        }`}
      >
        Day
      </button>
    </div>
  );
}
