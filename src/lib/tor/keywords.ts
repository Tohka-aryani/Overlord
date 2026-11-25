import { readFile } from "node:fs/promises";
import path from "node:path";

/** Resolve keyword file path (cwd-relative by default). */
export function torKeywordsFilePath(): string {
  const raw = (process.env.TOR_KEYWORDS_FILE ?? "").trim();
  if (raw && path.isAbsolute(raw)) return raw;
  if (raw) {
    return path.join(/* turbopackIgnore: true */ process.cwd(), raw);
  }
  return path.join(
    /* turbopackIgnore: true */ process.cwd(),
    "data",
    "tor-keywords.txt",
  );
}

/**
 * Load keywords: one per line; `#` comments and blanks ignored.
 * Dedupes case-insensitively while preserving first-seen casing.
 */
export async function loadTorKeywords(
  filePath = torKeywordsFilePath(),
): Promise<string[]> {
  let body: string;
  try {
    body = await readFile(filePath, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") {
      throw new Error(`Tor keywords file not found: ${filePath}`);
    }
    throw err;
  }

  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}
