/**
 * Smoke-insert one row per table against Compose Postgres.
 * Usage: npx tsx scripts/smoke-db.ts
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { client, db } from "../src/db";
import {
  actorIps,
  actors,
  classifications,
  ingestRuns,
  newsItems,
  ransomwareVictims,
} from "../src/db/schema";

async function main() {
  const stamp = Date.now();
  const username = `smoke_actor_${stamp}`;
  const ip = `203.0.113.${stamp % 200}`;
  const newsLink = `https://example.com/smoke-news-${stamp}`;

  const [actor] = await db
    .insert(actors)
    .values({
      username,
      forums: ["darkforums"],
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    })
    .returning();

  const [actorIp] = await db
    .insert(actorIps)
    .values({
      actorId: actor.id,
      username,
      ip,
      hostname: "smoke.example",
      countryIso: "MY",
      source: "smoke",
    })
    .returning();

  const [victim] = await db
    .insert(ransomwareVictims)
    .values({
      victim: `Smoke Corp ${stamp}`,
      group: "smoke-group",
      country: "MY",
      sector: "Other",
      attackDate: "2026-11-11",
      claimUrl: "http://exampleonion.onion/claim",
      rawJson: { smoke: true, stamp },
    })
    .returning();

  const [news] = await db
    .insert(newsItems)
    .values({
      title: `Smoke news ${stamp}`,
      link: newsLink,
      publishedAt: new Date(),
      source: "smoke-rss",
      keywordHit: "ransomware Malaysia",
      summary: "Smoke insert for schema verification.",
    })
    .returning();

  const [classification] = await db
    .insert(classifications)
    .values({
      entityType: "ransomware",
      entityId: victim.id,
      threatLevel: "Info",
      category: "Other",
      malaysiaRelevance: "None",
      sector: "Other",
      confidence: 0.5,
      rationale: "Smoke test classification.",
      model: "smoke",
    })
    .returning();

  const [run] = await db
    .insert(ingestRuns)
    .values({
      source: "smoke",
      startedAt: new Date(),
      finishedAt: new Date(),
      status: "success",
      counts: { inserted: 6 },
      error: null,
    })
    .returning();

  // Unique-key sanity: re-select by natural keys
  const byIpUser = await db.query.actorIps.findFirst({
    where: eq(actorIps.ip, ip),
  });
  const byNewsLink = await db.query.newsItems.findFirst({
    where: eq(newsItems.link, newsLink),
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        ids: {
          actor: actor.id,
          actorIp: actorIp.id,
          victim: victim.id,
          news: news.id,
          classification: classification.id,
          ingestRun: run.id,
        },
        naturalKeys: {
          actorIpFound: Boolean(byIpUser),
          newsFound: Boolean(byNewsLink),
        },
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end({ timeout: 5 });
  });
