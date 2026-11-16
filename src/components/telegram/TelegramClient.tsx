"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { formatRelativeWhen, formatWhen } from "@/lib/format-when";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { TelegramQueryResult } from "@/lib/telegram-query";

export type TelegramClientProps = {
  initial: TelegramQueryResult;
};

function logStamp(iso: string | null): string {
  if (!iso) return "-------- --:--:--";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-------- --:--:--";
  const y = d.getUTCFullYear();
  const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
  const da = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  const ss = String(d.getUTCSeconds()).padStart(2, "0");
  return `${y}-${mo}-${da} ${hh}:${mm}:${ss}`;
}

/** Ops log stream — industrial console fit for Overlord themes. */
export function TelegramClient({ initial }: TelegramClientProps) {
  const { t } = useLocale();
  const [data, setData] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState<number | null>(null);

  const refresh = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch(
          `/api/telegram?channel=${encodeURIComponent(data.channel)}&limit=300`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as TelegramQueryResult;
        setData(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }, [data.channel]);

  const entries = useMemo(() => {
    return [...data.items].sort((a, b) => {
      const ta = new Date(a.postedAt ?? a.createdAt).getTime();
      const tb = new Date(b.postedAt ?? b.createdAt).getTime();
      return tb - ta; // newest first — log console
    });
  }, [data.items]);

  const last = data.lastIngest;
  const meta = t("telegram.postsStored").replace("{n}", String(data.total));
  const ingestLine = last
    ? t("telegram.lastIngest").replace("{status}", last.status)
    : t("telegram.noIngest");

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.16em] text-[var(--muted)]">
              Channel log
            </p>
            <h1 className="mt-1 font-[family-name:var(--font-ui)] text-lg uppercase tracking-[0.06em] text-[var(--text)]">
              @{data.channel}
            </h1>
            <p className="mt-1 font-[family-name:var(--font-ui)] text-[0.65rem] tabular-nums text-[var(--muted)]">
              {meta}
              {" · "}
              {ingestLine}
              {last?.finishedAt ? ` · ${formatWhen(last.finishedAt)}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://t.me/${data.channel}`}
              target="_blank"
              rel="noreferrer"
              className="border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] text-[var(--accent)] hover:border-[var(--accent)]"
            >
              {t("telegram.open")}
            </a>
            <button
              type="button"
              onClick={refresh}
              disabled={pending}
              className="border border-[var(--border)] bg-[var(--bg)] px-3 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] text-[var(--text)] hover:border-[var(--muted)] disabled:opacity-50"
            >
              {pending ? t("common.loading") : t("telegram.refresh")}
            </button>
          </div>
        </div>
        {error ? (
          <p className="mt-2 text-sm text-[var(--threat)]">{error}</p>
        ) : null}
      </header>

      <div className="ol-tg-log ol-scroll-pane min-h-0 flex-1 overflow-auto">
        {entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-[var(--muted)] sm:px-6">
            {t("telegram.empty")}
          </p>
        ) : (
          <div className="min-w-[40rem]">
            <div className="ol-tg-log-head sticky top-0 z-10 grid grid-cols-[11.5rem_5.5rem_minmax(0,1fr)_4.5rem] gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-4 py-2 pr-6 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)] sm:px-6 sm:pr-8 lg:px-8 lg:pr-10">
              <span>Time</span>
              <span>Msg ID</span>
              <span>Message log</span>
              <span className="text-right">Age</span>
            </div>
            <ul className="divide-y divide-[var(--border)]">
              {entries.map((item, i) => {
                const open = expanded === item.id;
                const stamp = logStamp(item.postedAt ?? item.createdAt);
                const preview =
                  item.text.length > 160 && !open
                    ? `${item.text.slice(0, 160)}…`
                    : item.text;
                return (
                  <li
                    key={item.id}
                    className={`ol-tg-log-row grid grid-cols-[11.5rem_5.5rem_minmax(0,1fr)_4.5rem] gap-3 px-4 py-2.5 pr-6 sm:px-6 sm:pr-8 lg:px-8 lg:pr-10 ${
                      i % 2 === 1 ? "ol-tg-log-row--alt" : ""
                    }`}
                  >
                    <time
                      className="font-[family-name:var(--font-ui)] text-[0.7rem] tabular-nums text-[var(--muted)]"
                      dateTime={item.postedAt ?? undefined}
                      title={formatWhen(item.postedAt ?? item.createdAt)}
                    >
                      {stamp}
                    </time>
                    <a
                      href={item.postUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-[family-name:var(--font-ui)] text-[0.7rem] tabular-nums text-[var(--accent)] hover:underline"
                    >
                      #{item.messageId}
                    </a>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(open ? null : item.id)
                        }
                        className="block w-full cursor-pointer text-left"
                      >
                        <pre className="ol-tg-log-payload whitespace-pre-wrap break-words">
                          {preview}
                        </pre>
                      </button>
                      {item.mediaUrl ? (
                        <p className="mt-1 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.1em] text-[var(--muted)]">
                          {item.mediaKind ?? "media"} ·{" "}
                          <a
                            href={item.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--accent)] hover:underline"
                          >
                            {t("telegram.open")}
                          </a>
                        </p>
                      ) : null}
                    </div>
                    <span
                      className="text-right font-[family-name:var(--font-ui)] text-[0.65rem] tabular-nums text-[var(--muted)]"
                      title={formatWhen(item.postedAt ?? item.createdAt)}
                    >
                      {formatRelativeWhen(item.postedAt ?? item.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <footer className="shrink-0 border-t border-[var(--border)] bg-[var(--surface)] px-4 py-2 font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.12em] text-[var(--muted)] sm:px-6 lg:px-8">
        {t("telegram.archiveOnly")} · newest first
      </footer>
    </main>
  );
}
