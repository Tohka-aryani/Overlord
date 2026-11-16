# PRODUCT.md — Overlord (Dark Web Monitoring)

## Who this is for

Malaysia-based CTI / SOC analysts who need a single local console for dark-web and breach signals that matter to Malaysia.

## Job to be done

Notice high-threat Malaysia-relevant signals fast — under ~10 seconds from landing — then drill into Public Data, Ransomware, or News without leaving the archive.

## Outcomes

1. **Malaysia-first by default** — every live feed and list defaults to MY; global is opt-in.
2. **Trusted archive** — page views read Postgres only; upstream APIs are hit by ingest jobs, not by the UI.
3. **Labeled threats** — new ransomware and news rows get Ollama classifications (threat level, category, MY relevance) when the LAN model is up.
4. **One primary action per view** — scan the ranked “needs attention” list, open a drawer, or search an actor — not a dashboard of competing widgets.

## Non-goals (v1)

- Telegram MTProto / bot admin (v1 uses public RSS bridge for @breachdetect)
- Public internet deployment or multi-user auth
- Fetching or browsing Tor `claim_url` / onion leak sites
- Live scraping of every username list (use published datasets)

## Principles (Design with Intent)

- **Notice what matters** — Critical/High MY signals dominate; Info noise stays demoted.
- **One job per screen** — Overview pulses; lists archive; Public Data searches actors + map.
- **Accessible & honest** — show ingest health; never fake a “LIVE” state when feeds are stale.
- **No dark patterns** — no urgency theater, no deceptive empty states.
