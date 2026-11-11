# Dark Web Monitoring Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a Malaysia-first Next.js dark-web monitoring dashboard with Postgres archive, ransomware.live + Google News + Public Data (DarkForums IPs + threat-actor usernames), and Ollama classification.

**Architecture:** Single Next.js App Router app in Docker Compose with Postgres. Server-side ingest jobs upsert into Drizzle tables; Ollama at `192.168.100.140` labels new ransomware/news; ops-rail UI reads only from the archive API.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind, Drizzle ORM, Postgres 16, Leaflet, `ai` SDK / fetch to Ollama, Docker Compose.

**Spec:** [docs/superpowers/specs/2026-11-11-dark-web-monitoring-design.md](../specs/2026-11-11-dark-web-monitoring-design.md)

## Global Constraints

- Malaysia-first defaults on all live feeds  
- Never fetch Tor `claim_url` values  
- Ollama base URL `http://192.168.100.140:11434`, model `qwen2.5:14b`  
- Design: Design with Intent + Impeccable — night ops console, ops-rail layout, no AI slop  
- Telegram = placeholder only  
- Local/LAN v1, secrets in `.env`  
- Add `.superpowers/` to `.gitignore`  

## File map

- `docker-compose.yml` — `web` + `db`  
- `.env.example` — `DATABASE_URL`, `OLLAMA_BASE_URL`, `OLLAMA_MODEL`, `IPINFO_TOKEN`, `CRON_SECRET`  
- `PRODUCT.md`, `DESIGN.md` — Intent + Impeccable product/design rules  
- `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts`  
- `src/lib/ollama.ts` — classify helper  
- `src/lib/ingest/{ransomware,news,public-data}.ts`  
- `src/app/api/**` — ingest triggers + read APIs  
- `src/app/(dashboard)/layout.tsx` — ops rail  
- `src/app/(dashboard)/{page,public-data,ransomware,news,telegram}/page.tsx`  
- `src/components/**` — tables, threat badge, map, detail drawer  
- `data/` — imported public datasets (gitignored large binaries; scripts to fetch)  
- `scripts/import-public-data.ts`  

---

### Task 1: Scaffold Next.js + Compose + design docs

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `docker-compose.yml`, `.env.example`, `.gitignore`, `PRODUCT.md`, `DESIGN.md`, `README.md`

- [ ] **Step 1:** `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"` (or equivalent in empty repo)
- [ ] **Step 2:** Add `docker-compose.yml` with Postgres 16 (`POSTGRES_USER/PASSWORD/DB`, port `5432`, volume) and `web` service building the Next app, `DATABASE_URL` pointing at `db`
- [ ] **Step 3:** Write `PRODUCT.md` (Malaysia analyst, notice high-threat MY signals fast) and `DESIGN.md` (charcoal base, amber Critical/High, ops rail, anti-slop rules)
- [ ] **Step 4:** `.env.example` with `DATABASE_URL`, `OLLAMA_BASE_URL=http://192.168.100.140:11434`, `OLLAMA_MODEL=qwen2.5:14b`, `IPINFO_TOKEN=`, `CRON_SECRET=`
- [ ] **Step 5:** Verify `docker compose up db` healthy; `npm run dev` serves shell page

---

### Task 2: Drizzle schema + migrations

**Files:**
- Create: `drizzle.config.ts`, `src/db/schema.ts`, `src/db/index.ts`

**Schema tables:** `actors`, `actor_ips`, `ransomware_victims`, `news_items`, `classifications`, `ingest_runs` per spec (unique indexes on natural keys).

- [ ] **Step 1:** Define schema in `src/db/schema.ts`
- [ ] **Step 2:** `npx drizzle-kit generate` && `npx drizzle-kit migrate` against Compose Postgres
- [ ] **Step 3:** Smoke-insert one row per table via a small script or unit test
- [ ] **Step 4:** Commit schema + migration

---

### Task 3: Ollama classifier

**Files:**
- Create: `src/lib/ollama.ts`, `src/lib/classification-schema.ts`
- Test: `src/lib/__tests__/classification-schema.test.ts`

**Produces:** `classifyEntity(input: { title: string; body?: string; country?: string }) => ClassificationResult`

- [ ] **Step 1:** Zod schema for threat_level, category, malaysia_relevance, sector, confidence, rationale
- [ ] **Step 2:** Implement Ollama `/api/chat` call with JSON-only system prompt; parse + validate; on failure return null (caller marks unclassified)
- [ ] **Step 3:** Unit-test Zod accept/reject; optional live smoke against LAN if reachable
- [ ] **Step 4:** Commit

---

### Task 4: ransomware.live ingest + API

**Files:**
- Create: `src/lib/ingest/ransomware.ts`, `src/app/api/ingest/ransomware/route.ts`, `src/app/api/ransomware/route.ts`

- [ ] **Step 1:** Fetch `https://api.ransomware.live/v2/countryvictims/MY` (and cyberattacks MY); upsert; record `ingest_runs`
- [ ] **Step 2:** Queue classify for new rows via Ollama; write `classifications`
- [ ] **Step 3:** `GET /api/ransomware?country=MY` (default MY) returns archived rows + latest classification
- [ ] **Step 4:** Protect ingest route with `CRON_SECRET` header
- [ ] **Step 5:** Manual test: trigger ingest, confirm DB + API

---

### Task 5: Google News RSS ingest + API

**Files:**
- Create: `src/lib/ingest/news.ts`, `src/app/api/ingest/news/route.ts`, `src/app/api/news/route.ts`
- Keywords (config): ransomware Malaysia; data breach Malaysia; cyber attack Malaysia; "Bank Negara" cyber OR hack; dark web Malaysia; critical infrastructure Malaysia cyber

- [ ] **Step 1:** Parse RSS (use `rss-parser`); upsert by link; classify new items
- [ ] **Step 2:** `GET /api/news` returns archived MY keyword hits + labels
- [ ] **Step 3:** Manual test ingest

---

### Task 6: Public Data import (DarkForums + usernames)

**Files:**
- Create: `src/lib/ingest/public-data.ts`, `scripts/import-public-data.ts`, `src/app/api/public-data/actors/route.ts`, `src/app/api/public-data/ips/route.ts`, `src/app/api/public-data/search/route.ts`
- Data: vendor scripts to clone/download [darkforums-ip-intel](https://github.com/Ivancastl/darkforums-ip-intel) `ips.db` / JSON and selected Threat-Actor username `.txt` files into `data/` (gitignored)

- [ ] **Step 1:** Import usernames → `actors` with forum tags; import IP rows → `actor_ips` linked by username
- [ ] **Step 2:** Search API (autocomplete) + IPs-by-actor + country filter (prefer MY when ISO known)
- [ ] **Step 3:** Optional GeoLite country for map points (reuse country-centroid jitter approach from darkforums-ip-intel; optional `IPINFO_TOKEN` detail endpoint)
- [ ] **Step 4:** Manual: search a known DarkForums username, see IPs

---

### Task 7: Ops-rail UI shell + Overview

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`, `src/app/(dashboard)/page.tsx`, `src/components/nav/OpsRail.tsx`, `src/components/ThreatBadge.tsx`, `src/app/globals.css`

- [ ] **Step 1:** Implement left rail: Overview, Public Data, Ransomware, News, Telegram; brand mark RAVEN · MY
- [ ] **Step 2:** Overview: MY victim count, high-threat count, last ingest statuses, ranked needs-attention list (no card soup)
- [ ] **Step 3:** Apply DESIGN.md tokens (CSS variables)

---

### Task 8: Ransomware + News tab UIs

**Files:**
- Create: `src/app/(dashboard)/ransomware/page.tsx`, `src/app/(dashboard)/news/page.tsx`, `src/components/DetailDrawer.tsx`

- [ ] **Step 1:** Table-first ransomware list (MY default toggle); ThreatBadge; drawer with stored fields (show claim_url as text only)
- [ ] **Step 2:** News chronological list with keyword + labels
- [ ] **Step 3:** Filters by threat_level / category

---

### Task 9: Public Data tab (map + actors)

**Files:**
- Create: `src/app/(dashboard)/public-data/page.tsx`, `src/components/map/ActorMap.tsx`

- [ ] **Step 1:** Actor search autocomplete → filter map/list to that actor’s IPs
- [ ] **Step 2:** Leaflet dark basemap + clustered markers; country filter default highlighting MY when present
- [ ] **Step 3:** Side panel actor detail (forums, IP count)

---

### Task 10: Telegram placeholder + polish polish + README

**Files:**
- Create: `src/app/(dashboard)/telegram/page.tsx`
- Modify: `README.md`

- [ ] **Step 1:** Telegram empty state “Coming soon”
- [ ] **Step 2:** Run Impeccable-style pass: remove chip soup, pulsing dots, nested cards; fix hierarchy
- [ ] **Step 3:** README: compose up, env, ingest curl examples, Ollama LAN note, data import steps, attribution to ransomware.live + source repos

---

## Spec coverage checklist

- Overview / five tabs — Tasks 7–10  
- Public Data combine two repos — Task 6 + 9  
- ransomware.live — Task 4 + 8  
- Google News MY RSS — Task 5 + 8  
- Ollama labels — Task 3 + wired in 4/5  
- Postgres archive Compose — Tasks 1–2  
- Telegram deferred — Task 10  
- Never fetch Tor — Tasks 4/8 constraints  
- Design Intent + Impeccable — Tasks 1, 7, 10  
