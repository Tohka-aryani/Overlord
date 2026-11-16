# Public Data forum filter + RansomLook dual-feed + NexAtlas ransomware UI

**Date:** 2026-11-12  
**Status:** Approved in chat (Approach B / storage Approach 2)  
**Product:** Overlord (Dark Web Monitoring)

## Goals

1. **Public Data:** add a **Forum** filter so analysts can narrow actors by forum membership.
2. **Ransomware:** ingest **RansomLook** as a second live source alongside ransomware.live ([API docs](https://www.ransomlook.io/doc/), site [ransomlook.io](https://www.ransomlook.io/)).
3. **Ransomware UI:** restyle to the NexAtlas Geospace V3 **Leak sites** pattern (stats, filters, charts, expandable table) using Overlord tokens.

## Non-goals

- Full RansomLook export DB dump (API-key export).
- Scraping onion claim sites (claim URLs remain text-only / never fetched).
- Forking Overlord into NexAtlas cyan theme globally — ransomware page adopts layout/density, not a wholesale token rewrite.

## Public Data — forum filter

### Behaviour

- Toolbar control next to **Country**: `Forum` select (`All` + distinct forum values from archive).
- Filters:
  - Browse list (`/api/public-data/actors`) — already supports `?forum=`
  - Search suggestions (`/api/public-data/search`) — add optional `forum` query param
  - When an actor is selected, IP list is unchanged; forum filter mainly scopes discovery lists
- Changing forum clears map focus (`focusIp`) and does not clear a selected actor unless that actor is not in the filtered browse set (optional: keep selection).

### API

| Endpoint | Change |
|---|---|
| `GET /api/public-data/actors?forum=` | Already implemented |
| `GET /api/public-data/search?q=&forum=` | Add `forum` filter (`forum = ANY(actors.forums)`) |
| `GET /api/public-data/forums` (optional) | Return distinct forum strings for the select; or derive client-side from browse payload |

**Recommendation:** small `GET /api/public-data/forums` for stable dropdown without loading full actor list.

## Ransomware — dual source archive

### Storage (Approach 2)

Extend `ransomware_victims`:

| Column | Type | Notes |
|---|---|---|
| `source` | `text not null default 'ransomware.live'` | `'ransomware.live'` \| `'ransomlook.io'` |
| Unique key | keep `(victim, group, attack_date)` | Cross-source upsert: same victim/group/date updates row; prefer richer fields; set `source` to last writer **or** store primary source and note dual in `raw_json` |

**Dedupe rule:** upsert on `(victim, group, attack_date)`. On conflict, merge: fill nulls from incoming; append `raw_json.sources[]` with both payloads when both have been seen; set `source` to a canonical primary (`ransomware.live` if either side is live, else `ransomlook.io`) for filter simplicity — **or** keep last ingest source and expose `sources` array in API.

**Recommendation:** add nullable `sources text[]` defaulting to `{source}`; on merge, union the array. UI source filter matches `source = X OR X = ANY(sources)`.

### Ingest — RansomLook

| Endpoint | Use |
|---|---|
| `GET https://www.ransomlook.io/api/recent` | Last ~100 posts (fast poll) |
| `GET https://www.ransomlook.io/api/posts?days=N` | Windowed backfill (7/30) |
| `GET https://www.ransomlook.io/api/search?q=malaysia` | MY-oriented enrichment (live API uses `q`, not `query`) |

Normalize to existing victim record shape:

- `victim` ← `post_title`
- `group` ← `group_name`
- `attackDate` ← date portion of `discovered`
- `claimUrl` ← `link` if present (text only)
- `country` ← null unless search/heuristic tags MY; Ollama `malaysia_relevance` remains authority for MY watch
- `sector` ← null (classifier may fill)
- `rawJson` ← full post object + `provider: ransomlook.io`

Cron route: `POST /api/ingest/ransomlook` with `x-cron-secret` (mirror ransomware ingest). Optionally call from the same schedule as ransomware.live.

Classify new inserts via existing `classifyEntity` / Ollama resolve (`llama3.2:latest` NexAtlas fallback).

### Read API

`GET /api/ransomware`:

- Query: `country=MY|ALL`, `source=all|ransomware.live|ransomlook.io`, `days?`, `group?`, `q?`
- Response includes `source` / `sources`, classification, counts by source for stats strip

## Ransomware UI — NexAtlas Leak sites inspiration

Reference: Geospace V3 `LeakSitesTab` (filters, Stat strip, ColumnChart by day, BarList by group, expandable posts table, source status line).

### Layout

1. **Header** — title + short copy; source links to [ransomware.live](https://www.ransomware.live) and [RansomLook](https://www.ransomlook.io/)
2. **Filter bar** — search, window (7/30/90), MY toggle, source segmented control, active filter chips
3. **Stats** — posts, groups, countries, MY victims (this window)
4. **Charts** — posts/day; most active groups (click → filter)
5. **Table** — discovered, victim, group, country, sector, source, threat; row expand for rationale / claim URL text / raw summary
6. **Density** — panel seams, compact controls, sticky table header; fluid padding (`px-4 sm:px-6 lg:px-8`); fits viewport without fixed “too tall” map patterns (no map on this page)

### Visual

- Keep Overlord Night/Day tokens and fonts (Syne / IBM Plex)
- Borrow NexAtlas structure: Surface/Panel/Stat/Segmented equivalents as local Overlord components (or inline) — do not import Geospace CSS wholesale
- Accent for MY / critical stays Overlord `--threat` / `--accent`

## Testing

- Unit: RansomLook normalizer; forum search filter; source merge/dedupe
- Integration: ingest smoke against live RansomLook API (LAN); `POST` cron auth
- UI: Public Data forum select filters browse; Ransomware source filter toggles rows; MY + window behave

## Risks

- RansomLook posts often lack ISO country → MY scope depends on search + LLM, not perfect geo
- Deduping across providers may collide on similar titles with different dates — unique key includes `attack_date`
- Rate limits unknown — keep ingest polite (single sequential fetch, backoff on 429)

## Open decisions (locked)

- Dual feed: **yes** (B)
- Storage: **shared table + source field** (Approach 2)
- UI model: **NexAtlas Leak sites**
