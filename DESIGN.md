# DESIGN.md — Night ops console

## Direction

**Night ops console** for Malaysia CTI: charcoal base, amber threat accent, left **ops rail** + main stage. Brand **RAVEN · MY** is a chrome-level identity signal, not an eyebrow.

## Tokens

| Token | Role | Guidance |
| --- | --- | --- |
| `--bg` / charcoal | App base | Near-black charcoal, not pure `#000` or purple-tinted dark |
| `--surface` | Stage panels | Slightly lifted charcoal for tables / drawers |
| `--text` | Primary copy | High-contrast off-white |
| `--muted` | Secondary | Dimmed; never compete with threat accents |
| `--threat` / amber | Critical & High | Amber/warning must dominate hierarchy |
| `--ok` / `--info` | Lower severities | Cooler, quieter than amber |

Use CSS variables in `globals.css`. Prefer semantic names over raw hex in components.

## Layout

- **Ops rail (left):** Overview, Public Data, Ransomware, News, Telegram — brand mark at top.
- **Main stage:** Tables and ranked lists first; detail drawer for ransomware/news.
- **Public Data:** Actor search + dark basemap; no card soup.

## Threat hierarchy

Critical and High use the amber threat token and must visually outrank Medium / Low / Info. Do not use purple glow or rainbow severity chips.

## Anti-slop (Impeccable)

- No chip soup, nested cards, or multi-layer glassmorphism
- No purple-on-black / indigo gradient “AI” look
- No pulsing LIVE dots or italic-serif decorative headlines
- No floating badge stickers over primary content
- Motion only for hierarchy (rail focus, drawer enter) — not noise

## Typography

Expressive but operational: a clear sans for UI chrome; mono for IPs, hashes, and timestamps. Avoid default Inter/Roboto stacks when shipping polished chrome (later tasks).

## Scaffold note

Full ops-rail UI lands in later tasks. This document locks visual intent for all subsequent UI work.
