import { describe, expect, it } from "vitest";
import {
  filterByCountry,
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
