# Telegram live feed (@breachdetect) — Design

**Date:** 2026-11-12  
**Status:** Approved (approach A)

## Goal

Live-feeling scroll of [@breachdetect](https://t.me/breachdetect) (Data Leak Monitor) in the Telegram tab. Ingest → Postgres → UI (same archive pattern as News).

## Fetch strategy

Telegram’s public HTML preview (`t.me/s/{channel}`) currently **302-redirects** to a non-message landing page from server-side fetchers. Primary source:

- `https://tg.i-c-a.su/rss/{channel}?limit=50` (RSS bridge of the public channel)

Config: `TELEGRAM_CHANNELS=breachdetect` (comma-separated), optional `TELEGRAM_RSS_BASE=https://tg.i-c-a.su/rss`.

Fallback later: MTProto user client if the bridge dies.

## Data

Table `telegram_messages`:

| Column | Notes |
|--------|--------|
| channel | e.g. `breachdetect` |
| message_id | numeric id from `t.me/{channel}/{id}` |
| posted_at | from RSS `pubDate` |
| text | plain text (HTML stripped; JSON blobs kept readable) |
| media_kind / media_url | optional enclosure / image |
| post_url | canonical `https://t.me/{channel}/{id}` |
| unique (channel, message_id) | upsert key |

`ingest_runs.source` = `telegram:breachdetect`.

## API / UI

- `POST/GET /api/ingest/telegram` — cron-auth, fetch+upsert
- `GET /api/telegram?channel=&limit=` — read archive
- `/telegram` — chronological feed, last-ingest stamp, link out to `t.me`

## Out of scope

MTProto, bot admin, LLM classify, Overview “needs attention”, media mirroring to disk.
