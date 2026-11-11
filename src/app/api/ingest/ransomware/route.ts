import { connection, NextResponse } from "next/server";
import { ingestRansomware } from "@/lib/ingest/ransomware";

/** Ingest waits ~60s between ransomware.live endpoints plus upsert/classify. */
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
  // Opt into request-time rendering (Next 16 cacheComponents).
  await connection();

  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const country = url.searchParams.get("country") ?? "MY";
  const result = await ingestRansomware({ country });

  const status = result.status === "success" ? 200 : 502;
  return NextResponse.json(result, { status });
}

export const GET = handle;
export const POST = handle;
