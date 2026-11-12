"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { COUNTRY_COORDS } from "@/lib/geo/country-centroids";
import { useTheme } from "@/components/theme/ThemeProvider";

export type ActorMapPoint = {
  id: number;
  ip: string;
  hostname: string | null;
  countryIso: string | null;
  lat: number;
  lon: number;
};

type ActorMapProps = {
  points: ActorMapPoint[];
  /** When true, bias empty / default view toward Malaysia. */
  preferMalaysia?: boolean;
  className?: string;
  /** Optional actor label shown in popups. */
  actorName?: string | null;
};

const MY_CENTER: [number, number] = COUNTRY_COORDS.MY
  ? [COUNTRY_COORDS.MY[0], COUNTRY_COORDS.MY[1]]
  : [4.21, 101.97];

const WORLD_CENTER: [number, number] = [20, 20];

const CARTO_DARK =
  "https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png";
const CARTO_LIGHT =
  "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";

function cartoUrl(style: "dark" | "light"): string {
  const base = style === "dark" ? CARTO_DARK : CARTO_LIGHT;
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  if (!key) return base;
  return `${base}?key=${encodeURIComponent(key)}`;
}

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
  const countryName =
    p.countryIso && COUNTRY_COORDS[p.countryIso.toUpperCase()]
      ? p.countryIso.toUpperCase()
      : p.countryIso?.toUpperCase() ?? "—";
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
    <p class="ol-map-popup__note">Country-centroid jitter — not street-level geo.</p>
  </div>`;
}

function ClusteredPoints({
  points,
  actorName,
}: {
  points: ActorMapPoint[];
  actorName?: string | null;
}) {
  const map = useMap();

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: true,
      maxClusterRadius: 42,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      spiderLegPolylineOptions: {
        weight: 1.5,
        color: "#c45c26",
        opacity: 0.55,
      },
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? "sm" : count < 50 ? "md" : "lg";
        const dim = size === "sm" ? 32 : size === "md" ? 40 : 48;
        return L.divIcon({
          html: `<span>${count}</span>`,
          className: `ol-cluster ol-cluster--${size}`,
          iconSize: L.point(dim, dim),
        });
      },
    });

    for (const p of points) {
      const my = isMy(p.countryIso);
      const icon = L.divIcon({
        className: `ol-pin${my ? " ol-pin--my" : ""}`,
        html: `<span class="ol-pin__core"></span><span class="ol-pin__ring"></span>`,
        iconSize: L.point(18, 18),
        iconAnchor: L.point(9, 9),
        popupAnchor: L.point(0, -10),
      });
      const marker = L.marker([p.lat, p.lon], { icon });
      marker.bindPopup(popupHtml(p, actorName), {
        className: "ol-leaflet-popup",
        maxWidth: 280,
        minWidth: 200,
        closeButton: true,
        autoPanPadding: L.point(48, 48),
      });
      marker.on("mouseover", () => {
        marker.openPopup();
      });
      group.addLayer(marker);
    }

    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, points, actorName]);

  return null;
}

function FitBounds({
  points,
  preferMalaysia,
}: {
  points: ActorMapPoint[];
  preferMalaysia: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) {
      map.setView(
        preferMalaysia ? MY_CENTER : WORLD_CENTER,
        preferMalaysia ? 5 : 2,
      );
      return;
    }
    const bounds = L.latLngBounds(
      points.map((p) => [p.lat, p.lon] as [number, number]),
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds.pad(0.28), { maxZoom: 6, animate: true });
    }
  }, [map, points, preferMalaysia]);

  return null;
}

function ThemedTiles() {
  const { theme } = useTheme();
  const style = theme === "day" ? "light" : "dark";
  return (
    <TileLayer
      key={style}
      url={cartoUrl(style)}
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    />
  );
}

/**
 * Interactive dark/light basemap + clustered IP pins with rich popups.
 */
export default function ActorMap({
  points,
  preferMalaysia = true,
  className = "",
  actorName = null,
}: ActorMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const key = useMemo(
    () =>
      `${actorName ?? ""}|` +
      (points.map((p) => `${p.id}:${p.lat}:${p.lon}`).join("|") || "empty"),
    [points, actorName],
  );

  if (!mounted) {
    return (
      <div
        className={`flex items-center justify-center bg-[var(--surface)] text-sm text-[var(--muted)] ${className}`}
        aria-hidden
      >
        Loading map…
      </div>
    );
  }

  return (
    <div className={`ol-actor-map relative isolate min-h-[16rem] ${className}`}>
      <MapContainer
        center={preferMalaysia ? MY_CENTER : WORLD_CENTER}
        zoom={preferMalaysia ? 5 : 2}
        className="h-full w-full bg-[var(--bg)]"
        scrollWheelZoom
        attributionControl={false}
      >
        <ThemedTiles />
        <ClusteredPoints key={key} points={points} actorName={actorName} />
        <FitBounds points={points} preferMalaysia={preferMalaysia} />
      </MapContainer>
      <p className="pointer-events-none absolute bottom-1 right-2 z-[500] font-mono text-[0.55rem] uppercase tracking-wider text-[var(--muted)]/70">
        CARTO · OSM
      </p>
    </div>
  );
}
