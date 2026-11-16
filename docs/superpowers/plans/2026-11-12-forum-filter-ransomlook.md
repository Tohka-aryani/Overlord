# Forum filter + RansomLook dual-feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Public Data forum filter; ingest RansomLook into shared ransomware archive; rebuild Ransomware UI in NexAtlas Leak-sites style.

**Architecture:** Shared `ransomware_victims` gains `source` + `sources[]`. New RansomLook normalizer/ingest + cron route. Read API gains `source`/`days`/`group`/`q`. Public Data gets forums endpoint + search `forum` param + toolbar select. Ransomware page mirrors NexAtlas stats/filters/charts/table on Overlord tokens.

**Tech Stack:** Next.js App Router, Drizzle/Postgres, vitest, RansomLook public API (`/api/recent`, `/api/posts?days=`, `/api/search`).

## Global Constraints

- Claim URLs text-only (never fetched)
- Cron via `x-cron-secret` / Bearer
- Ollama model resolve (NexAtlas `llama3.2:latest` fallback)
- Malaysia-first defaults
- Do not commit unless user asks (except when plan steps explicitly commit and user said go for full feature)

---

### Task 1: Public Data forum filter

**Files:**
- Create: `src/app/api/public-data/forums/route.ts`
- Modify: `src/app/api/public-data/search/route.ts`
- Modify: `src/app/(dashboard)/public-data/page.tsx`
- Test: `src/lib/__tests__/public-data-forum.test.ts` (pure filter helper if extracted)

- [ ] Forums list API + search `?forum=`
- [ ] Toolbar Forum select wired to browse + search
- [ ] Clear focusIp on forum change

### Task 2: Schema source fields

**Files:**
- Modify: `src/db/schema.ts`
- Create SQL migration or `drizzle-kit push` via docker

- [ ] Add `source text not null default 'ransomware.live'`
- [ ] Add `sources text[] not null default '{ransomware.live}'`
- [ ] Backfill existing rows
- [ ] Update ransomware.live ingest to set source/sources

### Task 3: RansomLook ingest

**Files:**
- Create: `src/lib/ingest/ransomlook-normalize.ts`
- Create: `src/lib/ingest/ransomlook.ts`
- Create: `src/app/api/ingest/ransomlook/route.ts`
- Test: `src/lib/__tests__/ransomlook-normalize.test.ts`

- [ ] Normalize recent/posts/search payloads
- [ ] Upsert with merge sources[]
- [ ] Classify new inserts
- [ ] Cron route maxDuration 300

### Task 4: Ransomware read API

**Files:**
- Modify: `src/app/api/ransomware/route.ts`

- [ ] Params: source, days, group, q; MY uses country OR malaysia_relevance Direct when country null
- [ ] Stats: totals, byGroup, byDay, bySource

### Task 5: NexAtlas-style Ransomware UI

**Files:**
- Modify: `src/app/(dashboard)/ransomware/page.tsx`
- Create: `src/components/ransomware/*` (StatStrip, DayChart, GroupBars) as needed
- Modify: `src/components/nav/SiteFooter.tsx` (RansomLook source link)

- [ ] Filter bar + stats + charts + expandable table
- [ ] Source links to ransomware.live + ransomlook.io

### Task 6: Verify

- [ ] `npm test`
- [ ] Live ingest RansomLook + page smoke
