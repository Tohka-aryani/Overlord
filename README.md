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
| `IPINFO_TOKEN` | Optional IP enrichment |
| `CRON_SECRET` | Protects ingest trigger routes |

## Notes

- Local / LAN v1 only — no public auth yet
- Never fetch Tor `claim_url` values
- Telegram tab is a placeholder in v1
