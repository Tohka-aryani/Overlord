"use client";

import { useId, useState } from "react";

const MEANINGS: { level: string; meaning: string }[] = [
  {
    level: "Critical",
    meaning: "Active or imminent MY-impact breach / ransomware with high confidence.",
  },
  {
    level: "High",
    meaning: "Serious CTI signal with clear Malaysia relevance or major sector hit.",
  },
  {
    level: "Medium",
    meaning: "Notable activity; relevance or severity is mixed / incomplete.",
  },
  {
    level: "Low",
    meaning: "Weak or peripheral signal; monitor only.",
  },
  {
    level: "Info",
    meaning: "Context / awareness item, not an urgent incident.",
  },
  {
    level: "Unclassified",
    meaning: "No LLM label yet — awaiting Ollama backfill or ingest classify.",
  },
];

/** Compact disclosure explaining threat band meanings. */
export function ThreatInfo({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div className={`relative inline-flex ${className}`}>
      <button
        type="button"
        className="cursor-pointer font-mono text-[0.65rem] uppercase tracking-[0.12em] text-[var(--muted)] underline-offset-2 hover:text-[var(--text)] hover:underline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        What do levels mean?
      </button>
      {open ? (
        <div
          id={panelId}
          role="region"
          className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] border border-[var(--border)] bg-[var(--surface-raised)] p-3 shadow-[0_12px_40px_color-mix(in_oklab,var(--bg)_55%,transparent)]"
        >
          <ul className="space-y-2">
            {MEANINGS.map((m) => (
              <li key={m.level} className="text-xs leading-snug">
                <span className="font-mono text-[0.65rem] uppercase tracking-wider text-[var(--accent)]">
                  {m.level}
                </span>
                <span className="mt-0.5 block text-[var(--muted)]">{m.meaning}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
