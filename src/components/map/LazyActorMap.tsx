"use client";

import ActorMap from "@/components/map/ActorMap";
import type { ActorMapPoint } from "@/components/map/types";

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

/** SVG situational map — sync import (no Leaflet / no dynamic hang). */
export function LazyActorMap(props: ActorMapProps) {
  return <ActorMap {...props} />;
}
