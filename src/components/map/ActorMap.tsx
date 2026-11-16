"use client";

import { useEffect, useRef, useState } from "react";
import { COUNTRY_COORDS } from "@/lib/geo/country-centroids";
import { isDarkTheme, useTheme } from "@/components/theme/ThemeProvider";
import type { ActorMapPoint } from "@/components/map/types";
import type {
  Map as LeafletMap,
  CircleMarker,
  LayerGroup,
  TileLayer,
} from "leaflet";

export type { ActorMapPoint };

type ActorMapProps = {
  points: ActorMapPoint[];
  preferMalaysia?: boolean;
  className?: string;
  actorName?: string | null;
  focusIp?: string | null;
  focusKey?: number;
  onDetailRequest?: (ip: string) => void;
  onPinSelect?: (ip: string) => void;
};

const MY_CENTER: [number, number] = COUNTRY_COORDS.MY
  ? [COUNTRY_COORDS.MY[0], COUNTRY_COORDS.MY[1]]
  : [4.21, 101.97];

/** Free OSM tiles — Carto basemaps now watermark / require an API key. */
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function isMy(iso: string | null): boolean {
  return (iso ?? "").trim().toUpperCase() === "MY";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function popupHtml(p: ActorMapPoint, actorName?: string | null): string {
  const my = isMy(p.countryIso);
  const countryName = p.countryIso?.toUpperCase() ?? "—";
  const actor = actorName
    ? `<div class="ol-map-popup__actor">${escapeHtml(actorName)}</div>`
    : "";
  const host = p.hostname
    ? `<div class="ol-map-popup__row"><span>Host</span><code>${escapeHtml(p.hostname)}</code></div>`
    : "";
  return `<div class="ol-map-popup">
    ${actor}
    <div class="ol-map-popup__ip"><code>${escapeHtml(p.ip)}</code></div>
    <div class="ol-map-popup__meta">
      <span class="ol-map-popup__pill${my ? " ol-map-popup__pill--my" : ""}">${escapeHtml(countryName)}</span>
      <span class="ol-map-popup__muted">${my ? "Malaysia watch" : "Centroid plot"}</span>
    </div>
    ${host}
    <div class="ol-map-popup__row"><span>Lat / Lon</span><code>${p.lat.toFixed(3)}, ${p.lon.toFixed(3)}</code></div>
    <button type="button" class="ol-map-popup__detail" data-ip-detail="${escapeHtml(p.ip)}">Enrichment detail</button>
    <p class="ol-map-popup__note">Stable country-centroid jitter — not street-level.</p>
  </div>`;
}

/**
 * Situational IP map — plain Leaflet init in useEffect (no react-leaflet).
 * Avoids the previous dynamic-import hang while restoring real basemap tiles.
 */
export default function ActorMap({
  points,
  preferMalaysia = true,
  className = "",
  actorName = null,
  focusIp = null,
  focusKey = 0,
  onDetailRequest,
  onPinSelect,
}: ActorMapProps) {
  const { theme } = useTheme();
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const tilesRef = useRef<TileLayer | null>(null);
  const markersRef = useRef(new Map<string, CircleMarker>());
  const detailCb = useRef(onDetailRequest);
  detailCb.current = onDetailRequest;
  const selectCb = useRef(onPinSelect);
  selectCb.current = onPinSelect;
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  const myCount = points.filter((p) => isMy(p.countryIso)).length;

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
        });
        mapRef.current = map;
        layerRef.current = L.layerGroup().addTo(map);

        tilesRef.current = L.tileLayer(OSM_URL, {
          attribution: OSM_ATTR,
          maxZoom: 19,
          className: isDarkTheme(theme) ? "ol-tiles--night" : undefined,
        }).addTo(map);

        map.setView(
          preferMalaysia ? MY_CENTER : [20, 20],
          preferMalaysia ? 5 : 2,
        );

        // Popup detail button → parent
        map.getContainer().addEventListener("click", (ev) => {
          const t = ev.target as HTMLElement | null;
          const btn = t?.closest?.("[data-ip-detail]") as HTMLElement | null;
          if (!btn) return;
          const ip = btn.getAttribute("data-ip-detail");
          if (ip) detailCb.current?.(ip);
        });

        setStatus("ready");
        // Layout settle
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
      markersRef.current.clear();
      layerRef.current = null;
      if (map) {
        map.remove();
      }
      mapRef.current = null;
    };
    // theme handled in separate effect for tiles
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

  // Sync markers
  useEffect(() => {
    const map = mapRef.current;
    const group = layerRef.current;
    if (!map || !group || status !== "ready") return;
    let cancelled = false;

    void import("leaflet").then((leaflet) => {
      if (cancelled) return;
      const L = leaflet.default;
      group.clearLayers();
      markersRef.current.clear();

      for (const p of points) {
        const my = isMy(p.countryIso);
        const marker = L.circleMarker([p.lat, p.lon], {
          radius: my ? 8 : 6,
          color: my ? "#d9773a" : "#6a8a9a",
          weight: 2,
          fillColor: my ? "#d9773a" : "#6a8a9a",
          fillOpacity: 0.85,
          className: my ? "ol-pin--my" : "",
        });
        marker.bindPopup(popupHtml(p, actorName), {
          className: "ol-leaflet-popup",
          maxWidth: 280,
          minWidth: 200,
          autoPan: true,
        });
        marker.on("click", () => selectCb.current?.(p.ip));
        marker.addTo(group);
        markersRef.current.set(p.ip, marker);
      }

      if (points.length === 0) {
        map.setView(
          preferMalaysia ? MY_CENTER : [20, 20],
          preferMalaysia ? 5 : 2,
        );
        return;
      }
      const bounds = L.latLngBounds(
        points.map((p) => [p.lat, p.lon] as [number, number]),
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds.pad(0.35), { maxZoom: 10, animate: false });
      }
      map.invalidateSize({ animate: false });
    });

    return () => {
      cancelled = true;
    };
  }, [points, actorName, preferMalaysia, status]);

  // Focus pin from table / re-click
  useEffect(() => {
    if (!focusIp || status !== "ready") return;
    const marker = markersRef.current.get(focusIp);
    const map = mapRef.current;
    if (!marker || !map) return;
    const ll = marker.getLatLng();
    map.panTo(ll, { animate: true });
    marker.openPopup();
  }, [focusIp, focusKey, status, points]);

  // Resize
  useEffect(() => {
    const map = mapRef.current;
    const el = hostRef.current;
    if (!map || !el || status !== "ready") return;
    const ro = new ResizeObserver(() => {
      try {
        map.invalidateSize({ animate: false });
      } catch {
        /* torn down */
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [status]);

  return (
    <div
      className={`ol-actor-map relative h-full min-h-[12rem] w-full overflow-hidden bg-[var(--bg)] ${className}`}
    >
      <div className="pointer-events-none absolute left-2 top-2 z-[500] max-w-[14rem] border border-[var(--border)] bg-[var(--surface)]/90 px-2.5 py-2 backdrop-blur-sm">
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[var(--accent)]">
          Situational map
        </p>
        <p className="mt-1 truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--text)]">
          {actorName?.trim() || "No actor selected"}
        </p>
        <p className="mt-1 font-mono text-[0.6rem] tabular-nums text-[var(--muted)]">
          {points.length} pins
          {myCount > 0 ? ` · ${myCount} MY` : ""}
        </p>
      </div>

      <div ref={hostRef} className="absolute inset-0 z-0 h-full w-full" />

      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-[400] flex items-center justify-center bg-[var(--surface)]/60 text-sm text-[var(--muted)]">
          Loading map…
        </div>
      ) : null}
      {status === "error" ? (
        <div className="absolute inset-0 z-[400] flex items-center justify-center bg-[var(--surface)] px-4 text-center text-sm text-[var(--threat)]">
          Map failed: {error ?? "unknown error"}
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-8 left-2 z-[500] border border-[var(--border)] bg-[var(--surface)]/90 px-2 py-1.5 font-mono text-[0.55rem] uppercase tracking-wider text-[var(--muted)] backdrop-blur-sm">
        <span className="mr-2 inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 bg-[var(--accent)]" /> MY
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-1.5 w-1.5 bg-[var(--info)]" /> Other
        </span>
      </div>
      <p className="pointer-events-none absolute bottom-1 right-2 z-[500] font-mono text-[0.55rem] uppercase tracking-wider text-[var(--muted)]/70">
        OSM · click pin
      </p>
    </div>
  );
}
