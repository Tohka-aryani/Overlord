/**
 * Download DarkForums IP intel + selected Threat-Actor username lists into data/
 * (gitignored). Does not vendor GeoLite / large binaries in git.
 *
 * Usage: npx tsx scripts/download-public-data.ts
 *        npx tsx scripts/download-public-data.ts --skip-geolite
 *        npx tsx scripts/download-public-data.ts --with-json
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "data");
const USERNAMES_DIR = path.join(ROOT, "usernames");
const DARKFORUMS_DIR = path.join(ROOT, "darkforums");

const USERNAME_FILES = [
  "forum_users_darkforums.txt",
  "forum_users_hackforums.txt",
  "forum_users_cracked.txt",
  "forum_users_xss.txt",
  "forum_users_breached2026.txt",
] as const;

const USERNAMES_BASE =
  "https://raw.githubusercontent.com/spmedia/Threat-Actor-Usernames-Scrape/main";
const DARKFORUMS_BASE =
  "https://raw.githubusercontent.com/Ivancastl/darkforums-ip-intel/main";

async function download(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} → ${res.status} ${res.statusText}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, buf);
  console.log(`ok ${path.relative(process.cwd(), dest)} (${buf.length} bytes)`);
}

async function main() {
  const args = new Set(process.argv.slice(2));
  const skipGeolite = args.has("--skip-geolite");
  const withJson = args.has("--with-json");

  fs.mkdirSync(USERNAMES_DIR, { recursive: true });
  fs.mkdirSync(DARKFORUMS_DIR, { recursive: true });

  for (const name of USERNAME_FILES) {
    await download(`${USERNAMES_BASE}/${name}`, path.join(USERNAMES_DIR, name));
  }

  await download(
    `${DARKFORUMS_BASE}/ips.db`,
    path.join(DARKFORUMS_DIR, "ips.db"),
  );

  if (withJson) {
    console.log("Downloading darkforums.json (~41MB)…");
    await download(
      `${DARKFORUMS_BASE}/darkforums.json`,
      path.join(DARKFORUMS_DIR, "darkforums.json"),
    );
  }

  if (!skipGeolite) {
    console.log("Downloading GeoLite2-Country.mmdb (~9MB, optional)…");
    await download(
      `${DARKFORUMS_BASE}/GeoLite2-Country.mmdb`,
      path.join(DARKFORUMS_DIR, "GeoLite2-Country.mmdb"),
    );
  }

  console.log("\nDone. Import a demo subset with:");
  console.log(
    "  npx tsx scripts/import-public-data.ts --limit 2000 --username-limit 500",
  );
  console.log("Full import (large):");
  console.log("  npx tsx scripts/import-public-data.ts");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
