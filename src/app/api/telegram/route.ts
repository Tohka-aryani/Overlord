import { connection, NextResponse } from "next/server";
import { queryTelegram } from "@/lib/telegram-query";

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") ?? undefined;
  const q = url.searchParams.get("q") ?? undefined;
  const limitRaw = url.searchParams.get("limit");
  const limit = limitRaw ? Number.parseInt(limitRaw, 10) : undefined;
  const data = await queryTelegram({
    channel,
    q,
    limit: Number.isFinite(limit) ? limit : undefined,
  });
  return NextResponse.json(data);
}
