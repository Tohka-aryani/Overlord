"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/public-data", label: "Public Data" },
  { href: "/ransomware", label: "Ransomware" },
  { href: "/news", label: "News" },
  { href: "/telegram", label: "Telegram" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function OpsRail() {
  const pathname = usePathname() ?? "/";

  return (
    <aside
      className="flex shrink-0 flex-col border-r border-[var(--border)] bg-[var(--bg)]"
      style={{ width: "var(--rail-width)" }}
      aria-label="Ops rail"
    >
      <div className="border-b border-[var(--border)] px-5 py-5">
        <p className="font-mono text-sm font-semibold tracking-[0.22em] text-[var(--threat)]">
          RAVEN · MY
        </p>
        <p className="mt-1 text-[0.7rem] tracking-wide text-[var(--muted)]">
          Dark Web Monitoring
        </p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-4" aria-label="Primary">
        {NAV.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              data-active={active ? "true" : "false"}
              className={`ops-rail-link relative rounded-sm px-3 py-2.5 text-sm transition-colors duration-150 ${
                active
                  ? "bg-[var(--surface)] text-[var(--text)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface)]/60 hover:text-[var(--text)]"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
