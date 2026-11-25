"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useLocale } from "@/components/i18n/LocaleProvider";

export function OverviewHeader() {
  const { t } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const refreshFeeds = () => {
    startTransition(async () => {
      setMessage(null);
      try {
        const res = await fetch("/api/overview/refresh", {
          method: "POST",
          cache: "no-store",
        });
        const body = (await res.json().catch(() => null)) as {
          status?: string;
          error?: string;
        } | null;
        if (!res.ok) {
          throw new Error(body?.error || `HTTP ${res.status}`);
        }
        setMessage(
          body?.status === "success"
            ? t("overview.refreshOk")
            : t("overview.refreshPartial"),
        );
        router.refresh();
      } catch (err) {
        setMessage(
          err instanceof Error ? err.message : t("overview.refreshFailed"),
        );
      }
    });
  };

  return (
    <header className="shrink-0 border-b border-[var(--border)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.2em] text-[var(--muted)]">
            {t("overview.eyebrow")}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-ui)] text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-4xl">
            {t("overview.title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            {t("overview.lede")}
          </p>
          {message ? (
            <p className="mt-2 text-xs text-[var(--muted)]">{message}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={refreshFeeds}
          disabled={pending}
          className="border border-[var(--accent)] bg-[var(--accent)] px-3 py-2 font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.12em] text-[var(--accent-contrast)] disabled:opacity-50"
        >
          {pending ? t("common.loading") : t("overview.refreshFeeds")}
        </button>
      </div>
    </header>
  );
}
