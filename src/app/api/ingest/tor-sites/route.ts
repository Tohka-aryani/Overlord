import { connection, NextResponse } from "next/server";
import { ingestTorSites } from "@/lib/ingest/tor-sites";

/** Apify Tor runs can take a long time; waitForFinish is capped in the client. */
export const maxDuration = 1800;

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

  const result = await ingestTorSites();
  if (result.status === "skipped") {
    return NextResponse.json(result, { status: 503 });
  }
  const status = result.status === "success" ? 200 : 502;
  return NextResponse.json(result, { status });
}

export const GET = handle;
export const POST = handle;
