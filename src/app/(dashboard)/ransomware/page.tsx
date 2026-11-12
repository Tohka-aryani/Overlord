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

type RansomwareItem = {
  id: number;
  victim: string;
  group: string;
  country: string | null;
  sector: string | null;
  attackDate: string;
  claimUrl: string | null;
  discoveredAt: string;
  classification: Classification | null;
};

type ApiResponse = {
  country: string;
  count: number;
  items: RansomwareItem[];
};

type Scope = "MY" | "ALL";

const selectClass =
  "border border-[var(--border)] bg-[var(--bg)] px-2 py-1.5 text-sm text-[var(--text)] outline-none focus:border-[var(--muted)]";

export default function RansomwarePage() {
  const [scope, setScope] = useState<Scope>("MY");
  const [items, setItems] = useState<RansomwareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [threatFilter, setThreatFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = useCallback(async (nextScope: Scope) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ransomware?country=${nextScope}`, {
        cache: "no-store",
      });
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
    void load(scope);
  }, [scope, load]);

  // Clear drawer when scope/filters change so a stale selection cannot reopen.
  useEffect(() => {
    setSelectedId(null);
  }, [scope, threatFilter, categoryFilter]);

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
        <h1 className="text-xl font-semibold tracking-tight">Ransomware</h1>
        <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
          ransomware.live archive — table first, MY by default. Claim URLs stay
          text-only (never fetched).
        </p>
      </header>

      <div className="flex flex-wrap items-end gap-6 border-b border-[var(--border)] px-8 py-4">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
            Country
          </p>
          <div className="mt-1.5 flex gap-3" role="group" aria-label="Country scope">
            <button
              type="button"
              onClick={() => setScope("MY")}
              className={`font-mono text-xs uppercase tracking-wider ${
                scope === "MY"
                  ? "text-[var(--threat)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              aria-pressed={scope === "MY"}
            >
              MY
            </button>
            <button
              type="button"
              onClick={() => setScope("ALL")}
              className={`font-mono text-xs uppercase tracking-wider ${
                scope === "ALL"
                  ? "text-[var(--threat)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
              aria-pressed={scope === "ALL"}
            >
              Global
            </button>
          </div>
        </div>

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

      <section aria-label="Ransomware victims" className="flex min-h-0 flex-1 flex-col px-8 py-5">
        {error ? (
          <p className="text-sm text-[var(--threat)]">Archive error: {error}</p>
        ) : loading && items.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Loading archive…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No victims match this scope and filter. Run ransomware ingest if the
            archive is empty.
          </p>
        ) : (
          <div className="overflow-x-auto border-t border-[var(--border)]">
            <table className="w-full min-w-[48rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-[0.7rem] uppercase tracking-[0.12em] text-[var(--muted)]">
                  <th className="py-3 pr-4 font-medium">Threat</th>
                  <th className="py-3 pr-4 font-medium">Victim</th>
                  <th className="py-3 pr-4 font-medium">Group</th>
                  <th className="py-3 pr-4 font-medium">Country</th>
                  <th className="py-3 pr-4 font-medium">Sector</th>
                  <th className="py-3 font-medium">Attack</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    className="cursor-pointer border-b border-[var(--border)]/70 hover:bg-[var(--surface)]/50"
                    onClick={() => setSelectedId(item.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedId(item.id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`Open detail for ${item.victim}`}
                  >
                    <td className="py-3 pr-4 align-top">
                      <ThreatBadge level={item.classification?.threatLevel} />
                    </td>
                    <td className="py-3 pr-4 align-top text-[var(--text)]">
                      {item.victim}
                      {item.classification?.category ? (
                        <p className="mt-0.5 text-xs text-[var(--muted)]">
                          {item.classification.category}
                        </p>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 align-top font-mono text-xs text-[var(--muted)]">
                      {item.group}
                    </td>
                    <td className="py-3 pr-4 align-top font-mono text-xs uppercase tracking-wide text-[var(--muted)]">
                      {item.country ?? "—"}
                    </td>
                    <td className="py-3 pr-4 align-top text-xs text-[var(--muted)]">
                      {item.classification?.sector ?? item.sector ?? "—"}
                    </td>
                    <td className="py-3 align-top font-mono text-xs tabular-nums text-[var(--muted)]">
                      {formatWhen(item.attackDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <DetailDrawer
        open={selected != null}
        title={selected?.victim ?? "Victim"}
        onClose={() => setSelectedId(null)}
      >
        {selected ? (
          <dl>
            <DetailField label="Group" mono>
              {selected.group}
            </DetailField>
            <DetailField label="Country" mono>
              {selected.country ?? "—"}
            </DetailField>
            <DetailField label="Sector">
              {selected.classification?.sector ?? selected.sector ?? "—"}
            </DetailField>
            <DetailField label="Attack date" mono>
              {formatWhen(selected.attackDate)}
            </DetailField>
            <DetailField label="Discovered" mono>
              {formatWhen(selected.discoveredAt)}
            </DetailField>
            <DetailField label="Claim URL (text only — never fetched)" mono>
              {selected.claimUrl?.trim() || "—"}
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
