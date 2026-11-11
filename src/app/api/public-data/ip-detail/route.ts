import { eq } from "drizzle-orm";
import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { actorIps } from "@/db/schema";

/**
 * Optional ipinfo.io enrichment for a single IP (requires IPINFO_TOKEN).
 * GET /api/public-data/ip-detail?ip=1.2.3.4
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const ip = (url.searchParams.get("ip") ?? "").trim();
  if (!ip || !/^[\d.a-fA-F:]+$/.test(ip)) {
    return NextResponse.json({ error: "Invalid or missing ip=" }, { status: 400 });
  }

  const dbUsers = await db
    .select({
      username: actorIps.username,
      hostname: actorIps.hostname,
      countryIso: actorIps.countryIso,
      actorId: actorIps.actorId,
    })
    .from(actorIps)
    .where(eq(actorIps.ip, ip));

  const token = process.env.IPINFO_TOKEN?.trim();
  let ipinfo: Record<string, unknown> | null = null;
  let ipinfoError: string | null = null;

  if (token) {
    try {
      const res = await fetch(
        `https://ipinfo.io/${encodeURIComponent(ip)}?token=${encodeURIComponent(token)}`,
        { signal: AbortSignal.timeout(8_000) },
      );
      if (!res.ok) {
        ipinfoError = `ipinfo HTTP ${res.status}`;
      } else {
        ipinfo = (await res.json()) as Record<string, unknown>;
      }
    } catch (err) {
      ipinfoError = err instanceof Error ? err.message : String(err);
    }
  } else {
    ipinfoError = "IPINFO_TOKEN not configured";
  }

  return NextResponse.json({
    ip,
    dbUsers,
    ipinfo,
    ipinfoError,
  });
}
