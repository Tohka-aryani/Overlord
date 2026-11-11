import { connection, NextResponse } from "next/server";
import { ingestNews } from "@/lib/ingest/news";

/**
 * Ingest polls multiple Google News RSS keyword feeds then upserts/classifies.
 * `ingestNews` uses try/catch/finally to mark `ingest_runs` error when the
 * handler exits without a terminal status; a platform hard kill (SIGKILL at
 * maxDuration) may still leave a row stuck in `running`.
 */
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

  const result = await ingestNews();
  const status = result.status === "success" ? 200 : 502;
  return NextResponse.json(result, { status });
}

export const GET = handle;
export const POST = handle;
