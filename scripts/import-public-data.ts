/**
 * Import Public Data into Postgres (actors + actor_ips).
 *
 * Demo subset:
 *   npx tsx scripts/import-public-data.ts --limit 2000 --username-limit 500
 *
 * Full import (all downloaded username files + all DarkForums IP rows):
 *   npx tsx scripts/import-public-data.ts
 *
 * Options:
 *   --limit N            Cap distinct DarkForums (ip, username) rows
 *   --username-limit N   Cap usernames per forum file
 *   --no-geolite         Skip GeoLite country enrichment
 *   --prefer-json        Use darkforums.json instead of ips.db when both exist
 */
import "dotenv/config";
import { client } from "../src/db";
import { importPublicData } from "../src/lib/ingest/public-data";

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function parseOptionalInt(flag: string): number | undefined {
  const raw = argValue(flag);
  if (raw === undefined) return undefined;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`${flag} expects a non-negative integer`);
  }
  return n;
}

async function main() {
  const ipLimit = parseOptionalInt("--limit");
  const usernameLimit = parseOptionalInt("--username-limit");
  const enrichCountry = !process.argv.includes("--no-geolite");
  const preferSqlite = !process.argv.includes("--prefer-json");

  const result = await importPublicData({
    ipLimit,
    usernameLimit,
    enrichCountry,
    preferSqlite,
  });

  console.log(JSON.stringify(result, null, 2));
  if (result.status === "error") process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
