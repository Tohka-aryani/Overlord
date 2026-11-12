import { describe, expect, it } from "vitest";
import {
  filterByCountry,
  mapPreferMalaysia,
  preferredCountryFilter,
  uniqueCountries,
} from "@/lib/public-data-ui";

describe("preferredCountryFilter", () => {
  it("defaults to MY when Malaysia IPs are present", () => {
    expect(
      preferredCountryFilter([
        { countryIso: "SG" },
        { countryIso: "MY" },
        { countryIso: null },
      ]),
    ).toBe("MY");
  });

  it("defaults to ALL when MY is absent", () => {
    expect(
      preferredCountryFilter([{ countryIso: "IN" }, { countryIso: "US" }]),
    ).toBe("ALL");
  });

  it("defaults to ALL for empty list", () => {
    expect(preferredCountryFilter([])).toBe("ALL");
  });
});

describe("uniqueCountries", () => {
  it("lists distinct ISOs with MY first", () => {
    expect(
      uniqueCountries([
        { countryIso: "us" },
        { countryIso: "MY" },
        { countryIso: "US" },
        { countryIso: null },
        { countryIso: "sg" },
      ]),
    ).toEqual(["MY", "SG", "US"]);
  });
});

describe("filterByCountry", () => {
  const rows = [
    { id: 1, countryIso: "MY" },
    { id: 2, countryIso: "SG" },
    { id: 3, countryIso: "my" },
    { id: 4, countryIso: null },
  ];

  it("keeps all for ALL", () => {
    expect(filterByCountry(rows, "ALL")).toHaveLength(4);
  });

  it("filters to MY case-insensitively", () => {
    expect(filterByCountry(rows, "MY").map((r) => r.id)).toEqual([1, 3]);
  });
});

describe("mapPreferMalaysia", () => {
  const mixed = [{ countryIso: "MY" }, { countryIso: "US" }];

  it("is true when active filter is MY", () => {
    expect(mapPreferMalaysia("MY", mixed, 0)).toBe(true);
    expect(mapPreferMalaysia("MY", mixed, 3)).toBe(true);
  });

  it("is false for a non-MY filter even when actor has MY IPs", () => {
    expect(mapPreferMalaysia("US", mixed, 0)).toBe(false);
    expect(mapPreferMalaysia("US", mixed, 2)).toBe(false);
  });

  it("uses MY default on ALL only when there are no plotted points", () => {
    expect(mapPreferMalaysia("ALL", mixed, 0)).toBe(true);
    expect(mapPreferMalaysia("ALL", mixed, 1)).toBe(false);
    expect(mapPreferMalaysia("ALL", [{ countryIso: "US" }], 0)).toBe(false);
  });
});
