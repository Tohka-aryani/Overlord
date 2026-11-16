import { and, eq } from "drizzle-orm";
import Parser from "rss-parser";
import { db } from "@/db";
import { ingestRuns, telegramMessages } from "@/db/schema";
import {
  buildTelegramRssUrl,
  normalizeTelegramRssItem,
  telegramChannels,
  type NormalizedTelegramMessage,
  type RssLikeItem,
} from "@/lib/ingest/telegram-normalize";

export {
  buildTelegramRssUrl,
  htmlToPlainText,
  normalizeTelegramRssItem,
  telegramChannels,
  telegramRssBase,
  type NormalizedTelegramMessage,
} from "@/lib/ingest/telegram-normalize";

const parser = new Parser({ timeout: 30_000 });

export type IngestTelegramResult = {
  source: string;
  status: "success" | "error";
  ingestRunId: number;
  counts: {
    channels: number;
    fetched: number;
    upserted: number;
    inserted: number;
    updated: number;
  };
  error?: string;
};

async function fetchChannel(
  channel: string,
  limit: number,
): Promise<NormalizedTelegramMessage[]> {
  const url = buildTelegramRssUrl(channel, limit);
  const feed = await parser.parseURL(url);
  const out: NormalizedTelegramMessage[] = [];
  for (const item of feed.items ?? []) {
    const n = normalizeTelegramRssItem(item as RssLikeItem, channel);
    if (n) out.push(n);
  }
  return out;
}

async function upsertMessages(
  records: NormalizedTelegramMessage[],
): Promise<{ inserted: number; updated: number; upserted: number }> {
  let inserted = 0;
  let updated = 0;

  for (const rec of records) {
    const [existing] = await db
      .select({ id: telegramMessages.id })
      .from(telegramMessages)
      .where(
        and(
          eq(telegramMessages.channel, rec.channel),
          eq(telegramMessages.messageId, rec.messageId),
        ),
      )
      .limit(1);

    if (existing) {
      await db
        .update(telegramMessages)
        .set({
          postedAt: rec.postedAt,
          text: rec.text,
          mediaKind: rec.mediaKind,
          mediaUrl: rec.mediaUrl,
          postUrl: rec.postUrl,
          updatedAt: new Date(),
        })
        .where(eq(telegramMessages.id, existing.id));
      updated += 1;
    } else {
      await db.insert(telegramMessages).values({
        channel: rec.channel,
        messageId: rec.messageId,
        postedAt: rec.postedAt,
        text: rec.text,
        mediaKind: rec.mediaKind,
        mediaUrl: rec.mediaUrl,
        postUrl: rec.postUrl,
      });
      inserted += 1;
    }
  }

  return { inserted, updated, upserted: inserted + updated };
}

/**
 * Poll Telegram channel RSS bridge(s) and upsert into telegram_messages.
 */
export async function ingestTelegram(opts?: {
  channels?: string[];
  limit?: number;
}): Promise<IngestTelegramResult> {
  const channels = opts?.channels?.length
    ? opts.channels
    : telegramChannels();
  const limit = opts?.limit ?? 50;
  const sourceLabel =
    channels.length === 1
      ? `telegram:${channels[0]}`
      : `telegram:${channels.join("+")}`;

  const [run] = await db
    .insert(ingestRuns)
    .values({
      source: sourceLabel,
      startedAt: new Date(),
      status: "running",
    })
    .returning({ id: ingestRuns.id });

  const ingestRunId = run!.id;
  const counts = {
    channels: channels.length,
    fetched: 0,
    upserted: 0,
    inserted: 0,
    updated: 0,
  };

  try {
    const all: NormalizedTelegramMessage[] = [];
    for (const ch of channels) {
      const rows = await fetchChannel(ch, limit);
      all.push(...rows);
    }
    counts.fetched = all.length;

    // Dedupe by channel+messageId (last wins)
    const map = new Map<string, NormalizedTelegramMessage>();
    for (const r of all) map.set(`${r.channel}:${r.messageId}`, r);
    const deduped = [...map.values()];

    const up = await upsertMessages(deduped);
    counts.upserted = up.upserted;
    counts.inserted = up.inserted;
    counts.updated = up.updated;

    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "success",
        counts,
      })
      .where(eq(ingestRuns.id, ingestRunId));

    return { source: sourceLabel, status: "success", ingestRunId, counts };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await db
      .update(ingestRuns)
      .set({
        finishedAt: new Date(),
        status: "error",
        counts,
        error,
      })
      .where(eq(ingestRuns.id, ingestRunId));
    return {
      source: sourceLabel,
      status: "error",
      ingestRunId,
      counts,
      error,
    };
  }
}
