"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRY_COORDS } from "@/lib/geo/country-centroids";
import { isDarkTheme, useTheme } from "@/components/theme/ThemeProvider";
import type {
  GeoJSON as LeafletGeoJSON,
  LayerGroup,
  Map as LeafletMap,
  Marker,
  PathOptions,
  TileLayer,
} from "leaflet";

export type CountryCasePoint = {
  country: string;
  count: number;
};

export type MapViewMode = "country" | "pinpoint";

type CountryCasesMapProps = {
  rows: CountryCasePoint[];
  mode?: MapViewMode;
  className?: string;
  height?: number;
  /** Selected ISO2 (controlled). */
  activeCountry?: string | null;
  onCountrySelect?: (iso: string | null) => void;
};

const MY_CENTER: [number, number] = COUNTRY_COORDS.MY
  ? [COUNTRY_COORDS.MY[0], COUNTRY_COORDS.MY[1]]
  : [4.21, 101.97];

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

const GEO_URL = "/geo/countries-110m.geojson";

/** ~degrees — pins closer than this share a combined cluster design. */
const CLUSTER_DEG = 4.5;

function isoFromFeature(props: Record<string, unknown> | null | undefined): string {
  if (!props) return "";
  const raw =
    props.ISO_A2 ??
    props.ISO_A2_EH ??
    props.WB_A2 ??
    props.iso_a2 ??
    "";
  const iso = String(raw).trim().toUpperCase();
  if (!iso || iso === "-99" || iso === "NULL") return "";
  return iso;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

/** Continuous green → yellow → red (red = highest). */
function heatFill(t: number): string {
  const x = Math.max(0, Math.min(1, t));
  if (x <= 0) return "#1a222d";
  const stops: [number, string][] = [
    [0, "#15803d"],
    [0.35, "#a3e635"],
    [0.55, "#facc15"],
    [0.75, "#f97316"],
    [1, "#dc2626"],
  ];
  let i = 0;
  while (i < stops.length - 2 && x > stops[i + 1]![0]) i += 1;
  const a = stops[i]!;
  const b = stops[i + 1]!;
  const local = (x - a[0]) / Math.max(0.0001, b[0] - a[0]);
  const [ar, ag, ab] = hexToRgb(a[1]);
  const [br, bg, bb] = hexToRgb(b[1]);
  return `rgb(${lerp(ar, br, local)}, ${lerp(ag, bg, local)}, ${lerp(ab, bb, local)})`;
}

type MapPoint = {
  country: string;
  count: number;
  lat: number;
  lon: number;
};

type PinCluster = {
  id: string;
  lat: number;
  lon: number;
  count: number;
  countries: string[];
  combined: boolean;
};

function buildClusters(points: MapPoint[]): PinCluster[] {
  const used = new Set<string>();
  const out: PinCluster[] = [];

  for (const p of points) {
    if (used.has(p.country)) continue;
    const near = points.filter(
      (q) =>
        !used.has(q.country) &&
        Math.hypot(q.lat - p.lat, q.lon - p.lon) <= CLUSTER_DEG,
    );
    for (const q of near) used.add(q.country);
    const count = near.reduce((s, q) => s + q.count, 0);
    const lat = near.reduce((s, q) => s + q.lat, 0) / near.length;
    const lon = near.reduce((s, q) => s + q.lon, 0) / near.length;
    out.push({
      id: near
        .map((q) => q.country)
        .sort()
        .join("+"),
      lat,
      lon,
      count,
      countries: near.map((q) => q.country).sort(),
      combined: near.length > 1,
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

/**
 * Cases-by-country map.
 * Country = choropleth layer only. Pinpoint = interactive pins (combined design when close).
 */
export default function CountryCasesMap({
  rows,
  mode = "country",
  className = "",
  height = 320,
  activeCountry = null,
  onCountrySelect,
}: CountryCasesMapProps) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const pinLayerRef = useRef<LayerGroup | null>(null);
  const geoLayerRef = useRef<LeafletGeoJSON | null>(null);
  const tilesRef = useRef<TileLayer | null>(null);
  const geoCache = useRef<object | null>(null);
  const fittedKeyRef = useRef<string>("");
  const selectCb = useRef(onCountrySelect);
  selectCb.current = onCountrySelect;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [internalActive, setInternalActive] = useState<string | null>(null);
  const active = activeCountry ?? internalActive;

  const setActive = (iso: string | null | ((prev: string | null) => string | null)) => {
    const next =
      typeof iso === "function" ? iso(active) : iso;
    // Prefer single ISO for briefing (strip combo ids).
    const briefIso =
      next && !next.includes("+") ? next : next?.split("+")[0] ?? null;
    setInternalActive(briefIso);
    selectCb.current?.(briefIso);
  };

  const countByIso = useMemo(() => {
    const m = new Map<string, number>();
    for (const row of rows) {
      const iso = row.country.trim().toUpperCase();
      if (!iso || iso === "??" || iso === "UNKNOWN") continue;
      m.set(iso, (m.get(iso) ?? 0) + row.count);
    }
    return m;
  }, [rows]);

  const points = useMemo(() => {
    const out: MapPoint[] = [];
    for (const [iso, count] of countByIso) {
      const coords = COUNTRY_COORDS[iso];
      if (!coords || count <= 0) continue;
      out.push({
        country: iso,
        count,
        lat: coords[0],
        lon: coords[1],
      });
    }
    return out.sort((a, b) => b.count - a.count);
  }, [countByIso]);

  const clusters = useMemo(() => buildClusters(points), [points]);

  const max = Math.max(1, ...[...countByIso.values()]);
  const total = points.reduce((s, p) => s + p.count, 0);
  const archive = rows.reduce((s, r) => s + r.count, 0);
  const unmapped = archive - total;

  const focus = useMemo(() => {
    if (active?.includes("+")) {
      const c = clusters.find((x) => x.id === active);
      if (c) {
        return {
          label: c.countries.join(" · "),
          count: c.count,
        };
      }
    }
    const p =
      (active ? points.find((x) => x.country === active) : null) ??
      points[0] ??
      null;
    return p
      ? { label: p.country, count: p.count }
      : null;
  }, [active, clusters, points]);

  // Create map once
  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    let cancelled = false;
    let map: LeafletMap | null = null;

    void (async () => {
      try {
        const leaflet = await import("leaflet");
        const L = leaflet.default;
        if (cancelled || !hostRef.current) return;

        map = L.map(hostRef.current, {
          zoomControl: true,
          attributionControl: true,
          scrollWheelZoom: true,
          worldCopyJump: false,
          maxBounds: [
            [-85, -180],
            [85, 180],
          ],
          maxBoundsViscosity: 0.85,
        });
        mapRef.current = map;
        pinLayerRef.current = L.layerGroup().addTo(map);

        tilesRef.current = L.tileLayer(OSM_URL, {
          attribution: OSM_ATTR,
          maxZoom: 19,
          noWrap: true,
          className: isDarkTheme(theme) ? "ol-tiles--night" : undefined,
        }).addTo(map);

        map.setView([20, 10], 2);
        setStatus("ready");
        window.setTimeout(() => {
          try {
            map?.invalidateSize({ animate: false });
          } catch {
            /* torn down */
          }
        }, 80);
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
      pinLayerRef.current = null;
      geoLayerRef.current = null;
      if (map) map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Theme tile swap
  useEffect(() => {
    const map = mapRef.current;
    if (!map || status !== "ready") return;
    let cancelled = false;
    void import("leaflet").then((leaflet) => {
      if (cancelled) return;
      const L = leaflet.default;
      if (tilesRef.current) {
        try {
          map.removeLayer(tilesRef.current);
        } catch {
          /* ignore */
        }
      }
      tilesRef.current = L.tileLayer(OSM_URL, {
        attribution: OSM_ATTR,
        maxZoom: 19,
        className: isDarkTheme(theme) ? "ol-tiles--night" : undefined,
      }).addTo(map);
    });
    return () => {
      cancelled = true;
    };
  }, [theme, status]);

  // Layers
  useEffect(() => {
    const map = mapRef.current;
    const pins = pinLayerRef.current;
    if (!map || !pins || status !== "ready") return;
    let cancelled = false;

    void (async () => {
      try {
        const leaflet = await import("leaflet");
        const L = leaflet.default;
        if (cancelled) return;

        if (!geoCache.current) {
          const res = await fetch(GEO_URL);
          if (!res.ok) throw new Error(`GeoJSON HTTP ${res.status}`);
          geoCache.current = (await res.json()) as object;
        }
        if (cancelled) return;

        const stroke = "#3a4450";
        const accent = getComputedStyle(document.documentElement)
          .getPropertyValue("--accent")
          .trim() || "#e07a3a";

        if (geoLayerRef.current) {
          try {
            map.removeLayer(geoLayerRef.current);
          } catch {
            /* ignore */
          }
          geoLayerRef.current = null;
        }

        pins.clearLayers();

        if (mode === "country") {
          const styleFor = (iso: string): PathOptions => {
            const n = countByIso.get(iso) ?? 0;
            const t = n > 0 ? Math.pow(n / max, 0.45) : 0;
            const selected = active === iso;
            return {
              fillColor: heatFill(t),
              fillOpacity: n > 0 ? 0.92 : 0.28,
              color: selected ? accent : stroke,
              weight: selected ? 2 : 0.7,
              opacity: 1,
            };
          };

          const layer = L.geoJSON(geoCache.current as never, {
            style: (feat) => {
              const iso = isoFromFeature(
                feat?.properties as Record<string, unknown>,
              );
              return styleFor(iso);
            },
            onEachFeature: (feat, lyr) => {
              const iso = isoFromFeature(
                feat.properties as Record<string, unknown>,
              );
              if (!iso) return;
              const n = countByIso.get(iso) ?? 0;
              const name =
                (feat.properties as { NAME?: string; ADMIN?: string })?.NAME ??
                (feat.properties as { ADMIN?: string })?.ADMIN ??
                iso;
              lyr.bindTooltip(
                `<strong>${name}</strong> (${iso})<br/><span style="color:${heatFill(n > 0 ? Math.pow(n / max, 0.45) : 0)}">${n}</span> case${n === 1 ? "" : "s"}`,
                { sticky: true, className: "ol-leaflet-popup" },
              );
              lyr.on({
                click: () => setActive((prev) => (prev === iso ? null : iso)),
                mouseover: (e) => {
                  const t = e.target as { setStyle?: (o: PathOptions) => void };
                  t.setStyle?.({
                    weight: 2,
                    color: accent,
                    fillOpacity: 1,
                  });
                },
                mouseout: (e) => {
                  const t = e.target as { setStyle?: (o: PathOptions) => void };
                  t.setStyle?.(styleFor(iso));
                },
              });
            },
          });
          layer.addTo(map);
          geoLayerRef.current = layer;
        } else {
          // Pinpoint: faint country outlines only (no heat fill) + interactive pins
          const layer = L.geoJSON(geoCache.current as never, {
            style: {
              fillColor: "#0e141c",
              fillOpacity: 0.35,
              color: "#2a3440",
              weight: 0.5,
              opacity: 0.85,
            },
            interactive: false,
          });
          layer.addTo(map);
          geoLayerRef.current = layer;

          for (const c of clusters) {
            const intensity = Math.pow(c.count / max, 0.45);
            const fill = heatFill(Math.max(0.2, intensity));
            const selected =
              active === c.id ||
              (active != null && c.countries.includes(active));
            const size = c.combined
              ? 34 + Math.min(16, Math.round(Math.log2(c.countries.length + 1) * 7))
              : 22 + Math.min(10, Math.round(intensity * 12));

            const label = c.combined
              ? String(c.countries.length)
              : c.count > 99
                ? "99+"
                : String(c.count);

            const html = `<button type="button" class="ol-case-pin ${
              c.combined ? "ol-case-pin--combo" : "ol-case-pin--solo"
            }${selected ? " is-active" : ""}${
              !c.combined && c.countries[0] === "MY" ? " ol-case-pin--my" : ""
            }" style="--pin-fill:${fill};width:${size}px;height:${size}px" aria-label="${c.countries.join(", ")}: ${c.count}">
                <span class="ol-case-pin__halo"></span>
                <span class="ol-case-pin__disc"></span>
                <span class="ol-case-pin__n">${label}</span>
              </button>`;

            const icon = L.divIcon({
              className: "ol-case-pin-wrap",
              html,
              iconSize: [size, size],
              iconAnchor: [size / 2, size / 2],
            });

            const marker: Marker = L.marker([c.lat, c.lon], {
              icon,
              riseOnHover: true,
              zIndexOffset: selected ? 600 : c.combined ? 400 : 200,
            });

            const tip = c.combined
              ? `<strong>${c.countries.length} nearby</strong><br/>${c.countries.join(", ")}<br/>${c.count} cases · click to focus`
              : `<strong>${c.countries[0]}</strong><br/>${c.count} case${c.count === 1 ? "" : "s"}`;

            marker.bindTooltip(tip, {
              direction: "top",
              offset: [0, -size / 2 - 4],
              opacity: 0.95,
              className: "ol-leaflet-popup",
            });

            marker.on("click", () => {
              const primary = c.countries[0] ?? null;
              setActive((prev) =>
                prev === primary || prev === c.id ? null : primary,
              );
              try {
                map.flyTo(
                  [c.lat, c.lon],
                  c.combined
                    ? Math.max(map.getZoom(), 5)
                    : Math.max(map.getZoom(), 4),
                  { duration: 0.4 },
                );
              } catch {
                /* ignore */
              }
            });

            marker.addTo(pins);
          }
        }

        // Fit once per mode/data — full country layer so the stage isn't cropped.
        const fitKey = `${mode}:${points.length}:${max}`;
        if (fittedKeyRef.current !== fitKey) {
          fittedKeyRef.current = fitKey;
          try {
            const layerBounds = geoLayerRef.current?.getBounds();
            if (layerBounds?.isValid()) {
              map.fitBounds(layerBounds.pad(0.02), {
                animate: false,
                maxZoom: 3,
              });
            } else if (points.length > 0) {
              map.fitBounds(
                L.latLngBounds(
                  points.map((p) => [p.lat, p.lon] as [number, number]),
                ).pad(0.55),
                { maxZoom: 4, animate: false },
              );
            } else {
              map.setView([20, 10], 2);
            }
          } catch {
            map.setView([20, 10], 2);
          }
        }

        window.setTimeout(() => {
          try {
            map.invalidateSize({ animate: false });
          } catch {
            /* ignore */
          }
        }, 60);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, mode, countByIso, points, clusters, max, active, theme]);

  return (
    <div
      className={`ol-actor-map relative w-full overflow-hidden border border-[var(--border)] bg-[var(--surface)] ${className}`}
      style={{ height, minHeight: height }}
    >
      <div ref={hostRef} className="absolute inset-0 z-0" />

      <div className="pointer-events-none absolute bottom-2 left-2 z-[500] max-w-[15rem] border border-[var(--border)] bg-[var(--surface-raised)]/95 px-2.5 py-2 shadow-[var(--inset-hairline)]">
        <p className="font-[family-name:var(--font-ui)] text-[0.55rem] uppercase tracking-[0.12em] text-[var(--muted)]">
          {mode === "country" ? "Layer · cases" : "Pinpoint · interactive"} ·{" "}
          {total} mapped
          {unmapped > 0 ? ` · ${unmapped} unmapped` : ""}
        </p>
        {focus ? (
          <p className="mt-1 font-[family-name:var(--font-ui)] text-[0.75rem] text-[var(--text)]">
            <span className="text-[var(--accent)]">{focus.label}</span>{" "}
            <span className="tabular-nums">{focus.count}</span>
          </p>
        ) : (
          <p className="mt-1 text-[0.7rem] text-[var(--muted)]">No cases yet</p>
        )}
        {mode === "country" ? (
          <>
            <div
              className="mt-2 h-2.5 w-full border border-[#3a4450]"
              style={{
                background:
                  "linear-gradient(90deg,#15803d 0%,#a3e635 35%,#facc15 55%,#f97316 75%,#dc2626 100%)",
              }}
              aria-hidden
            />
            <div className="mt-0.5 flex justify-between font-[family-name:var(--font-ui)] text-[0.5rem] uppercase tracking-[0.1em] text-[var(--muted)]">
              <span>Low</span>
              <span>High</span>
            </div>
          </>
        ) : (
          <p className="mt-2 font-[family-name:var(--font-ui)] text-[0.5rem] uppercase tracking-[0.1em] text-[var(--muted)]">
            Soft discs · number = cases · group badge = nearby cluster · click
          </p>
        )}
      </div>

      {status === "loading" ? (
        <p className="absolute inset-0 z-[400] flex items-center justify-center bg-[var(--bg)]/70 text-xs text-[var(--muted)]">
          Loading map…
        </p>
      ) : null}
      {status === "error" || error ? (
        <p className="absolute inset-0 z-[400] flex items-center justify-center bg-[var(--bg)]/80 px-4 text-center text-xs text-[var(--threat)]">
          Map failed: {error ?? "unknown"}
        </p>
      ) : null}
    </div>
  );
}
