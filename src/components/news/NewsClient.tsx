"use client";

import { useMemo, useState } from "react";
import { DetailDrawer, DetailField } from "@/components/DetailDrawer";
import { ThreatBadge } from "@/components/ThreatBadge";
import { ColumnChart } from "@/components/viz/ColumnChart";
import { DonutChart } from "@/components/viz/DonutChart";
import { HBarChart } from "@/components/viz/HBarChart";
import { categories, threatLevels } from "@/lib/classification-schema";
import { formatWhen } from "@/lib/format-when";
import type { NewsItem, NewsQueryResult } from "@/lib/news-query";
import { newsTimeline } from "@/lib/news-stats";
import { threatChartColor } from "@/lib/ransomware-stats";

const selectClass =
  "border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--muted)]";

export type NewsClientProps = {
  initial: NewsQueryResult;
};

export function NewsClient({ initial }: NewsClientProps) {
  const [items] = useState<NewsItem[]>(initial.items);
  const [threatFilter, setThreatFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dayFocus, setDayFocus] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const baseFiltered = useMemo(() => {
    return items.filter((item) => {
      const threat = item.classification?.threatLevel ?? "Unclassified";
      const category = item.classification?.category ?? "Unclassified";
      if (threatFilter !== "all" && threat !== threatFilter) return false;
      if (categoryFilter !== "all" && category !== categoryFilter) return false;
      return true;
    });
  }, [items, threatFilter, categoryFilter]);

  const filtered = useMemo(() => {
    if (!dayFocus) return baseFiltered;
    return baseFiltered.filter((item) => {
      const day = String(item.publishedAt || item.createdAt).slice(0, 10);
      return day === dayFocus;
    });
  }, [baseFiltered, dayFocus]);

  const filteredStats = useMemo(() => {
    const byThreat = new Map<string, number>();
    const byCategory = new Map<string, number>();
    const byDay = new Map<string, number>();
    for (const item of baseFiltered) {
      const threat = item.classification?.threatLevel ?? "Unclassified";
      byThreat.set(threat, (byThreat.get(threat) ?? 0) + 1);
      const category = item.classification?.category ?? "Unclassified";
      byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
      const day = String(item.publishedAt || item.createdAt).slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}/.test(day)) {
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
      }
    }
    const threatOrder = [
      "Critical",
      "High",
      "Medium",
      "Low",
      "Info",
      "Unclassified",
    ];
    return {
      byThreat: threatOrder
        .filter((t) => byThreat.has(t))
        .map((t): [string, number] => [t, byThreat.get(t) ?? 0]),
      byCategory: [...byCategory.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10) as [string, number][],
      byDay: newsTimeline(
        [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])),
        30,
      ),
    };
  }, [baseFiltered]);

  const selected = filtered.find((i) => i.id === selectedId) ?? null;
  const classifiedShare =
    items.length > 0
      ? Math.round((initial.stats.classified / items.length) * 100)
      : 0;

  return (
    <main className="mx-auto flex min-h-0 w-full max-w-[96rem] flex-1 flex-col overflow-hidden">
      <header className="shrink-0 border-b border-[var(--border)] px-4 py-4 sm:px-6 lg:px-8">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight sm:text-xl">
          News
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          Malaysia CTI Google News archive — chronological, with keyword hit and
          LLM labels.
        </p>
      </header>

      <div className="flex shrink-0 flex-wrap items-end gap-4 border-b border-[var(--border)] px-4 py-3 sm:px-6 lg:px-8">
        <label className="block">
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Threat
          </span>
          <select
            className={`mt-1.5 block ${selectClass}`}
            value={threatFilter}
            onChange={(e) => {
              setThreatFilter(e.target.value);
              setSelectedId(null);
            }}
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
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Category
          </span>
          <select
            className={`mt-1.5 block ${selectClass}`}
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setSelectedId(null);
            }}
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
          {filtered.length} / {items.length}
          <span className="mx-2 text-[var(--border-strong)]">·</span>
          {classifiedShare}% labeled
        </p>
      </div>

      <div className="ol-scroll-pane min-h-0 flex-1 overflow-auto px-4 py-4 pr-5 sm:px-6 sm:pr-7 lg:px-8 lg:pr-9">
        <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <ColumnChart
            title="Articles over time · 30d"
            rows={filteredStats.byDay}
            empty="No publish dates in window."
            height={132}
            active={dayFocus}
            onSelect={(v) => {
              setDayFocus(v);
              setSelectedId(null);
            }}
          />
          <DonutChart
            title="Threat mix"
            rows={filteredStats.byThreat}
            active={threatFilter === "all" ? "" : threatFilter}
            onSelect={(v) => {
              setThreatFilter(v || "all");
              setSelectedId(null);
            }}
            colorFor={threatChartColor}
            empty="No threat labels."
            size={120}
          />
        </div>

        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <HBarChart
            title="Top categories"
            rows={filteredStats.byCategory}
            active={categoryFilter === "all" ? "" : categoryFilter}
            onSelect={(v) => {
              setCategoryFilter(v || "all");
              setSelectedId(null);
            }}
            empty="No categories."
          />
          <HBarChart
            title="Top sources"
            rows={initial.stats.bySource}
            empty="No sources."
          />
        </div>

        <section aria-label="News archive">
          {filtered.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              No articles match this filter. Run news ingest if the archive is
              empty.
            </p>
          ) : (
            <ol className="border border-[var(--border)] bg-[var(--surface)]">
              {filtered.map((item, i) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`flex w-full flex-col gap-1 border-b border-[var(--border)]/70 px-3 py-3 text-left hover:bg-[var(--surface-raised)] sm:flex-row sm:items-baseline sm:gap-6 ${
                      i % 2 === 1
                        ? "bg-[color-mix(in_oklab,var(--surface-raised)_40%,transparent)]"
                        : ""
                    }`}
                  >
                    <time
                      className="shrink-0 font-mono text-xs tabular-nums text-[var(--muted)] sm:w-40"
                      dateTime={item.publishedAt ?? undefined}
                    >
                      {formatWhen(item.publishedAt)}
                    </time>
                    <div className="min-w-0 flex-1">
                      <ThreatBadge level={item.classification?.threatLevel} />
                      <p className="mt-1 text-sm text-[var(--text)]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {item.classification?.category
                          ? `${item.classification.category} · `
                          : null}
                        {item.keywordHit ? (
                          <span className="font-mono text-[var(--text)]/80">
                            {item.keywordHit}
                          </span>
                        ) : (
                          "—"
                        )}
                        {item.source ? (
                          <>
                            {" · "}
                            <span className="font-mono">{item.source}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

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
