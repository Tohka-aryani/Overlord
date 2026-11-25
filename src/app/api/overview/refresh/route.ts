import { connection, NextResponse } from "next/server";
import { ingestNews } from "@/lib/ingest/news";
import { ingestRansomLook } from "@/lib/ingest/ransomlook";
import { ingestRansomware } from "@/lib/ingest/ransomware";

export const maxDuration = 800;

/**
 * Hybrid refresh for Overview (LAN console).
 * Pulls MY ransomware + recent RansomLook + news into Postgres, then UI reloads archive.
 * No client CRON_SECRET — intended for local/LAN operator use only.
 */
export async function POST() {
  await connection();

  if (!(process.env.CRON_SECRET ?? "").trim()) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 },
    );
  }

  const results = {
    ransomware: await ingestRansomware({ country: "MY" }),
    ransomlook: await ingestRansomLook({ days: 7 }),
    news: await ingestNews(),
  };

  const ok =
    results.ransomware.status === "success" &&
    results.ransomlook.status === "success" &&
    results.news.status === "success";

  return NextResponse.json(
    { status: ok ? "success" : "partial", results },
    { status: ok ? 200 : 502 },
  );
}
