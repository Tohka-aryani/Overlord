"use client";

import type { ActorSummary } from "@/components/public-data/types";
import { formatWhen } from "@/lib/format-when";

type ActorDetailProps = {
  actor: ActorSummary | null;
};

export function ActorDetail({ actor }: ActorDetailProps) {
  if (!actor) {
    return (
      <div className="px-3 py-4 text-xs text-[var(--muted)]">
        Select an actor to inspect forums, sightings, and IP footprint.
      </div>
    );
  }

  return (
    <div className="ol-pd-fade space-y-3 px-3 py-3">
      <div>
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          Selected
        </p>
        <h2 className="mt-1 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--text)]">
          {actor.username}
        </h2>
      </div>
      <dl className="space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted)]">IPs</dt>
          <dd className="font-mono tabular-nums">{actor.ipCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted)]">First seen</dt>
          <dd className="font-mono tabular-nums">
            {formatWhen(actor.firstSeenAt)}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-[var(--muted)]">Last seen</dt>
          <dd className="font-mono tabular-nums">
            {formatWhen(actor.lastSeenAt)}
          </dd>
        </div>
      </dl>
      <div>
        <p className="font-mono text-[0.55rem] uppercase tracking-[0.14em] text-[var(--muted)]">
          Forums
        </p>
        <p className="mt-1 text-xs leading-relaxed text-[var(--text)]">
          {(actor.forums ?? []).length > 0
            ? actor.forums.join(" · ")
            : "—"}
        </p>
      </div>
    </div>
  );
}
