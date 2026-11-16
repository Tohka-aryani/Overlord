import { connection, NextResponse } from "next/server";
import {
  queryRansomware,
  RANSOMWARE_LIST_LIMIT,
} from "@/lib/ransomware-query";

/**
 * GET /api/ransomware?country=MY|ALL&source=all|ransomware.live|ransomlook.io&days=30|0&limit=5000&group=&sector=&threat=&q=
 * days=0 or omitted → full archive window.
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const daysRaw = Number.parseInt(url.searchParams.get("days") ?? "0", 10);
  const days = Number.isFinite(daysRaw) && daysRaw > 0 ? daysRaw : null;
  const limitRaw = Number.parseInt(
    url.searchParams.get("limit") ?? String(RANSOMWARE_LIST_LIMIT),
    10,
  );
  const limit =
    Number.isFinite(limitRaw) && limitRaw > 0
      ? limitRaw
      : RANSOMWARE_LIST_LIMIT;

  const data = await queryRansomware({
    country: url.searchParams.get("country") ?? "ALL",
    source: url.searchParams.get("source") ?? "all",
    days,
    limit,
    group: url.searchParams.get("group") ?? "",
    sector: url.searchParams.get("sector") ?? "",
    threat: url.searchParams.get("threat") ?? "",
    q: url.searchParams.get("q") ?? "",
  });

  return NextResponse.json(data);
}
