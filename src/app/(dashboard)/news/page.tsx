"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DetailDrawer, DetailField } from "@/components/DetailDrawer";
import { ThreatBadge } from "@/components/ThreatBadge";
import { categories, threatLevels } from "@/lib/classification-schema";
import { formatWhen } from "@/lib/format-when";

type Classification = {
  id: number;
  threatLevel: string;
  category: string;
  malaysiaRelevance: string;
  sector: string | null;
  confidence: number | null;
  rationale: string | null;
  model: string | null;
  classifiedAt: string;
};

type NewsItem = {
  id: number;
  title: string;
  link: string;
  publishedAt: string | null;
  source: string | null;
  keywordHit: string | null;
  summary: string | null;
  createdAt: string;
  classification: Classification | null;
};

type ApiResponse = {
  count: number;
  items: NewsItem[];
};

const selectClass =
  "border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--muted)]";

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threatFilter, setThreatFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/news", { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as ApiResponse;
      setItems(data.items);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : "Failed to load archive");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const threat = item.classification?.threatLevel ?? "Unclassified";
      const category = item.classification?.category ?? "Unclassified";
      if (threatFilter !== "all" && threat !== threatFilter) return false;
      if (categoryFilter !== "all" && category !== categoryFilter) return false;
      return true;
    });
  }, [items, threatFilter, categoryFilter]);

  const selected = filtered.find((i) => i.id === selectedId) ?? null;

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-[var(--border)] px-8 py-5">
        <h1 className="text-xl font-semibold tracking-tight">News</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Malaysia CTI Google News archive — chronological, with keyword hit and
          LLM labels.
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-6 border-b border-[var(--border)] px-8 py-4">
        <label className="block">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Threat
          </span>
          <select
            className={`mt-1.5 block ${selectClass}`}
            value={threatFilter}
            onChange={(e) => setThreatFilter(e.target.value)}
          >
            <option value="all">All</option>
            {threatLevels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
            <option value="Unclassified">Unclassified</option>
          </select>
        </label>

        <label className="block">
          <span className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Category
          </span>
          <select
            className={`mt-1.5 block ${selectClass}`}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
            <option value="Unclassified">Unclassified</option>
          </select>
        </label>

        <p className="ml-auto font-mono text-xs tabular-nums text-[var(--muted)]">
          {loading ? "Loading…" : `${filtered.length} / ${items.length}`}
        </p>
      </div>

      <section aria-label="News archive" className="flex min-h-0 flex-1 flex-col px-8 py-5">
        {error ? (
          <p className="text-sm text-[var(--threat)]">Archive error: {error}</p>
        ) : loading && items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Loading archive…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No articles match this filter. Run news ingest if the archive is
            empty.
          </p>
        ) : (
          <ol className="border-t border-[var(--border)]">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className="flex w-full flex-col gap-1 border-b border-[var(--border)]/70 py-4 text-left hover:bg-[var(--surface)]/50 sm:flex-row sm:items-baseline sm:gap-6"
                >
                  <time
                    className="shrink-0 font-mono text-xs tabular-nums text-[var(--muted)] sm:w-40"
                    dateTime={item.publishedAt ?? undefined}
                  >
                    {formatWhen(item.publishedAt)}
                  </time>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <ThreatBadge level={item.classification?.threatLevel} />
                      {item.classification?.category ? (
                        <span className="text-xs text-[var(--muted)]">
                          {item.classification.category}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-[var(--text)]">{item.title}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {item.keywordHit ? (
                        <>
                          Keyword{" "}
                          <span className="font-mono text-[var(--text)]/80">
                            {item.keywordHit}
                          </span>
                        </>
                      ) : (
                        "No keyword recorded"
                      )}
                      {item.source ? (
                        <>
                          {" · "}
                          <span className="font-mono">{item.source}</span>
                        </>
                      ) : null}
                      {item.classification?.malaysiaRelevance ? (
                        <> · {item.classification.malaysiaRelevance}</>
                      ) : null}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <DetailDrawer
        open={selected != null}
        title={selected?.title ?? "Article"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <dl>
            <DetailField label="Published" mono>
              {formatWhen(selected.publishedAt)}
            </DetailField>
            <DetailField label="Source" mono>
              {selected.source ?? "—"}
            </DetailField>
            <DetailField label="Keyword hit" mono>
              {selected.keywordHit ?? "—"}
            </DetailField>
            <DetailField label="Summary">
              {selected.summary?.trim() || "—"}
            </DetailField>
            <DetailField label="Link" mono>
              <a
                href={selected.link}
                target="_blank"
                rel="noopener noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {selected.link}
              </a>
            </DetailField>
            <DetailField label="Archived" mono>
              {formatWhen(selected.createdAt)}
            </DetailField>
            <DetailField label="Threat">
              <ThreatBadge level={selected.classification?.threatLevel} />
            </DetailField>
            <DetailField label="Category">
              {selected.classification?.category ?? "—"}
            </DetailField>
            <DetailField label="Malaysia relevance">
              {selected.classification?.malaysiaRelevance ?? "—"}
            </DetailField>
            <DetailField label="Sector">
              {selected.classification?.sector ?? "—"}
            </DetailField>
            <DetailField label="Confidence" mono>
              {selected.classification?.confidence != null
                ? String(selected.classification.confidence)
                : "—"}
            </DetailField>
            <DetailField label="Rationale">
              {selected.classification?.rationale ?? "—"}
            </DetailField>
            <DetailField label="Model" mono>
              {selected.classification?.model ?? "—"}
            </DetailField>
            <DetailField label="Classified" mono>
              {formatWhen(selected.classification?.classifiedAt)}
            </DetailField>
          </dl>
        ) : null}
      </DetailDrawer>
    </main>
  );
}
