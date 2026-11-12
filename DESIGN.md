# DESIGN.md — Overlord

## Direction

**Industrial overwatch console** for Malaysia CTI. Charcoal (Night) / warm paper (Day). Accent is burnt amber — threat and brand, not purple glow. Brand **Overlord** is chrome-level identity (logo + wordmark), not an eyebrow.

Design systems referenced: [Design with Intent](https://designwithintent.ai/) (autonomy, systems over screens, evidence) and [Impeccable](https://impeccable.style/) (anti-slop craft).

## Tokens

| Token | Role |
| --- | --- |
| `--bg` / `--surface` | App base / panels |
| `--text` / `--muted` | Hierarchy |
| `--accent` | Brand + interactive focus |
| `--threat` | Critical / High severity |
| `--ok` / `--info` | Lower severities / status |

Themes: `data-theme="night" | "day"` on `<html>`. User can switch; preference stored in `localStorage`.

## Layout

- **Top nav:** Overlord mark, primary tabs, live MYT/UTC clock, Night/Day toggle
- **Main stage:** tables, maps, ranked lists — no card soup
- **Footer:** product context, sources, ops notes

## Map

- Square pin + ring (MY accent pulse on Malaysia ISO)
- Rich popup: actor, IP, country pill, host, lat/lon, centroid disclaimer
- Cluster spiderfy; tiles follow theme (dark_all / voyager)

## Anti-slop (Impeccable)

- No chip piles, nested cards, purple gradients, pulsing LIVE theater
- Motion for hierarchy only (nav underline, drawer, MY pin ring)
- One primary action per view; threat outranks chrome

## Typography

- Display: Syne
- Body: IBM Plex Sans
- Mono: IBM Plex Mono (IPs, times, counts)
