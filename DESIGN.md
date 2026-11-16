# Overlord — Design system

Malaysia-first dark-web monitoring console for CTI / SOC analysts on a LAN.

## Intent

| | |
|---|---|
| **Users** | CTI analysts scanning MY-relevant signals |
| **Job** | Notice high-threat signals in ~10s, then drill archives |
| **Mode** | Operate (not persuade) |
| **Success** | Faster scan; clear theme / locale / map mode without chrome noise |

## Typography

**Aces07** for all UI text (display, body, data, charts).  
File: `public/fonts/ACES07_Regular.ttf` · [DaFont · Ace Combat](https://www.dafont.com/ace-combat.d11270) (personal use).

CSS: `--font-ui` / `--font-display` / `--font-body` / `--font-mono` all resolve to Aces07.

## Themes (6)

Persisted as `localStorage.overlord-theme`. Legacy `night` → `obsidian`, `day` → `graphite`.

| ID | Look |
|----|------|
| `obsidian` | Charcoal + amber (default) |
| `mangrove` | MY green + copper |
| `graphite` | Cool light steel |
| `phosphor` | OLED + green |
| `cobalt` | Blue ops |
| `violet` | Purple ops |

Tokens live on `html[data-theme]` in `src/app/globals.css`.

## Locale

EN default + MS. Persisted as `localStorage.overlord-locale`. Keys in `src/messages/{en,ms}.json`.

## Surfaces

REKKI-inspired: hairline borders, `--inset-hairline`, one accent action per viewport. Slim footer so ops pages fit one viewport.

## Map (Overview)

Subversive View / geopolitics-monitor language:

- **Country** — GeoJSON choropleth (`public/geo/countries-110m.geojson`); fill scales with case count
- **Pinpoint** — muted country layer + case centroid pins

## Charts

Prefer interactive SVG/CSS charts (`ColumnChart`, `DonutChart`, `HBarChart`): hover highlight, click-to-filter when a page filter exists. No extra chart library.

## Chat

Telegram archive uses a chatroom layout (day separators, bubbles) — archive-only; open on Telegram to reply.
