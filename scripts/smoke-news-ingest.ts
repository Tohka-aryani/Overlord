/**
 * Manual smoke: run Google News MY keyword RSS ingest once.
 * Usage: npx tsx scripts/smoke-news-ingest.ts
 */
import "dotenv/config";
import { client } from "../src/db";
import { ingestNews } from "../src/lib/ingest/news";

async function main() {
  const result = await ingestNews();
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== "success") {
    process.exitCode = 1;
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
