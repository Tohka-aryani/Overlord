import { connection, NextResponse } from "next/server";
import { getCountryBriefing } from "@/lib/country-briefing";

/**
 * GET /api/overview/country-briefing?country=MY
 * Top 5 country-related news + Ollama briefing.
 */
export const maxDuration = 120;

export async function GET(request: Request) {
  await connection();
  const url = new URL(request.url);
  const country = (url.searchParams.get("country") ?? "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json(
      { error: "country must be ISO2 (e.g. MY)" },
      { status: 400 },
    );
  }

  try {
    const data = await getCountryBriefing(country);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
