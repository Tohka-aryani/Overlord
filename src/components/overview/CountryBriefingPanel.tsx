"use client";

import { useEffect, useState } from "react";
import { formatRelativeWhen, formatWhen } from "@/lib/format-when";
import { countryLabel } from "@/lib/geo/country-names";
import type { CountryBriefingResult } from "@/lib/country-briefing";
import { resolveOpenableSourceUrl } from "@/lib/source-links";

type CountryBriefingPanelProps = {
  country: string | null;
  onClose: () => void;
};

/** Professional country dossier: top-5 news + Ollama briefing. */
export function CountryBriefingPanel({
  country,
  onClose,
}: CountryBriefingPanelProps) {
  const [data, setData] = useState<CountryBriefingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!country) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    void (async () => {
      try {
        const res = await fetch(
          `/api/overview/country-briefing?country=${encodeURIComponent(country)}`,
          { cache: "no-store" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as CountryBriefingResult;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [country]);

  if (!country) return null;

  const name = data?.countryName ?? countryLabel(country);

  return (
    <aside
      className="border-t border-[var(--border)] bg-[var(--surface)]"
      aria-label={`${name} country briefing`}
    >
      <div className="mx-auto grid max-w-[96rem] gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section className="border-b border-[var(--border)] px-4 py-5 sm:px-6 lg:border-b-0 lg:border-r lg:px-8">
          <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.16em] text-[var(--muted)]">
                Country dossier
              </p>
              <h3 className="mt-1 font-[family-name:var(--font-ui)] text-xl uppercase tracking-[0.04em] text-[var(--text)]">
                {name}{" "}
                <span className="text-[var(--accent)]">{country}</span>
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                Top news mentions + ransomware victims tagged to this ISO.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="border border-[var(--border)] px-2.5 py-1 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)] hover:text-[var(--text)]"
            >
              Close
            </button>
          </header>

          {loading ? (
            <p className="text-sm text-[var(--muted)]">
              Assembling briefing via Ollama…
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-[var(--threat)]">{error}</p>
          ) : null}
          {data?.error ? (
            <p className="mb-3 text-xs text-[var(--threat)]">{data.error}</p>
          ) : null}

          {data?.briefing ? (
            <div className="border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4 shadow-[var(--inset-hairline)]">
              <p className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.14em] text-[var(--accent)]">
                Intelligence briefing
                {data.briefing.model ? ` · ${data.briefing.model}` : ""}
              </p>
              <h4 className="mt-2 font-[family-name:var(--font-ui)] text-base text-[var(--text)]">
                {data.briefing.headline}
              </h4>
              {data.briefing.bullets.length > 0 ? (
                <ul className="mt-3 space-y-2">
                  {data.briefing.bullets.map((b) => (
                    <li
                      key={b}
                      className="relative pl-3 text-sm leading-relaxed text-[var(--text)] before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:bg-[var(--accent)] before:content-['']"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              ) : null}
              {data.briefing.outlook ? (
                <p className="mt-4 border-t border-[var(--border)] pt-3 text-sm text-[var(--muted)]">
                  <span className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.12em] text-[var(--accent)]">
                    Outlook ·{" "}
                  </span>
                  {data.briefing.outlook}
                </p>
              ) : null}
            </div>
          ) : !loading ? (
            <p className="text-sm text-[var(--muted)]">
              No briefing generated — check archive coverage or Ollama.
            </p>
          ) : null}
        </section>

        <section className="px-4 py-5 sm:px-6 lg:px-8">
          <p className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Top news · {data?.news.length ?? 0}/5
          </p>
          {!loading && (data?.news.length ?? 0) === 0 ? (
            <p className="mt-3 text-sm text-[var(--muted)]">
              No archive news mentioning {name}.
            </p>
          ) : (
            <ol className="mt-3 space-y-0 divide-y divide-[var(--border)] border border-[var(--border)]">
              {(data?.news ?? []).map((item, i) => (
                <li key={item.id} className="bg-[var(--bg)] px-3 py-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-[family-name:var(--font-ui)] text-[0.65rem] tabular-nums text-[var(--accent)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noreferrer"
                      className="min-w-0 flex-1 text-sm text-[var(--text)] hover:text-[var(--accent)] hover:underline"
                    >
                      {item.title}
                    </a>
                  </div>
                  <p className="mt-1 pl-7 font-[family-name:var(--font-ui)] text-[0.6rem] tabular-nums text-[var(--muted)]">
                    {item.source ?? "source"}
                    {item.publishedAt
                      ? ` · ${formatRelativeWhen(item.publishedAt)}`
                      : ""}
                    {item.publishedAt
                      ? ` · ${formatWhen(item.publishedAt)}`
                      : ""}
                  </p>
                </li>
              ))}
            </ol>
          )}

          {(data?.victims.length ?? 0) > 0 ? (
            <div className="mt-5">
              <p className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
                Ransomware victims · {country}
              </p>
              <ul className="mt-2 space-y-1.5">
                {data!.victims.slice(0, 6).map((v) => (
                  <li
                    key={v.id}
                    className="flex flex-wrap items-baseline justify-between gap-2 text-xs text-[var(--muted)]"
                  >
                    <span className="text-[var(--text)]">{v.victim}</span>
                    <span className="font-[family-name:var(--font-ui)] tabular-nums">
                      {v.group} · {v.attackDate}
                      {(() => {
                        const openable = resolveOpenableSourceUrl({
                          victim: v.victim,
                          group: v.group,
                          source: v.source,
                          sources: v.sources,
                          claimUrl: v.claimUrl,
                        });
                        if (!openable) return null;
                        return (
                          <>
                            {" · "}
                            <a
                              href={openable.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[var(--accent)] hover:underline"
                            >
                              {openable.label}
                            </a>
                          </>
                        );
                      })()}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </aside>
  );
}
