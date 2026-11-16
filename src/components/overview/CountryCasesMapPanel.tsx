"use client";

import { useState } from "react";
import CountryCasesMap, {
  type MapViewMode,
} from "@/components/map/CountryCasesMap";
import { CountryBriefingPanel } from "@/components/overview/CountryBriefingPanel";
import { useLocale } from "@/components/i18n/LocaleProvider";
import type { CountryCaseCount } from "@/lib/overview";

/** Overview geographic stage — Country choropleth / Pinpoint toggle + dossier. */
export function CountryCasesMapPanel({
  rows,
}: {
  rows: CountryCaseCount[];
}) {
  const { t } = useLocale();
  const [mode, setMode] = useState<MapViewMode>("country");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  return (
    <div className="w-full">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div>
          <h2 className="font-[family-name:var(--font-ui)] text-sm uppercase tracking-[0.08em] text-[var(--text)]">
            {t("overview.mapTitle")}
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {mode === "country"
              ? t("overview.mapCountryHint")
              : t("overview.mapPinpointHint")}
            {" · "}
            Click a country to open its news briefing.
          </p>
        </div>
        <div
          className="flex border border-[var(--border)]"
          role="group"
          aria-label={t("overview.mapTitle")}
        >
          {(["country", "pinpoint"] as const).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={mode === id}
              onClick={() => setMode(id)}
              className={`px-3 py-1.5 font-[family-name:var(--font-ui)] text-[0.6rem] uppercase tracking-[0.12em] transition-colors ${
                mode === id
                  ? "bg-[var(--accent)] text-[var(--accent-contrast)]"
                  : "text-[var(--muted)] hover:text-[var(--text)]"
              }`}
            >
              {id === "country"
                ? t("overview.mapCountry")
                : t("overview.mapPinpoint")}
            </button>
          ))}
        </div>
      </div>
      {/* Full-bleed continuous layer (escapes max-width column) */}
      <div className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2">
        <CountryCasesMap
          rows={rows}
          mode={mode}
          height={680}
          activeCountry={selectedCountry}
          onCountrySelect={setSelectedCountry}
          className="w-full min-h-[32rem] rounded-none border-x-0 sm:min-h-[38rem] lg:min-h-[42rem]"
        />
        <CountryBriefingPanel
          country={selectedCountry}
          onClose={() => setSelectedCountry(null)}
        />
      </div>
    </div>
  );
}
