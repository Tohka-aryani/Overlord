"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { OverlordLogo } from "@/components/brand/OverlordLogo";
import { LiveClock } from "@/components/clock/LiveClock";
import { SettingsPanel } from "@/components/theme/SettingsPanel";
import { useLocale } from "@/components/i18n/LocaleProvider";

const NAV = [
  { href: "/", key: "overview" },
  { href: "/public-data", key: "publicData" },
  { href: "/ransomware", key: "ransomware" },
  { href: "/news", key: "news" },
  { href: "/telegram", key: "telegram" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function TopNav() {
  const pathname = usePathname() ?? "/";
  const { t } = useLocale();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[96rem] items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="shrink-0 text-[var(--text)]">
          <OverlordLogo />
        </Link>

        <nav
          className="ml-2 hidden flex-1 items-center gap-0.5 md:flex"
          aria-label="Primary"
        >
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                data-active={active ? "true" : "false"}
                className={`top-nav-link relative px-3 py-2 text-sm uppercase tracking-[0.06em] transition-colors duration-150 ${
                  active
                    ? "text-[var(--text)]"
                    : "text-[var(--muted)] hover:text-[var(--text)]"
                }`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <nav
          className="flex flex-1 gap-1 overflow-x-auto md:hidden"
          aria-label="Primary mobile"
        >
          {NAV.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`whitespace-nowrap px-2 py-1.5 text-xs uppercase tracking-[0.06em] ${
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                {t(`nav.${item.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-3">
          <LiveClock />
          <SettingsPanel />
        </div>
      </div>
    </header>
  );
}
