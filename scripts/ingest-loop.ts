/**
 * Continuous archive ingest for all Overlord sources (LAN / local).
 *
 * Cycles: ransomware.live (MY + periodic ALL) → ransomlook → news → telegram → classify.
 * Respects ransomware.live ~1 req/min free-tier pacing inside the ingest modules.
 *
 * Usage: npm run ingest:loop
 */
import "dotenv/config";

const BASE = process.env.INGEST_BASE_URL ?? "http://127.0.0.1:3000";
const SECRET = process.env.CRON_SECRET ?? "";
const CYCLE_MS = Number(process.env.INGEST_CYCLE_MS ?? 15 * 60_000); // 15 min between full cycles
const ALL_EVERY = Number(process.env.INGEST_ALL_EVERY ?? 4); // every N cycles run country=ALL

if (!SECRET) {
  console.error("CRON_SECRET is required (.env)");
  process.exit(1);
}

type Job = { name: string; path: string };

async function post(path: string): Promise<{ ok: boolean; status: number; body: string }> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "x-cron-secret": SECRET,
      Accept: "application/json",
    },
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 400) };
}

function stamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19) + "Z";
}

async function runCycle(cycle: number): Promise<void> {
  const jobs: Job[] = [
    { name: "ransomware.live MY", path: "/api/ingest/ransomware?country=MY" },
    { name: "ransomlook 90d", path: "/api/ingest/ransomlook?days=90" },
    { name: "news", path: "/api/ingest/news" },
    { name: "telegram", path: "/api/ingest/telegram" },
    { name: "classify-backfill", path: "/api/ingest/classify-backfill" },
  ];

  if (cycle % ALL_EVERY === 0) {
    jobs.unshift({
      name: "ransomware.live ALL",
      path: "/api/ingest/ransomware?country=ALL",
    });
  }

  console.log(`\n[${stamp()}] cycle ${cycle} — ${jobs.length} jobs`);

  for (const job of jobs) {
    const started = Date.now();
    process.stdout.write(`  → ${job.name} … `);
    try {
      const r = await post(job.path);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      if (r.ok) {
        console.log(`ok ${r.status} (${secs}s)`);
      } else {
        console.log(`FAIL ${r.status} (${secs}s) ${r.body}`);
      }
    } catch (err) {
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      console.log(`ERROR (${secs}s) ${err instanceof Error ? err.message : err}`);
    }
  }
}

async function main() {
  console.log(
    `[${stamp()}] Overlord ingest loop · base=${BASE} · cycle=${CYCLE_MS / 1000}s · ALL every ${ALL_EVERY}`,
  );
  let cycle = 0;
  // Run immediately, then on interval.
  for (;;) {
    cycle += 1;
    await runCycle(cycle);
    console.log(`[${stamp()}] sleeping ${CYCLE_MS / 1000}s`);
    await new Promise((r) => setTimeout(r, CYCLE_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
