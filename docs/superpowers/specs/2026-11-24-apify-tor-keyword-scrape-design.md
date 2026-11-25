# Apify Tor keyword scrape — design

**Date:** 2026-11-24  
**Status:** Approved (user: keywords only, replace SOCKS, light storage, no duplicate rows)

## Goal

Replace local Tor SOCKS reachability probes with [igolaizola/tor-dark-web-scraper](https://apify.com/igolaizola/tor-dark-web-scraper) keyword search. Overlord owns keywords in a text file; Apify runs Tor in the cloud; results land in Postgres; `/tor` stays archive-only.

## Decisions

| Topic | Choice |
| --- | --- |
| Mode | Keywords only (`queries`), no claim-URL scrape in v1 |
| Keywords | All lines from `data/tor-keywords.txt` every run |
| Cap | `maxItems: 10` (10 page hits / hour) |
| Storage | Light: url, status, title, keyword metadata, truncated text (~16KB), error, Apify ids — no HTML |
| Dedupe | Unique index on normalized `url`; existing URLs are **skipped** (no second row, no overwrite) |
| SOCKS | Removed (Compose `tor`, `TOR_SOCKS_*`, probe helpers) |
| Integration | Swap ingest behind existing `/tor` |

## Flow

```
tor-keywords.txt → POST /api/ingest/tor-sites (~hourly)
  → Apify actor run (queries + maxItems 10)
  → dataset items (omit html)
  → insert new urls only → tor_hits
  → GET /api/tor → /tor UI
```

## Schema

`tor_hits` replaces `tor_sites` / `tor_site_checks`:

- `url` text **unique** (normalized: trim, lowercase scheme/host where safe)
- `host`, `query` (keyword that produced the hit when known), `status_code`, `ok`
- `title`, `search_title`, `search_description`, `text_snippet`, `error`
- `apify_run_id`, `apify_dataset_id`
- `first_seen_at`, `last_seen_at` (last_seen only set on first insert; skips leave row untouched)

## Config

- `APIFY_TOKEN`
- `APIFY_TOR_ACTOR_ID` default `igolaizola~tor-dark-web-scraper`
- `APIFY_TOR_MAX_ITEMS` default `10`
- `TOR_KEYWORDS_FILE` default `data/tor-keywords.txt`
- `INGEST_TOR_EVERY` default `4` (≈1h at 15m cycle)

## Trust

- Browser never opens `.onion`.
- Ingest privileged (`CRON_SECRET`).
- Dummy tokens only in `.env.example`.
