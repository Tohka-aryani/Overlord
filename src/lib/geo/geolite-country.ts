import fs from "node:fs";
import path from "node:path";
import { Reader } from "@maxmind/geoip2-node";

export type CountryLookup = {
  lookup(ip: string): string | null;
  close(): void;
};

type GeoReader = {
  country(ip: string): { country?: { isoCode?: string | null } | null };
};

/**
 * Optional MaxMind GeoLite2-Country reader.
 * MMDB is not vendored in git (`data/` is gitignored). Download via
 * `npx tsx scripts/download-public-data.ts`.
 */
export function openGeoLiteCountry(
  mmdbPath = path.join(process.cwd(), "data/darkforums/GeoLite2-Country.mmdb"),
): CountryLookup | null {
  if (!fs.existsSync(mmdbPath)) return null;
  try {
    const buf = fs.readFileSync(mmdbPath);
    const reader = Reader.openBuffer(buf) as GeoReader;
    return {
      lookup(ip: string): string | null {
        try {
          const iso = reader.country(ip).country?.isoCode;
          return iso ? iso.toUpperCase() : null;
        } catch {
          return null;
        }
      },
      close() {
        // openBuffer has no file handle to close
      },
    };
  } catch {
    return null;
  }
}
