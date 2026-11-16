import { connection, NextResponse } from "next/server";
import { ingestRansomLook } from "@/lib/ingest/ransomlook";

export const maxDuration = 300;

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

  const url = new URL(request.url);
  const days = Number.parseInt(url.searchParams.get("days") ?? "30", 10) || 30;
  const result = await ingestRansomLook({ days });

  const status = result.status === "success" ? 200 : 502;
  return NextResponse.json(result, { status });
}

export const GET = handle;
export const POST = handle;
