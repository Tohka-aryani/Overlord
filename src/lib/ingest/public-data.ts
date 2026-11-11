import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { actorIps, actors, ingestRuns } from "@/db/schema";
import { openGeoLiteCountry, type CountryLookup } from "@/lib/geo/geolite-country";
import {
  DEFAULT_USERNAME_FILES,
  forumTagFromFilename,
  mergeForumTags,
  normalizeDarkforumsIpRow,
  parseDarkforumsJsonObject,
  parseUsernameFileContent,
  type NormalizedActorIp,
  type NormalizedActorUsername,
} from "@/lib/ingest/public-data-normalize";

const require = createRequire(import.meta.url);

export {
  DEFAULT_USERNAME_FILES,
  forumTagFromFilename,
  mergeForumTags,
  normalizeDarkforumsIpRow,
  parseDarkforumsJsonObject,
  parseUsernameFileContent,
  parseUsernameLine,
  type NormalizedActorIp,
  type NormalizedActorUsername,
} from "@/lib/ingest/public-data-normalize";

export type ImportPublicDataOptions = {
  dataDir?: string;
  /** Cap usernames read per forum file (demo-friendly). Omit for full file. */
  usernameLimit?: number;
  /** Cap distinct (ip, username) rows from DarkForums. Omit for full import. */
  ipLimit?: number;
  usernameFiles?: string[];
  /** Prefer ips.db when present; fall back to darkforums.json. */
  preferSqlite?: boolean;
  /** Enrich country_iso via local GeoLite2 MMDB when available. */
  enrichCountry?: boolean;
};

export type ImportPublicDataResult = {
  source: "public-data";
  status: "success" | "error";
  ingestRunId: number;
  counts: {
    usernameFiles: number;
    usernamesRead: number;
    actorsUpserted: number;
    actorsInserted: number;
    actorsUpdated: number;
    ipsRead: number;
    ipsUpserted: number;
    ipsInserted: number;
    ipsUpdated: number;
    countryEnriched: number;
  };
  error?: string;
};

function defaultDataDir(): string {
  return path.join(process.cwd(), "data");
}

export function readUsernameFile(
  filePath: string,
  limit?: number,
): NormalizedActorUsername[] {
  const content = fs.readFileSync(filePath, "utf8");
  const forum = forumTagFromFilename(filePath);
  return parseUsernameFileContent(content, forum, limit);
}

export function loadDarkforumsIpsFromSqlite(
  dbPath: string,
  limit?: number,
): NormalizedActorIp[] {
  // Node 22+ built-in; @types/node may lag behind.
  const { DatabaseSync } = require("node:sqlite") as {
    DatabaseSync: new (
      path: string,
      opts?: { readOnly?: boolean },
    ) => {
      prepare: (sql: string) => {
        all: (...params: unknown[]) => Record<string, unknown>[];
      };
      close: () => void;
    };
  };

  const conn = new DatabaseSync(dbPath, { readOnly: true });
  try {
    const sqlText =
      limit !== undefined
        ? `SELECT ip, username, hostname FROM (
             SELECT DISTINCT ip, username, hostname FROM data
             WHERE ip IS NOT NULL AND username IS NOT NULL
           ) LIMIT ?`
        : `SELECT DISTINCT ip, username, hostname FROM data
           WHERE ip IS NOT NULL AND username IS NOT NULL`;
    const stmt = conn.prepare(sqlText);
    const rows = limit !== undefined ? stmt.all(limit) : stmt.all();
    const out: NormalizedActorIp[] = [];
    for (const row of rows) {
      const n = normalizeDarkforumsIpRow(row);
      if (n) out.push(n);
    }
    return out;
  } finally {
    conn.close();
  }
}

export function loadDarkforumsIpsFromJson(
  jsonPath: string,
  limit?: number,
): NormalizedActorIp[] {
  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as unknown;
  return parseDarkforumsJsonObject(raw, limit);
}

export function loadDarkforumsIps(
  darkforumsDir: string,
  options?: { limit?: number; preferSqlite?: boolean },
): { rows: NormalizedActorIp[]; sourceFile: string | null } {
  const preferSqlite = options?.preferSqlite !== false;
  const sqlitePath = path.join(darkforumsDir, "ips.db");
  const jsonPath = path.join(darkforumsDir, "darkforums.json");

  if (preferSqlite && fs.existsSync(sqlitePath)) {
    return {
      rows: loadDarkforumsIpsFromSqlite(sqlitePath, options?.limit),
      sourceFile: sqlitePath,
    };
  }
  if (fs.existsSync(jsonPath)) {
    return {
      rows: loadDarkforumsIpsFromJson(jsonPath, options?.limit),
      sourceFile: jsonPath,
    };
  }
  if (!preferSqlite && fs.existsSync(sqlitePath)) {
    return {
      rows: loadDarkforumsIpsFromSqlite(sqlitePath, options?.limit),
      sourceFile: sqlitePath,
    };
  }
  return { rows: [], sourceFile: null };
}

async function upsertActor(
  username: string,
  forum: string,
  now: Date,
): Promise<"inserted" | "updated"> {
  const existing = await db.query.actors.findFirst({
    where: eq(actors.username, username),
    columns: { id: true, forums: true, firstSeenAt: true },
  });

  if (existing) {
    const forums = mergeForumTags(existing.forums, forum);
    await db
      .update(actors)
      .set({
        forums,
        lastSeenAt: now,
        firstSeenAt: existing.firstSeenAt ?? now,
      })
      .where(eq(actors.id, existing.id));
    return "updated";
  }

  await db.insert(actors).values({
    username,
    forums: [forum.toLowerCase()],
    firstSeenAt: now,
    lastSeenAt: now,
  });
  return "inserted";
}

async function ensureActorId(
  username: string,
  forum: string,
  now: Date,
  cache: Map<string, number>,
): Promise<number> {
  const key = username.toLowerCase();
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  const existing = await db.query.actors.findFirst({
    where: eq(actors.username, username),
    columns: { id: true, username: true, forums: true, firstSeenAt: true },
  });

  if (existing) {
    const forums = mergeForumTags(existing.forums, forum);
    await db
      .update(actors)
      .set({
        forums,
        lastSeenAt: now,
        firstSeenAt: existing.firstSeenAt ?? now,
      })
      .where(eq(actors.id, existing.id));
    cache.set(key, existing.id);
    return existing.id;
  }

  const [row] = await db
    .insert(actors)
    .values({
      username,
      forums: [forum.toLowerCase()],
      firstSeenAt: now,
      lastSeenAt: now,
    })
    .returning({ id: actors.id });
  cache.set(key, row.id);
  return row.id;
}

async function upsertActorIp(
  actorId: number,
  row: NormalizedActorIp,
): Promise<"inserted" | "updated"> {
  const existing = await db.query.actorIps.findFirst({
    where: and(eq(actorIps.ip, row.ip), eq(actorIps.username, row.username)),
    columns: { id: true },
  });

  if (existing) {
    await db
      .update(actorIps)
      .set({
        actorId,
        hostname: row.hostname,
        countryIso: row.countryIso,
        source: row.source,
      })
      .where(eq(actorIps.id, existing.id));
    return "updated";
  }

  await db.insert(actorIps).values({
    actorId,
    username: row.username,
    ip: row.ip,
    hostname: row.hostname,
    countryIso: row.countryIso,
    source: row.source,
  });
  return "inserted";
}

function enrichRows(
  rows: NormalizedActorIp[],
  geo: CountryLookup | null,
): { rows: NormalizedActorIp[]; enriched: number } {
  if (!geo) return { rows, enriched: 0 };
  let enriched = 0;
  const out = rows.map((r) => {
    if (r.countryIso) return r;
    const iso = geo.lookup(r.ip);
    if (!iso) return r;
    enriched += 1;
    return { ...r, countryIso: iso };
  });
  return { rows: out, enriched };
}

export async function importPublicData(
  options: ImportPublicDataOptions = {},
): Promise<ImportPublicDataResult> {
  const dataDir = options.dataDir ?? defaultDataDir();
  const usernamesDir = path.join(dataDir, "usernames");
  const darkforumsDir = path.join(dataDir, "darkforums");
  const fileNames = options.usernameFiles ?? [...DEFAULT_USERNAME_FILES];
  const now = new Date();

  const [run] = await db
    .insert(ingestRuns)
    .values({
      source: "public-data",
      startedAt: now,
      status: "running",
      counts: {},
    })
    .returning({ id: ingestRuns.id });

  const counts: ImportPublicDataResult["counts"] = {
    usernameFiles: 0,
    usernamesRead: 0,
    actorsUpserted: 0,
    actorsInserted: 0,
    actorsUpdated: 0,
    ipsRead: 0,
    ipsUpserted: 0,
    ipsInserted: 0,
    ipsUpdated: 0,
    countryEnriched: 0,
  };

  try {
    for (const name of fileNames) {
      const filePath = path.isAbsolute(name)
        ? name
        : path.join(usernamesDir, name);
      if (!fs.existsSync(filePath)) continue;
      counts.usernameFiles += 1;
      const rows = readUsernameFile(filePath, options.usernameLimit);
      counts.usernamesRead += rows.length;
      for (const row of rows) {
        const result = await upsertActor(row.username, row.forum, now);
        counts.actorsUpserted += 1;
        if (result === "inserted") counts.actorsInserted += 1;
        else counts.actorsUpdated += 1;
      }
    }

    const { rows: rawIps, sourceFile } = loadDarkforumsIps(darkforumsDir, {
      limit: options.ipLimit,
      preferSqlite: options.preferSqlite,
    });

    let geo: CountryLookup | null = null;
    if (options.enrichCountry !== false) {
      geo = openGeoLiteCountry(
        path.join(darkforumsDir, "GeoLite2-Country.mmdb"),
      );
    }
    const { rows: ipRows, enriched } = enrichRows(rawIps, geo);
    geo?.close();
    counts.countryEnriched = enriched;
    counts.ipsRead = ipRows.length;

    if (!sourceFile && ipRows.length === 0) {
      // Still success if usernames imported; note missing IP source in counts only.
    }

    const actorCache = new Map<string, number>();
    for (const row of ipRows) {
      const actorId = await ensureActorId(
        row.username,
        "darkforums",
        now,
        actorCache,
      );
      const result = await upsertActorIp(actorId, row);
      counts.ipsUpserted += 1;
      if (result === "inserted") counts.ipsInserted += 1;
      else counts.ipsUpdated += 1;
    }

    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "success",
        counts,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      source: "public-data",
      status: "success",
      ingestRunId: run.id,
      counts,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "error",
        counts,
        error: message,
      })
      .where(eq(ingestRuns.id, run.id));

    return {
      source: "public-data",
      status: "error",
      ingestRunId: run.id,
      counts,
      error: message,
    };
  }
}
