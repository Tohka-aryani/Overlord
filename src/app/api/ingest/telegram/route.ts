import { connection, NextResponse } from "next/server";
import { ingestTelegram } from "@/lib/ingest/telegram";

export const maxDuration = 120;

function authorizeCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const xCron = request.headers.get("x-cron-secret");
  if (xCron === secret) return true;

  const auth = request.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && auth.slice(7) === secret) return true;

  return false;
}

async function handle(request: Request) {
  await connection();

  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await ingestTelegram();
  const status = result.status === "success" ? 200 : 502;
  return NextResponse.json(result, { status });
}

export const GET = handle;
export const POST = handle;
