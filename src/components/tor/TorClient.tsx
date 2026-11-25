"use client";

import {
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { formatRelativeWhen, formatWhen } from "@/lib/format-when";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { TorHitRow, TorQueryResult } from "@/lib/tor-query";

export type TorClientProps = {
  initial: TorQueryResult;
};

const STATUS_FILTERS = ["all", "up", "down", "unknown"] as const;

function statusTone(status: TorHitRow["status"]): string {
  if (status === "up") return "var(--ok)";
  if (status === "down") return "var(--threat)";
  return "var(--muted)";
}

function copyText(text: string) {
  void navigator.clipboard?.writeText(text);
}

/** Archive of Apify Tor keyword-search hits (no live .onion browsing). */
export function TorClient({ initial }: TorClientProps) {
  const { t } = useLocale();
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [draftQ, setDraftQ] = useState(initial.q ?? "");
  const [activeQ, setActiveQ] = useState(initial.q ?? "");
  const [status, setStatus] = useState(initial.status || "all");
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback((q: string, statusFilter: string) => {
    startTransition(async () => {
      setError(null);
      try {
        const params = new URLSearchParams({ limit: "500" });
        const trimmed = q.trim();
        if (trimmed) params.set("q", trimmed);
        if (statusFilter && statusFilter !== "all") {
          params.set("status", statusFilter);
        }
        const res = await fetch(`/api/tor?${params}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as TorQueryResult;
        setData(next);
        setActiveQ(next.q ?? trimmed);
        setStatus(next.status || statusFilter);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }, []);

  useEffect(() => {
    setDraftQ(initial.q ?? "");
    setActiveQ(initial.q ?? "");
    setStatus(initial.status || "all");
  }, [initial]);

  const last = data.lastIngest;
  const emptyLabel = activeQ.trim()
    ? t("tor.emptySearch")
    : t("tor.empty");

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.16em] text-[var(--muted)]">
              Tor search
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-ui)] text-lg uppercase tracking-[0.06em] text-[var(--text)]">
              {t("tor.title")}
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">{t("tor.lede")}</p>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-[0.65rem] tabular-nums text-[var(--muted)]">
              {t("tor.sitesStored").replace("{n}", String(data.stats.sites))}
              {" · "}
              {data.stats.up} up · {data.stats.down} down · {data.stats.unknown}{" "}
              unknown
              {last
                ? ` · ${t("tor.lastIngest").replace("{status}", last.status)}`
                : ` · ${t("tor.noIngest")}`}
              {last?.finishedAt ? ` · ${formatWhen(last.finishedAt)}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(activeQ, status)}
            disabled={pending}
            className="border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text)] hover:border-[var(--muted)] disabled:opacity-50"
          >
            {pending ? t("common.loading") : t("tor.refresh")}
          </button>
        </div>

        <form
          className="mt-3 flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            load(draftQ, status);
          }}
        >
          <label className="sr-only" htmlFor="tor-keyword">
            {t("tor.search")}
          </label>
          <input
            id="tor-keyword"
            type="search"
            value={draftQ}
            onChange={(e) => setDraftQ(e.target.value)}
            placeholder={t("tor.searchPlaceholder")}
            className="min-w-[14rem] flex-1 border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-sm text-[var(--text)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={pending}
            className="border border-[var(--accent)] bg-[var(--accent)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] text-[var(--accent-contrast)] disabled:opacity-50"
          >
            {t("tor.search")}
          </button>
          {activeQ.trim() || draftQ.trim() ? (
            <button
              type="button"
              onClick={() => {
                setDraftQ("");
                load("", status);
              }}
              disabled={pending}
              className="border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--text)] disabled:opacity-50"
            >
              {t("tor.clearSearch")}
            </button>
          ) : null}
        </form>

        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label={t("tor.statusFilter")}
        >
          {STATUS_FILTERS.map((id) => {
            const active = status === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={active}
                disabled={pending}
                onClick={() => {
                  setStatus(id);
                  load(activeQ, id);
                }}
                className={`border px-2 py-1 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] ${
                  active
                    ? "border-[var(--accent)] bg-[color-mix(in_oklab,var(--accent)_14%,transparent)] text-[var(--text)]"
                    : "border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {t(`tor.status.${id}`)}
              </button>
            );
          })}
        </div>

        {error ? (
          <p className="mt-2 text-sm text-[var(--threat)]">{error}</p>
        ) : null}
      </header>

      <div className="ol-scroll-pane min-h-0 flex-1 overflow-auto">
        {data.items.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)] sm:px-6">
            {emptyLabel}
          </p>
        ) : (
          <div className="min-w-[56rem]">
            <div className="sticky top-0 z-10 grid grid-cols-[5rem_minmax(12rem,1.2fr)_minmax(12rem,1.4fr)_minmax(14rem,1.8fr)_7rem] gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)] sm:px-6 lg:px-8">
              <span>{t("tor.colStatus")}</span>
              <span>{t("tor.colHost")}</span>
              <span>{t("tor.colTitle")}</span>
              <span>{t("tor.colSnippet")}</span>
              <span className="text-right">{t("tor.colChecked")}</span>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {data.items.map((item) => (
                <li
                  key={item.id}
                  className="grid grid-cols-[5rem_minmax(12rem,1.2fr)_minmax(12rem,1.4fr)_minmax(14rem,1.8fr)_7rem] gap-3 px-4 py-3 sm:px-6 lg:px-8"
                >
                  <span
                    className="font-[family-name:var(--font-ui)] text-[0.65rem] uppercase tracking-[0.1em]"
                    style={{ color: statusTone(item.status) }}
                  >
                    {item.status}
                    {item.statusCode != null ? ` · ${item.statusCode}` : ""}
                  </span>
                  <div className="min-w-0">
                    <p className="break-all font-mono text-xs text-[var(--text)]">
                      {item.host ?? "—"}
                    </p>
                    <p className="mt-1 break-all font-mono text-[0.65rem] text-[var(--muted)]">
                      {item.url}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        copyText(item.url);
                        setCopiedId(item.id);
                        window.setTimeout(() => setCopiedId(null), 1500);
                      }}
                      className="mt-1 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.1em] text-[var(--accent)] hover:underline"
                    >
                      {copiedId === item.id
                        ? t("tor.copied")
                        : t("tor.copyUrl")}
                    </button>
                  </div>
                  <div className="min-w-0">
                    <p className="break-words text-sm text-[var(--text)]">
                      {item.title ?? item.searchTitle ?? "—"}
                    </p>
                    {item.error ? (
                      <p className="mt-0.5 break-words text-xs text-[var(--threat)]">
                        {item.error}
                      </p>
                    ) : item.searchDescription ? (
                      <p className="mt-0.5 break-words whitespace-pre-wrap text-xs text-[var(--muted)]">
                        {item.searchDescription}
                      </p>
                    ) : null}
                  </div>
                  <p className="break-words whitespace-pre-wrap text-xs leading-relaxed text-[var(--muted)]">
                    {item.textSnippet ?? "—"}
                  </p>
                  <span
                    className="text-right font-[family-name:var(--font-ui)] text-[0.65rem] tabular-nums text-[var(--muted)]"
                    title={formatWhen(item.firstSeenAt)}
                  >
                    {formatRelativeWhen(item.firstSeenAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.12em] text-[var(--muted)] sm:px-6 lg:px-8">
        {t("tor.footer")} · {data.total.toLocaleString()} shown
      </footer>
    </main>
  );
}
