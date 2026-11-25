# Apify Tor keyword scrape — implementation plan

> **For agentic workers:** Implement tasks in order. Spec: `docs/superpowers/specs/2026-11-24-apify-tor-keyword-scrape-design.md`.

**Goal:** Replace SOCKS Tor probes with Apify keyword scrape; unique URL; skip duplicates.

## File map

| File | Role |
| --- | --- |
| `src/db/schema.ts` + `drizzle/0004_tor_hits.sql` | `tor_hits`, drop old probe tables |
| `src/lib/apify/tor-scraper.ts` | Start run, wait, fetch items |
| `src/lib/tor/keywords.ts` | Read keyword file |
| `src/lib/ingest/tor-sites.ts` | Apify keyword ingest + skip dupes |
| `src/lib/tor-query.ts` + Tor UI/i18n | List hits |
| Compose / env / README / ARCHITECTURE | Remove SOCKS; Apify config |
| `data/tor-keywords.txt` | Example keywords |

## Tasks

1. Schema + migration  
2. Apify client + keywords + ingest (dedupe)  
3. Query + UI + i18n  
4. Remove SOCKS stack + docs  
5. Smoke: empty keywords skip; duplicate URL skipped  
