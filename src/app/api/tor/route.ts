import { connection, NextResponse } from "next/server";
import { queryTorSites } from "@/lib/tor-query";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const q = url.searchParams.get("q") ?? undefined;
  const status = url.searchParams.get("status") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const data = await queryTorSites({
    q,
    status,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  return NextResponse.json(data);
}
