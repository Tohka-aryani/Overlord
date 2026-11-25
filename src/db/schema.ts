import {
  date,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/** Threat-actor usernames across forums. */
export const actors = pgTable(
  "actors",
  {
    id: serial("id").primaryKey(),
    username: text("username").notNull(),
    forums: text("forums").array().notNull().default([]),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("actors_username_uidx").on(t.username)],
);

/**
 * IPs linked to actors.
 * Natural upsert key: (ip, username) — username denormalized for source-keyed upserts.
 */
export const actorIps = pgTable(
  "actor_ips",
  {
    id: serial("id").primaryKey(),
    actorId: integer("actor_id")
      .notNull()
      .references(() => actors.id, { onDelete: "cascade" }),
    username: text("username").notNull(),
    ip: text("ip").notNull(),
    hostname: text("hostname"),
    countryIso: text("country_iso"),
    source: text("source"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("actor_ips_ip_username_uidx").on(t.ip, t.username)],
);

/** Ransomware victim / claim archive (ransomware.live + ransomlook.io). */
export const ransomwareVictims = pgTable(
  "ransomware_victims",
  {
    id: serial("id").primaryKey(),
    victim: text("victim").notNull(),
    group: text("group").notNull(),
    country: text("country"),
    sector: text("sector"),
    attackDate: date("attack_date").notNull(),
    claimUrl: text("claim_url"),
    /** Primary provider for display / last-writer preference. */
    source: text("source").notNull().default("ransomware.live"),
    /** All providers that have contributed this victim record. */
    sources: text("sources")
      .array()
      .notNull()
      .default(["ransomware.live"]),
    rawJson: jsonb("raw_json"),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("ransomware_victims_victim_group_attack_date_uidx").on(
      t.victim,
      t.group,
      t.attackDate,
    ),
  ],
);

/** Google News RSS hits (Malaysia CTI keywords). */
export const newsItems = pgTable(
  "news_items",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    link: text("link").notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    source: text("source"),
    keywordHit: text("keyword_hit"),
    summary: text("summary"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("news_items_link_uidx").on(t.link)],
);

/** Public Telegram channel posts (RSS bridge / preview ingest). */
export const telegramMessages = pgTable(
  "telegram_messages",
  {
    id: serial("id").primaryKey(),
    channel: text("channel").notNull(),
    messageId: text("message_id").notNull(),
    postedAt: timestamp("posted_at", { withTimezone: true }),
    text: text("text").notNull(),
    mediaKind: text("media_kind"),
    mediaUrl: text("media_url"),
    postUrl: text("post_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("telegram_messages_channel_message_uidx").on(
      t.channel,
      t.messageId,
    ),
  ],
);

/** LLM labels for ransomware / news / high-signal actors. */
export const classifications = pgTable("classifications", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  threatLevel: text("threat_level").notNull(),
  category: text("category").notNull(),
  malaysiaRelevance: text("malaysia_relevance").notNull(),
  sector: text("sector"),
  confidence: real("confidence"),
  rationale: text("rationale"),
  model: text("model"),
  classifiedAt: timestamp("classified_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/** Ingest job health / audit. */
export const ingestRuns = pgTable("ingest_runs", {
  id: serial("id").primaryKey(),
  source: text("source").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status").notNull(),
  counts: jsonb("counts"),
  error: text("error"),
});

/**
 * Apify Tor keyword-search hits (light archive).
 * Unique on normalized `url` — ingest skips duplicates.
 */
export const torHits = pgTable(
  "tor_hits",
  {
    id: serial("id").primaryKey(),
    url: text("url").notNull(),
    host: text("host"),
    query: text("query"),
    statusCode: integer("status_code"),
    ok: integer("ok").notNull().default(0),
    title: text("title"),
    searchTitle: text("search_title"),
    searchDescription: text("search_description"),
    textSnippet: text("text_snippet"),
    error: text("error"),
    apifyRunId: text("apify_run_id"),
    apifyDatasetId: text("apify_dataset_id"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [uniqueIndex("tor_hits_url_uidx").on(t.url)],
);
