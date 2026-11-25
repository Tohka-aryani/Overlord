import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadTorKeywords } from "@/lib/tor/keywords";

describe("loadTorKeywords", () => {
  it("skips comments, blanks, and case-insensitive dupes", async () => {
    const dir = path.join(os.tmpdir(), `overlord-tor-kw-${process.pid}`);
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, "keywords.txt");
    await writeFile(
      file,
      `# comment\n\nMalaysia\nransomware\nmalaysia\nData Leak\n`,
      "utf8",
    );
    const keywords = await loadTorKeywords(file);
    expect(keywords).toEqual(["Malaysia", "ransomware", "Data Leak"]);
  });
});
