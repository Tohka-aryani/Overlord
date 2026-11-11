/**
 * Manual smoke: run ransomware.live MY ingest once.
 * Usage: npx tsx scripts/smoke-ransomware-ingest.ts
 */
import "dotenv/config";
import { client } from "../src/db";
import { ingestRansomware } from "../src/lib/ingest/ransomware";

async function main() {
  const result = await ingestRansomware({ country: "MY" });
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
