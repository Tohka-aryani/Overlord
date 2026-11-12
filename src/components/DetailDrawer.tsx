"use client";

import { useEffect, useId, useRef } from "react";

type DetailDrawerProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
};

/**
 * Right-stage detail panel. Hierarchy motion only (enter/exit) — no glow noise.
 */
export function DetailDrawer({
  open,
  title,
  onClose,
  children,
}: DetailDrawerProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus panel for keyboard close without trapping the whole app.
    panelRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close detail"
        className="absolute inset-0 bg-black/45"
        onClick={onClose}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="detail-drawer relative z-10 flex h-full w-full max-w-md flex-col border-l border-[var(--border)] bg-[var(--surface)] outline-none"
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
          <h2
            id={titleId}
            className="text-base font-medium tracking-tight text-[var(--text)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 font-mono text-xs uppercase tracking-wider text-[var(--muted)] hover:text-[var(--text)]"
          >
            Close
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </aside>
    </div>
  );
}

type DetailFieldProps = {
  label: string;
  children: React.ReactNode;
  mono?: boolean;
};

/** Label / value row for drawer bodies. */
export function DetailField({ label, children, mono }: DetailFieldProps) {
  return (
    <div className="border-b border-[var(--border)]/70 py-3">
      <dt className="text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </dt>
      <dd
        className={`mt-1 break-words text-sm text-[var(--text)] ${
          mono ? "font-mono text-xs tabular-nums" : ""
        }`}
      >
        {children}
      </dd>
    </div>
  );
}
