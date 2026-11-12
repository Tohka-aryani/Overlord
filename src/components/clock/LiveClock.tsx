"use client";

import { useEffect, useState } from "react";

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatParts(d: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).formatToParts(d);

  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    date: `${get("day")} ${get("month")} ${get("year")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}

/** Live clock — MY local + UTC for ops awareness. */
export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!now) {
    return (
      <div className="flex min-w-[7rem] flex-col items-end" aria-hidden>
        <span className="font-mono text-[0.65rem] text-[var(--muted)]">—</span>
      </div>
    );
  }

  const my = formatParts(now, "Asia/Kuala_Lumpur");
  const utc = `${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}:${pad(now.getUTCSeconds())}`;

  return (
    <time
      dateTime={now.toISOString()}
      className="flex flex-col items-end gap-0.5"
      title="Malaysia time · UTC"
    >
      <span className="font-mono text-[0.75rem] tabular-nums tracking-wide text-[var(--text)] sm:text-[0.8rem]">
        {my.time}
        <span className="ml-1 text-[0.6rem] text-[var(--accent)] sm:ml-1.5 sm:text-[0.65rem]">
          MYT
        </span>
      </span>
      <span className="hidden font-mono text-[0.6rem] tabular-nums tracking-wide text-[var(--muted)] sm:inline">
        {my.date} · {utc} UTC
      </span>
      <span className="font-mono text-[0.55rem] tabular-nums text-[var(--muted)] sm:hidden">
        {utc}Z
      </span>
    </time>
  );
}
