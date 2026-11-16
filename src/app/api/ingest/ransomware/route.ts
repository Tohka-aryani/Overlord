import { connection, NextResponse } from "next/server";
import { ingestRansomware } from "@/lib/ingest/ransomware";

/**
 * Ingest waits ~60s between ransomware.live endpoints plus upsert/classify.
 * `ingestRansomware` uses try/catch/finally to mark `ingest_runs` error when the
 * handler exits without a terminal status; a platform hard kill (SIGKILL at
 * maxDuration) may still leave a row stuck in `running`.
 */
/** Global year dumps need rate-limit sleeps + bulk upsert. */
export const maxDuration = 800;

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
  // country=ALL → recentvictims + yearly dumps (rate-limited).
  const country = url.searchParams.get("country") ?? "MY";
  const result = await ingestRansomware({ country });

  const status = result.status === "success" ? 200 : 502;
  return NextResponse.json(result, { status });
}

export const GET = handle;
export const POST = handle;
