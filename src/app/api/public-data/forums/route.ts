import { connection, NextResponse } from "next/server";
import { db } from "@/db";
import { actors } from "@/db/schema";

/**
 * Distinct forum labels for Public Data filter.
 * GET /api/public-data/forums
 */
export async function GET() {
  await connection();

  const rows = await db
    .select({ forums: actors.forums })
    .from(actors);

  const set = new Set<string>();
  for (const row of rows) {
    for (const f of row.forums ?? []) {
      const trimmed = f.trim();
      if (trimmed) set.add(trimmed);
    }
  }

  const items = [...set].sort((a, b) => a.localeCompare(b));

  return NextResponse.json({
    count: items.length,
    items,
  });
}
