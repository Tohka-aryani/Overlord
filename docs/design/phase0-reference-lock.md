# Phase 0 — Reference lock (Overlord redesign) · rev 2

**Date:** 2026-11-16  
**Status:** Approved (mood board rev 3 · 2026-11-16)

## Intent brief ([Design with Intent](https://designwithintent.ai/))

| | |
|---|---|
| **Users** | Malaysia CTI / SOC analysts on a LAN console |
| **Job** | Notice high-threat MY signals in ~10s, then drill archives |
| **Mode** | Operate (not persuade) |
| **Constraints** | EN default + MS; 6 full themes; map Country/Pinpoint toggle; chatroom Telegram |
| **Success** | Faster scan + clear theme/locale/map-mode without chrome noise |

## Refero lock

### Primary — [REKKI](https://styles.refero.design/style/65b8df27-36a3-47a6-be53-735d1f6a485d)

Surface stack, hairline inset elevation, one accent action per viewport.

### Secondary

| Need | Reference | Borrow |
|------|-----------|--------|
| Chat | [Telegram UI](https://refero.design/pages/d77dcc56-05da-4890-a64e-4c602abb0433) | Channel header, day separators, bubbles |
| Map / dashboard | [Dashboard UI examples](https://styles.refero.design/examples/dashboard-ui-design) | Dense ops; one map stage, mode toggle |

## Themes (6 complete looks)

1. `obsidian` — charcoal + amber (default)
2. `mangrove` — MY green + copper
3. `graphite` — cool light steel
4. `phosphor` — OLED + green
5. **`cobalt`** — blue ops (**new**)
6. **`violet`** — purple ops (**new**)

`violet` / `cobalt` are intentional full themes (user request). Still avoid purple-on-white gradient “AI slop” as the only identity.

## Typography

| Role | Face | Source |
|------|------|--------|
| **Everything** | **Aces07** | [Ace Combat on DaFont](https://www.dafont.com/ace-combat.d11270) — free for personal use; `public/fonts/ACES07_Regular.ttf` |

No second body/mono face — Aces07 is the full UI type system.

## Map (Overview geographic section)

Reference: [Subversive View · Geopolitics Monitor](http://192.168.100.140:8067/geopolitics/monitor) layer style.

- Dark basemap (CARTO `dark_all` / equivalent)
- **Country mode:** GeoJSON **choropleth** country polygons — fill scales with case count; stroke `#3a4450` ~0.6px; muted base fill `#1a222d`; hot ramp toward red/pink; legend bar `0 → 1`
- **Pinpoint mode:** same stage; country fills muted; IP/actor circle pins on top
- Toolbar mode toggle; one map widget only

## Board

Interactive: [`phase0-moodboard.html`](./phase0-moodboard.html) → http://127.0.0.1:8765/phase0-moodboard.html
