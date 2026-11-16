"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";

export function OverviewHeader() {
  const { t } = useLocale();
  return (
    <header className="shrink-0 border-b border-[var(--border)] px-4 py-8 sm:px-6 lg:px-8">
      <p className="font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted)]">
        {t("overview.eyebrow")}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-ui)] text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
        {t("overview.title")}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        {t("overview.lede")}
      </p>
    </header>
  );
}
