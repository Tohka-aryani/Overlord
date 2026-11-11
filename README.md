# Dark Web Monitoring (RAVEN · MY)

Malaysia-first dark-web / CTI monitoring dashboard. Next.js App Router + Postgres (Docker Compose) + Ollama classification on LAN.

See [PRODUCT.md](./PRODUCT.md) and [DESIGN.md](./DESIGN.md) for intent and visual rules. Implementation plan: [docs/superpowers/plans/2026-11-11-dark-web-monitoring.md](./docs/superpowers/plans/2026-11-11-dark-web-monitoring.md).

## Stack

- Next.js (App Router) + TypeScript + Tailwind
- Postgres 16 via Docker Compose
- Ollama `qwen2.5:14b` at `http://192.168.100.140:11434` (external LAN)

## Quick start

```bash
cp .env.example .env
docker compose up db -d
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Full stack (web + db):

```bash
docker compose up --build
```

## Env

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `OLLAMA_BASE_URL` | LAN Ollama HTTP API |
| `OLLAMA_MODEL` | Classifier model id |
| `IPINFO_TOKEN` | Optional IP enrichment (`/api/public-data/ip-detail`) |
| `CRON_SECRET` | Protects ingest trigger routes |

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

GeoLite2 Country MMDB is downloaded into `data/` for ISO enrichment but **not** vendored in git. Map pins (Task 9) use country-centroid jitter from `src/lib/geo/country-centroids.ts`. See [data/README.md](./data/README.md).

Attribution: [darkforums-ip-intel](https://github.com/Ivancastl/darkforums-ip-intel), [Threat-Actor-Usernames-Scrape](https://github.com/spmedia/Threat-Actor-Usernames-Scrape).

## Notes

- Local / LAN v1 only — no public auth yet
- Never fetch Tor `claim_url` values
- Telegram tab is a placeholder in v1
- `data/` is gitignored (large binaries / username dumps)
