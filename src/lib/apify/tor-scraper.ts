/**
 * Client for igolaizola/tor-dark-web-scraper via Apify REST API.
 * @see https://apify.com/igolaizola/tor-dark-web-scraper
 */

export type ApifyTorItem = {
  url?: string;
  statusCode?: number;
  title?: string;
  text?: string;
  html?: string;
  error?: string;
  searchTitle?: string;
  searchDescription?: string;
  fields?: Record<string, unknown>;
};

export type ApifyTorRunResult = {
  runId: string;
  datasetId: string;
  status: string;
  items: ApifyTorItem[];
};

const TERMINAL = new Set([
  "SUCCEEDED",
  "FAILED",
  "TIMED-OUT",
  "ABORTED",
]);

function apifyToken(): string {
  const t = (process.env.APIFY_TOKEN ?? "").trim();
  if (!t) throw new Error("APIFY_TOKEN is not set");
  return t;
}

function actorId(): string {
  return (
    process.env.APIFY_TOR_ACTOR_ID?.trim() || "igolaizola~tor-dark-web-scraper"
  );
}

function maxItems(): number {
  const n = Number.parseInt(process.env.APIFY_TOR_MAX_ITEMS ?? "10", 10);
  return Number.isFinite(n) ? Math.min(Math.max(n, 1), 50) : 10;
}

function apiBase(): string {
  return "https://api.apify.com/v2";
}

type RunPayload = {
  data?: {
    id?: string;
    status?: string;
    defaultDatasetId?: string;
  };
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Apify HTTP ${res.status}: ${body.slice(0, 240)}`);
  }
  return (await res.json()) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Poll until terminal status. Apify waitForFinish alone often returns READY/RUNNING. */
async function waitForRun(
  runId: string,
  token: string,
  maxWaitSecs: number,
): Promise<{ status: string; datasetId: string }> {
  const deadline = Date.now() + maxWaitSecs * 1000;
  let lastStatus = "UNKNOWN";
  let datasetId = "";

  while (Date.now() < deadline) {
    const url =
      `${apiBase()}/actor-runs/${encodeURIComponent(runId)}` +
      `?token=${encodeURIComponent(token)}`;
    const payload = await getJson<RunPayload>(url);
    lastStatus = payload.data?.status ?? "UNKNOWN";
    datasetId = payload.data?.defaultDatasetId ?? datasetId;
    if (TERMINAL.has(lastStatus)) {
      return { status: lastStatus, datasetId };
    }
    await sleep(10_000);
  }

  throw new Error(
    `Apify run ${runId} still ${lastStatus} after ${maxWaitSecs}s`,
  );
}

/**
 * Start actor with keyword queries, wait for finish, fetch dataset (no HTML).
 */
export async function runTorKeywordScrape(
  queries: string[],
  opts?: { maxItems?: number; waitSecs?: number },
): Promise<ApifyTorRunResult> {
  if (queries.length === 0) {
    throw new Error("No keywords to scrape");
  }

  const token = apifyToken();
  const id = encodeURIComponent(actorId());
  const limit = opts?.maxItems ?? maxItems();
  const waitSecs = opts?.waitSecs ?? 1500;

  // Start without relying on waitForFinish (platform caps it; Tor runs are slow).
  const startUrl = `${apiBase()}/acts/${id}/runs?token=${encodeURIComponent(token)}`;
  const startRes = await fetch(startUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      urls: [],
      queries,
      maxItems: limit,
      selectors: [],
    }),
    cache: "no-store",
  });

  if (!startRes.ok) {
    const body = await startRes.text().catch(() => "");
    throw new Error(`Apify start HTTP ${startRes.status}: ${body.slice(0, 240)}`);
  }

  const started = (await startRes.json()) as RunPayload;
  const runId = started.data?.id;
  let datasetId = started.data?.defaultDatasetId ?? "";

  if (!runId) {
    throw new Error("Apify run missing id");
  }

  const finished = await waitForRun(runId, token, waitSecs);
  datasetId = finished.datasetId || datasetId;
  if (!datasetId) {
    throw new Error(`Apify run ${runId} missing defaultDatasetId`);
  }

  if (finished.status !== "SUCCEEDED") {
    throw new Error(`Apify run ${runId} ended with status ${finished.status}`);
  }

  const itemsUrl =
    `${apiBase()}/datasets/${encodeURIComponent(datasetId)}/items` +
    `?token=${encodeURIComponent(token)}&format=json&clean=true&omit=html`;

  const items = await getJson<ApifyTorItem[]>(itemsUrl);
  const list = Array.isArray(items) ? items : [];
  // Actor sometimes ignores maxItems; enforce the budget here.
  const capped = list.slice(0, limit);

  return {
    runId,
    datasetId,
    status: finished.status,
    items: capped,
  };
}

export { maxItems as apifyTorMaxItems };
