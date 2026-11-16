import { connection, NextResponse } from "next/server";
import {
  queryAttention,
  type AttentionSortKey,
} from "@/lib/overview-attention";

/**
 * GET /api/overview/attention?threat=All&sort=threat&dir=asc&page=1&pageSize=50
 * Full-archive Needs Attention (no sample cap).
 */
export async function GET(request: Request) {
  await connection();

  const url = new URL(request.url);
  const threat = url.searchParams.get("threat") ?? "All";
  const sort = (url.searchParams.get("sort") ?? "threat") as AttentionSortKey;
  const dir = url.searchParams.get("dir") === "desc" ? "desc" : "asc";
  const page = Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
  const pageSize =
    Number.parseInt(url.searchParams.get("pageSize") ?? "50", 10) || 50;

  const result = await queryAttention({ threat, sort, dir, page, pageSize });
  return NextResponse.json(result);
}
