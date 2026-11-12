"use client";

import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { COUNTRY_COORDS } from "@/lib/geo/country-centroids";

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
};

const MY_CENTER: [number, number] = COUNTRY_COORDS.MY
  ? [COUNTRY_COORDS.MY[0], COUNTRY_COORDS.MY[1]]
  : [4.21, 101.97];

const WORLD_CENTER: [number, number] = [20, 20];

const CARTO_DARK_ALL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

/** CARTO basemaps require an API key (NEXT_PUBLIC_CARTO_API_KEY). */
function cartoDarkAllUrl(): string {
  const key = process.env.NEXT_PUBLIC_CARTO_API_KEY?.trim();
  if (!key) return CARTO_DARK_ALL;
  return `${CARTO_DARK_ALL}?apikey=${encodeURIComponent(key)}`;
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

/** Cluster layer — imperative so leaflet.markercluster owns child markers. */
function ClusteredPoints({ points }: { points: ActorMapPoint[] }) {
  const map = useMap();

  useEffect(() => {
    const group = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 48,
      spiderfyOnMaxZoom: true,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount();
        const size = count < 10 ? "sm" : count < 50 ? "md" : "lg";
        const dim =
          size === "sm" ? 28 : size === "md" ? 36 : 44;
        return L.divIcon({
          html: `<span>${count}</span>`,
          className: `raven-cluster raven-cluster--${size}`,
          iconSize: L.point(dim, dim),
        });
      },
    });

    for (const p of points) {
      const my = isMy(p.countryIso);
      const marker = L.circleMarker([p.lat, p.lon], {
        radius: my ? 7 : 5,
        color: my ? "#f5a524" : "#6b8499",
        weight: my ? 2 : 1,
        fillColor: my ? "#f5a524" : "#8b90a0",
        fillOpacity: my ? 0.85 : 0.55,
      });
      const host = p.hostname
        ? `<br/><span class="raven-map-muted">${escapeHtml(p.hostname)}</span>`
        : "";
      const iso = p.countryIso
        ? `<br/><span class="raven-map-iso">${escapeHtml(p.countryIso)}</span>`
        : "";
      marker.bindPopup(
        `<div class="raven-map-popup"><code>${escapeHtml(p.ip)}</code>${iso}${host}</div>`,
      );
      group.addLayer(marker);
    }

    map.addLayer(group);
    return () => {
      map.removeLayer(group);
    };
  }, [map, points]);

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
      map.fitBounds(bounds.pad(0.25), { maxZoom: 6 });
    }
  }, [map, points, preferMalaysia]);

  return null;
}

/**
 * Dark basemap + clustered actor IP points (country-centroid jitter).
 * Client-only — load via next/dynamic with ssr:false from a Client Component.
 */
export default function ActorMap({
  points,
  preferMalaysia = true,
  className = "",
}: ActorMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const key = useMemo(
    () => points.map((p) => `${p.id}:${p.lat}:${p.lon}`).join("|") || "empty",
    [points],
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
    <div
      className={`raven-actor-map relative isolate min-h-[16rem] ${className}`}
    >
      <MapContainer
        center={preferMalaysia ? MY_CENTER : WORLD_CENTER}
        zoom={preferMalaysia ? 5 : 2}
        className="h-full w-full bg-[var(--bg)]"
        scrollWheelZoom
        attributionControl={false}
      >
        <TileLayer
          url={cartoDarkAllUrl()}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <ClusteredPoints key={key} points={points} />
        <FitBounds points={points} preferMalaysia={preferMalaysia} />
      </MapContainer>
      <p className="pointer-events-none absolute bottom-1 right-2 z-[500] font-mono text-[0.55rem] uppercase tracking-wider text-[var(--muted)]/70">
        CARTO · OSM
      </p>
    </div>
  );
}
