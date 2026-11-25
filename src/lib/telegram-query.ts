import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { ingestRuns, telegramMessages } from "@/db/schema";

export type TelegramMessageRow = {
  id: number;
  channel: string;
  messageId: string;
  postedAt: string | null;
  text: string;
  mediaKind: string | null;
  mediaUrl: string | null;
  postUrl: string;
  createdAt: string;
};

export type TelegramQueryResult = {
  channel: string;
  q: string;
  items: TelegramMessageRow[];
  total: number;
  lastIngest: {
    status: string;
    finishedAt: string | null;
    counts: unknown;
    error: string | null;
  } | null;
};

function iso(d: Date | null | undefined): string | null {
  if (!d) return null;
  return d.toISOString();
}

export async function queryTelegram(opts?: {
  channel?: string;
  limit?: number;
  q?: string;
}): Promise<TelegramQueryResult> {
  const channel = (opts?.channel ?? "breachdetect").trim().replace(/^@/, "").toLowerCase();
  const limit = Math.min(300, Math.max(1, opts?.limit ?? 300));
  const q = (opts?.q ?? "").trim().slice(0, 120);

  const conditions = [eq(telegramMessages.channel, channel)];
  if (q) {
    const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(telegramMessages.text, pattern),
        ilike(telegramMessages.messageId, pattern),
        ilike(telegramMessages.mediaKind, pattern),
      )!,
    );
  }
  const where = and(...conditions);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(telegramMessages)
    .where(where);

  const rows = await db
    .select()
    .from(telegramMessages)
    .where(where)
    .orderBy(desc(telegramMessages.postedAt), desc(telegramMessages.id))
    .limit(limit);

  const [run] = await db
    .select({
      status: ingestRuns.status,
      finishedAt: ingestRuns.finishedAt,
      counts: ingestRuns.counts,
      error: ingestRuns.error,
    })
    .from(ingestRuns)
    .where(eq(ingestRuns.source, `telegram:${channel}`))
    .orderBy(desc(ingestRuns.startedAt))
    .limit(1);

  return {
    channel,
    q,
    total: countRow?.count ?? 0,
    items: rows.map((r) => ({
      id: r.id,
      channel: r.channel,
      messageId: r.messageId,
      postedAt: iso(r.postedAt),
      text: r.text,
      mediaKind: r.mediaKind,
      mediaUrl: r.mediaUrl,
      postUrl: r.postUrl,
      createdAt: iso(r.createdAt)!,
    })),
    lastIngest: run
      ? {
          status: run.status,
          finishedAt: iso(run.finishedAt),
          counts: run.counts,
          error: run.error,
        }
      : null,
  };
}
