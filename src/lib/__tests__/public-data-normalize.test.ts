import { describe, expect, it } from "vitest";
import { jitterCountryCentroid, COUNTRY_COORDS } from "@/lib/geo/country-centroids";
import {
  forumTagFromFilename,
  mergeForumTags,
  normalizeDarkforumsIpRow,
  parseDarkforumsJsonObject,
  parseUsernameFileContent,
  parseUsernameLine,
} from "@/lib/ingest/public-data-normalize";

describe("forumTagFromFilename", () => {
  it("extracts forum slug from Threat-Actor list names", () => {
    expect(forumTagFromFilename("forum_users_darkforums.txt")).toBe("darkforums");
    expect(forumTagFromFilename("/tmp/forum_users_hackforums.txt")).toBe(
      "hackforums",
    );
  });
});

describe("parseUsernameLine", () => {
  it("skips # comments but keeps #usernames", () => {
    expect(parseUsernameLine("# Start date of collection")).toBeNull();
    expect(parseUsernameLine("#")).toBeNull();
    expect(parseUsernameLine("")).toBeNull();
    expect(parseUsernameLine("#AfterDark")).toBe("#AfterDark");
    expect(parseUsernameLine("Lucifer")).toBe("Lucifer");
  });
});

describe("parseUsernameFileContent", () => {
  it("dedupes and respects limit", () => {
    const content = `# header
Lucifer
lucifer
#AfterDark
Techtom
`;
    const rows = parseUsernameFileContent(content, "darkforums", 2);
    expect(rows).toEqual([
      { username: "Lucifer", forum: "darkforums" },
      { username: "#AfterDark", forum: "darkforums" },
    ]);
  });
});

describe("normalizeDarkforumsIpRow / parseDarkforumsJsonObject", () => {
  it("normalizes IP rows and dedupes json object", () => {
    expect(
      normalizeDarkforumsIpRow({
        username: "hacxx",
        ip: "85.247.145.163",
        hostname: "bl14-145-163.dsl.telepac.pt",
      }),
    ).toMatchObject({
      username: "hacxx",
      ip: "85.247.145.163",
      hostname: "bl14-145-163.dsl.telepac.pt",
      source: "darkforums-ip-intel",
    });

    expect(normalizeDarkforumsIpRow({ username: "x", ip: "not-an-ip" })).toBeNull();

    const parsed = parseDarkforumsJsonObject(
      {
        "100": { username: "Lucifer", ip: "49.37.44.99", hostname: null },
        "101": { username: "Lucifer", ip: "49.37.44.99", hostname: null },
        "102": { username: "other", ip: "1.2.3.4", hostname: null },
      },
      10,
    );
    expect(parsed).toHaveLength(2);
  });
});

describe("mergeForumTags", () => {
  it("unions and lowercases forum tags", () => {
    expect(mergeForumTags(["DarkForums"], "hackforums")).toEqual([
      "darkforums",
      "hackforums",
    ]);
  });
});

describe("country centroids", () => {
  it("has Malaysia and jitters around centroid", () => {
    expect(COUNTRY_COORDS.MY).toEqual([4.21, 101.97]);
    const point = jitterCountryCentroid("my", 0, () => 0.5);
    expect(point).toMatchObject({
      iso: "MY",
      lat: 4.21,
      lon: 101.97,
      jitterLat: 4.21,
      jitterLon: 101.97,
    });
    expect(jitterCountryCentroid("ZZ")).toBeNull();
  });
});
