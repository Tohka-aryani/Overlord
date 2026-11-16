"use client";

import Link from "next/link";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { THEME_LABELS, useTheme } from "@/components/theme/ThemeProvider";

/** Slim footer so ops pages (Public Data) fit one viewport. */
export function SiteFooter() {
  const { t, locale } = useLocale();
  const { theme } = useTheme();

  return (
    <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-[96rem] flex-wrap items-center justify-between gap-2 px-4 py-2 text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)] sm:px-6 lg:px-8">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[var(--text)]">{t("footer.brand")}</span>
          <Link href="/" className="hover:text-[var(--accent)]">
            {t("nav.overview")}
          </Link>
          <Link href="/public-data" className="hover:text-[var(--accent)]">
            {t("nav.publicData")}
          </Link>
          <Link href="/ransomware" className="hover:text-[var(--accent)]">
            {t("nav.ransomware")}
          </Link>
        </span>
        <span>
          {t("footer.disclaimer")} · {THEME_LABELS[theme]} · {locale.toUpperCase()}
        </span>
      </div>
    </footer>
  );
}
