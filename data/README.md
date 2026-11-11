# Public Data (local, gitignored)

Large binaries and scraped username lists live here and are **not** committed.

## Download

```bash
npx tsx scripts/download-public-data.ts
```

Fetches:

| Path | Source | Notes |
| --- | --- | --- |
| `usernames/forum_users_*.txt` | [Threat-Actor-Usernames-Scrape](https://github.com/spmedia/Threat-Actor-Usernames-Scrape) | Demo defaults: darkforums, hackforums, cracked, xss, breached2026 |
| `darkforums/ips.db` | [darkforums-ip-intel](https://github.com/Ivancastl/darkforums-ip-intel) | Preferred IP source (~16MB SQLite) |
| `darkforums/GeoLite2-Country.mmdb` | same repo | Optional country enrichment (~9MB). **Not vendored in git.** |
| `darkforums/darkforums.json` | same repo | Optional; pass `--with-json` (~41MB) |

## Import (demo subset)

```bash
npx tsx scripts/import-public-data.ts --limit 2000 --username-limit 500
```

## Full import

```bash
# All lines in downloaded username files + all distinct (ip, username) from ips.db
npx tsx scripts/import-public-data.ts
```

GeoLite enrichment runs when `GeoLite2-Country.mmdb` is present (`--no-geolite` to skip).
Country ISO + [country-centroid jitter](../src/lib/geo/country-centroids.ts) feed the Task 9 map; city-level GeoIP is not required for v1.
