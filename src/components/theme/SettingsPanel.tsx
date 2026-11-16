"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  THEME_IDS,
  THEME_LABELS,
  useTheme,
  type ThemeId,
} from "@/components/theme/ThemeProvider";
import { useLocale, type LocaleId } from "@/components/i18n/LocaleProvider";

export function SettingsPanel() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocale();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)] transition-colors hover:text-[var(--text)]"
      >
        {t("nav.settings")}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("settings.title")}
          className="absolute right-0 top-[calc(100%+0.4rem)] z-50 w-[16.5rem] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3 shadow-[var(--inset-hairline)]"
        >
          <p className="mb-2 font-[family-name:var(--font-ui)] text-[0.7rem] uppercase tracking-[0.1em] text-[var(--text)]">
            {t("settings.title")}
          </p>

          <p className="mb-1 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            {t("settings.language")}
          </p>
          <div
            className="mb-3 flex border border-[var(--border)]"
            role="group"
            aria-label={t("settings.language")}
          >
            {(["en", "ms"] as LocaleId[]).map((id) => (
              <button
                key={id}
                type="button"
                aria-pressed={locale === id}
                onClick={() => setLocale(id)}
                className={`flex-1 px-2 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] transition-colors ${
                  locale === id
                    ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {t(`settings.${id}`)}
              </button>
            ))}
          </div>

          <p className="mb-1 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.12em] text-[var(--muted)]">
            {t("settings.theme")}
          </p>
          <div
            className="grid grid-cols-2 gap-1"
            role="group"
            aria-label={t("settings.theme")}
          >
            {THEME_IDS.map((id: ThemeId) => (
              <button
                key={id}
                type="button"
                aria-pressed={theme === id}
                onClick={() => setTheme(id)}
                className={`border px-2 py-1.5 text-left font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.08em] transition-colors ${
                  theme === id
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {THEME_LABELS[id]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
