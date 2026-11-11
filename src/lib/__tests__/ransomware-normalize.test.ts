import { describe, expect, it } from "vitest";
import {
  normalizeCountryVictim,
  normalizeCyberattack,
  toAttackDate,
} from "@/lib/ingest/ransomware-normalize";

describe("toAttackDate", () => {
  it("parses ISO timestamps and bare dates", () => {
    expect(toAttackDate("2026-11-02T00:00:00+00:00")).toBe("2026-11-02");
    expect(toAttackDate("2026-09-23")).toBe("2026-09-23");
    expect(toAttackDate(null)).toBeNull();
    expect(toAttackDate(false)).toBeNull();
  });
});

describe("normalizeCountryVictim", () => {
  it("maps ransomware.live countryvictims fields", () => {
    const n = normalizeCountryVictim({
      post_title: "MARDEC Berhad",
      group_name: "Orova",
      country: "my",
      activity: "Manufacturing",
      published: "2026-11-02T00:00:00+00:00",
      discovered: "2026-11-03T07:06:15.205070+00:00",
      post_url: "http://example.onion/claim",
      website: "www.mardec.com.my",
    });

    expect(n).toMatchObject({
      victim: "MARDEC Berhad",
      group: "Orova",
      country: "MY",
      sector: "Manufacturing",
      attackDate: "2026-11-02",
      claimUrl: "http://example.onion/claim",
    });
    expect(n?.discoveredAt).toBeInstanceOf(Date);
  });

  it("rejects rows missing required fields", () => {
    expect(normalizeCountryVictim({ post_title: "x" })).toBeNull();
  });
});

describe("normalizeCyberattack", () => {
  it("uses unattributed when claim_gang is not a string", () => {
    const n = normalizeCyberattack({
      victim: "CTOS Digital",
      claim_gang: false,
      claim_url: false,
      country: "MY",
      date: "2026-09-23",
      title: "press title",
    });

    expect(n).toMatchObject({
      victim: "CTOS Digital",
      group: "unattributed",
      country: "MY",
      attackDate: "2026-09-23",
      claimUrl: null,
    });
  });

  it("keeps string claim_url without fetching", () => {
    const n = normalizeCyberattack({
      victim: "Port of Tanjung Pelepas",
      claim_gang: "direwolf",
      claim_url: "https://www.ransomware.live/id/example",
      country: "MY",
      date: "2026-09-09",
    });

    expect(n?.group).toBe("direwolf");
    expect(n?.claimUrl).toBe("https://www.ransomware.live/id/example");
  });
});
