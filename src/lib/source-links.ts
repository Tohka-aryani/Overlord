import { isOpenableClaimUrl } from "@/lib/format-when";

/** Stable ransomware.live victim dossier: /id/{base64(victim@group)} (no padding). */
export function ransomwareLiveVictimUrl(victim: string, group: string): string {
  const id = Buffer.from(`${victim}@${group}`, "utf8")
    .toString("base64")
    .replace(/=+$/, "");
  return `https://www.ransomware.live/id/${id}`;
}

/** Stable RansomLook group index (post/blog/leaks claim paths often 404). */
export function ransomLookGroupUrl(group: string): string {
  return `https://www.ransomlook.io/group/${encodeURIComponent(group)}`;
}

/**
 * Many stored RansomLook `link` values (/post/, /blog/, /leaks/, /Company/) return 404.
 * Group pages are the reliable clearnet surface.
 */
export function isUnreliableRansomLookClaimUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (!/(^|\.)ransomlook\.io$/i.test(u.hostname)) return false;
    const path = u.pathname.toLowerCase();
    if (path.startsWith("/group/") || path === "/group") return false;
    return true;
  } catch {
    return true;
  }
}

export type OpenableSource = {
  url: string;
  label: "ransomware.live" | "ransomlook.io" | "source";
};

/**
 * Resolve a clearnet URL the analyst can open without Tor / 404 dump links.
 * Prefer stable provider pages over raw claim_url.
 */
export function resolveOpenableSourceUrl(opts: {
  victim: string;
  group: string | null | undefined;
  source: string;
  sources?: string[] | null;
  claimUrl?: string | null;
}): OpenableSource | null {
  const victim = opts.victim.trim();
  const group = (opts.group ?? "").trim();
  if (!victim) return null;

  const sources = (
    opts.sources?.length ? opts.sources : [opts.source]
  ).map((s) => s.trim());

  if (
    (sources.includes("ransomware.live") ||
      opts.source === "ransomware.live") &&
    group
  ) {
    return {
      url: ransomwareLiveVictimUrl(victim, group),
      label: "ransomware.live",
    };
  }

  if (
    (sources.includes("ransomlook.io") || opts.source === "ransomlook.io") &&
    group
  ) {
    return {
      url: ransomLookGroupUrl(group),
      label: "ransomlook.io",
    };
  }

  const claim = opts.claimUrl?.trim() ?? "";
  if (
    claim &&
    isOpenableClaimUrl(claim) &&
    !isUnreliableRansomLookClaimUrl(claim)
  ) {
    return { url: claim, label: "source" };
  }

  if (group) {
    return {
      url: ransomwareLiveVictimUrl(victim, group),
      label: "ransomware.live",
    };
  }

  return null;
}
