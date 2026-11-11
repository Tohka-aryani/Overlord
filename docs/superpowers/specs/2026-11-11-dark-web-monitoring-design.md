# Dark Web Monitoring Dashboard — Design Spec

**Date:** 2026-11-11  
**Status:** Approved in brainstorming (pending final user review of this file)

## Purpose

Malaysia-first live dashboard for dark-web / CTI monitoring. Analysts should see high-threat Malaysia-relevant signals in under ~10 seconds, drill into Public Data / Ransomware / News, and trust archived + LLM-labeled records. Telegram is out of scope for v1 (placeholder only).

## Decisions locked

| Decision | Choice |
| --- | --- |
| Stack | Next.js App Router monolith |
| Archive DB | PostgreSQL via Docker Compose + Drizzle |
| LLM | Ollama `qwen2.5:14b` at `http://192.168.100.140` |
| Geographic focus | Malaysia-first everywhere |
| Architecture | Approach 1: Next.js + Compose (UI, API, ingest, classify) |
| Layout | Ops rail (left nav + main stage) |
| Visual | Night ops console (charcoal, amber threat accent) |
| Auth (v1) | Local/LAN only; no public auth |
| Design systems | Design with Intent + Impeccable (PRODUCT.md / DESIGN.md) |

## Information architecture

1. **Overview** — MY pulse: key counts, ranked “needs attention”, ingest health  
2. **Public Data** — DarkForums IP intel + Threat-Actor username lists (unified)  
3. **Ransomware** — ransomware.live archive; default `MY`, optional global  
4. **News** — Google News RSS with Malaysia CTI keywords  
5. **Telegram** — “Coming soon” empty state  

## System shape

```text
Sources → Next.js ingest jobs → Postgres archive
                ↓
         Ollama classifier → classifications table
                ↓
         API routes → Ops-rail dashboard UI
```

Compose services: `web` (Next.js), `db` (Postgres). Ollama is external on LAN.

Sources:

- [darkforums-ip-intel](https://github.com/Ivancastl/darkforums-ip-intel) — IPs / usernames / GeoIP map patterns  
- [Threat-Actor-Usernames-Scrape](https://github.com/spmedia/Threat-Actor-Usernames-Scrape) — forum username lists  
- [ransomware.live API v2](https://www.ransomware.live/apidocs) — no auth; rate-limited  
- Google News RSS — Malaysia-specific keyword queries  

## Data model

- `actors` — username, forums[], first/last seen  
- `actor_ips` — actor_id, ip, hostname, country_iso, source  
- `ransomware_victims` — victim, group, country, sector, attack_date, claim_url (stored, never fetched), raw_json, discovered_at  
- `news_items` — title, link, published_at, source, keyword_hit, summary  
- `classifications` — entity_type + entity_id, threat_level, category, malaysia_relevance, sector, confidence, rationale, model, classified_at  
- `ingest_runs` — source, timing, status, counts, error  

Natural keys for upsert: `(ip, username)`, `(victim, group, attack_date)`, `news.link`.

## Ingest

- **Ransomware:** poll `countryvictims/MY` and `countrycyberattacks/MY`; optionally archive recent global for toggle; respect ~1 req/min/endpoint on free API; backoff on 429  
- **RSS:** fixed MY keyword set (ransomware / data breach / cyber attack / Bank Negara & critical infra / dark web Malaysia); dedupe by link  
- **Public Data:** import DarkForums DB/export + username list files into `actors` / `actor_ips`; cross-link usernames across forums  

## LLM classification

Model: `qwen2.5:14b` via Ollama HTTP API.

Fields:

- Threat Level: Critical | High | Medium | Low | Info  
- Category: Ransomware | Breach | Infostealer | Forum Actor | Hacktivism | Fraud | Vulnerability | Other  
- Malaysia relevance: Direct | Indirect | None  
- Sector: Finance | Gov | Telco | Healthcare | Energy | Education | Other  
- confidence 0–1, one-line rationale  

Apply to new ransomware + news (optional high-signal actors). If Ollama is down, archive as unclassified and retry later.

## UI / UX

**Intent:** Notice what matters; one primary action per view; accessible; no dark patterns.

**Impeccable anti-slop:** No chip soup, nested cards, purple glow, pulsing LIVE dots, italic-serif AI aesthetic.

**Shell:** Left rail nav + main stage. Brand “RAVEN · MY” (or project name) as strong identity in chrome. Tables/lists first; detail drawer for ransomware/news; Public Data combines actor search + map.

**Threat hierarchy:** Critical/High amber/warning must dominate chrome.

## Reliability & security

- Idempotent ingest  
- Never fetch Tor onion `claim_url`s  
- Optional `IPINFO_TOKEN`; GeoLite/country fallback for map  
- Ingest health visible on Overview (no silent stale LIVE)  
- Secrets in `.env`; LAN bind for v1  

## Testing

- Unit: parsers, dedupe keys, classification JSON schema  
- Integration: ingest → DB → MY-default API filters  
- Manual: Ollama classify sample victim + news; actor search + map  

## Out of scope (v1)

- Telegram live integration  
- Public internet deployment / multi-user auth  
- Fetching or browsing Tor leak sites  
- Full reimplementation of every username list as live scrape (use published lists + DarkForums dataset)

## Success criteria

- Malaysia-first views load from archive without calling upstream on every page view  
- New ransomware.live MY victims and MY news appear after scheduled ingest  
- LLM labels persist and filterable  
- Public Data searches actors across forums and shows related IPs on map  
- Telegram tab is clearly deferred  
