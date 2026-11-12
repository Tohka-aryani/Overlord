# Dark Web Monitoring (RAVEN · MY)

Malaysia-first dark-web / CTI monitoring dashboard. Next.js App Router + Postgres (Docker Compose) + Ollama classification on LAN.

See [PRODUCT.md](./PRODUCT.md) and [DESIGN.md](./DESIGN.md) for intent and visual rules.

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres 16 via Docker Compose
- Ollama on LAN (default `qwen2.5:14b` at `192.168.100.140`)

## Quick start

```bash
cp .env.example .env
# Set CRON_SECRET to a non-empty value before triggering ingest
docker compose up db -d
npm install
npm run db:migrate   # if migrations are not applied yet
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full stack (web + db):

```bash
docker compose up --build
```

On first use (and after any new migration files), apply schema from the host — the `web` container does not run migrations automatically:

```bash
npm install   # if you have not already
npm run db:migrate
```

## Env

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `OLLAMA_BASE_URL` | LAN Ollama HTTP API (default `http://192.168.100.140:11434`) |
| `OLLAMA_MODEL` | Classifier model id (default `qwen2.5:14b`) |
| `IPINFO_TOKEN` | Optional IP enrichment (`/api/public-data/ip-detail`) |
| `CRON_SECRET` | Protects ingest trigger routes (`x-cron-secret` or `Authorization: Bearer`) |

### Ollama (LAN)

Classification expects a reachable Ollama host on the LAN, not a cloud API:

1. On `192.168.100.140` (or your host), pull the model: `ollama pull qwen2.5:14b`
2. Point the app at it via `OLLAMA_BASE_URL` / `OLLAMA_MODEL` in `.env`
3. If the host or model differs, override those vars — do not hard-code another endpoint in code

## Ingest (curl)

Ingest routes require `CRON_SECRET`. Prefer the `x-cron-secret` header:

```bash
# Ransomware (ISO2 country only; default MY — not ALL)
curl -sS -X POST "http://localhost:3000/api/ingest/ransomware" \
  -H "x-cron-secret: $CRON_SECRET"
# Optional: ?country=SG (any ransomware.live ISO2, e.g. MY, SG, US)

# News (Google News MY keyword RSS)
curl -sS -X POST "http://localhost:3000/api/ingest/news" \
  -H "x-cron-secret: $CRON_SECRET"
```

Bearer form also works:

```bash
curl -sS -X POST "http://localhost:3000/api/ingest/ransomware" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Archive reads (no secret):

- `GET /api/ransomware?country=MY` — default dashboard scope
- `GET /api/ransomware?country=ALL` — global archive (Ransomware UI “Global” toggle); read-only, not used for ingest
- `GET /api/news`

## Public Data import

DarkForums IP intel + Threat-Actor username lists land in gitignored `data/`.

```bash
npm run public-data:download
# Demo subset (recommended first run)
npm run public-data:import -- --limit 2000 --username-limit 500
# Full import of downloaded files (can be large / slow)
npm run public-data:import
```

APIs (archive only):

- `GET /api/public-data/search?q=` — actor autocomplete
- `GET /api/public-data/actors` — list + IP counts
- `GET /api/public-data/ips?username=` or `actorId=` (+ optional `country=`)
- `GET /api/public-data/ip-detail?ip=` — optional ipinfo.io when `IPINFO_TOKEN` is set

GeoLite2 Country MMDB is downloaded into `data/` for ISO enrichment but **not** vendored in git. Map pins use country-centroid jitter from `src/lib/geo/country-centroids.ts`. See [data/README.md](./data/README.md).

## Attribution

- [ransomware.live](https://www.ransomware.live/) — victim / cyberattack archive API
- [darkforums-ip-intel](https://github.com/Ivancastl/darkforums-ip-intel) — DarkForums IP intel + GeoLite helper assets
- [Threat-Actor-Usernames-Scrape](https://github.com/spmedia/Threat-Actor-Usernames-Scrape) — forum username lists

## Notes

- Local / LAN v1 only — no public auth yet
- `GET /api/news` and `GET /api/ransomware?country=ALL` return the full archive with no pagination or cap (acceptable on LAN v1)
- Never fetch Tor `claim_url` values (stored as text only)
- Telegram tab is a **Coming soon** placeholder in v1
- `data/` is gitignored (large binaries / username dumps)
