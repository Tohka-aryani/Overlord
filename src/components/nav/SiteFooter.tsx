import Link from "next/link";
import { OverlordLogo } from "@/components/brand/OverlordLogo";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto flex max-w-[90rem] flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:px-8">
        <div className="max-w-sm">
          <OverlordLogo size={1.4} />
          <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
            Malaysia-first dark-web monitoring console. Archive-first reads;
            labels via LAN Ollama. Tor claim URLs are stored as text only.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-8 text-sm sm:grid-cols-3">
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Console
            </p>
            <ul className="mt-2 space-y-1.5">
              <li>
                <Link href="/" className="text-[var(--text)] hover:text-[var(--accent)]">
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/public-data"
                  className="text-[var(--text)] hover:text-[var(--accent)]"
                >
                  Public Data
                </Link>
              </li>
              <li>
                <Link
                  href="/ransomware"
                  className="text-[var(--text)] hover:text-[var(--accent)]"
                >
                  Ransomware
                </Link>
              </li>
              <li>
                <Link href="/news" className="text-[var(--text)] hover:text-[var(--accent)]">
                  News
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Sources
            </p>
            <ul className="mt-2 space-y-1.5 text-[var(--muted)]">
              <li>ransomware.live</li>
              <li>Google News RSS</li>
              <li>DarkForums IP intel</li>
              <li>Threat-Actor usernames</li>
            </ul>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-[var(--muted)]">
              Ops
            </p>
            <ul className="mt-2 space-y-1.5 text-[var(--muted)]">
              <li>Local / LAN v1</li>
              <li>Telegram — coming soon</li>
              <li>Theme: Night / Day</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-[90rem] flex-wrap items-center justify-between gap-2 px-4 py-3 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-[var(--muted)] sm:px-6 lg:px-8">
          <span>Overlord · Malaysia watch</span>
          <span>Not for public internet exposure</span>
        </div>
      </div>
    </footer>
  );
}
