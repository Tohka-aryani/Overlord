import { describe, expect, it } from "vitest";
import {
  extractHtmlTitle,
  isOnionHostname,
  parseOnionClaim,
} from "@/lib/tor/onion";

const V3 =
  "abcdefghijklmnopqrstuvwxyz234567abcdefghijklmnopqrstuvwx"; // 56 chars, base32 onion alphabet

describe("parseOnionClaim", () => {
  it("parses http onion URLs", () => {
    const r = parseOnionClaim(`http://${V3}.onion/path`);
    expect(r?.host).toBe(`${V3}.onion`);
    expect(r?.sampleUrl).toContain(".onion/path");
  });

  it("rejects clearnet hosts", () => {
    expect(parseOnionClaim("https://example.com/x")).toBeNull();
  });

  it("accepts bare onion host", () => {
    const host = `${V3}.onion`;
    const r = parseOnionClaim(host);
    expect(r?.host).toBe(host);
    expect(r?.sampleUrl).toBe(`http://${host}`);
  });
});

describe("isOnionHostname", () => {
  it("requires .onion", () => {
    expect(isOnionHostname("example.com")).toBe(false);
    expect(isOnionHostname(`${V3}.onion`)).toBe(true);
  });
});

describe("extractHtmlTitle", () => {
  it("reads title text", () => {
    expect(extractHtmlTitle("<html><title>  Leak Board </title></html>")).toBe(
      "Leak Board",
    );
  });
});
