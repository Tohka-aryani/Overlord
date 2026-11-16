import {
  classificationSchema,
  type ClassificationResult,
} from "./classification-schema";

export type ClassifyEntityInput = {
  title: string;
  body?: string;
  country?: string;
};

const SYSTEM_PROMPT = `You are a Malaysia-first cyber threat intelligence classifier.
Respond with a single JSON object only — no markdown, no prose outside JSON.
Required keys and allowed values:
- threat_level: Critical | High | Medium | Low | Info
- category: Ransomware | Breach | Infostealer | Forum Actor | Hacktivism | Fraud | Vulnerability | Other
- malaysia_relevance: Direct | Indirect | None
- sector: Finance | Gov | Telco | Healthcare | Energy | Education | Other (use Other if unsure — never invent a sector)
- confidence: number from 0 to 1
- rationale: one short sentence explaining the label
Use only the exact enum strings above.`;

/** Prefer env, then NexAtlas default (llama3.2:latest). */
const PREFERRED_MODELS = [
  process.env.OLLAMA_MODEL?.trim(),
  "llama3.2:latest", // NexAtlas Geospace V3 .env
  "osint-llama3.1:latest",
  "qwen3.5:9b",
  "qwen2.5:14b",
].filter((m): m is string => Boolean(m));

function ollamaBaseUrl(): string {
  return (
    process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ||
    "http://192.168.100.140:11434"
  );
}

/** Wall-clock timeout for Ollama /api/chat during entity classification. */
export const CLASSIFY_ENTITY_TIMEOUT_MS = 120_000;

let resolvedModel: string | null = null;
let resolveAttemptedAt = 0;

async function listOllamaModels(base: string): Promise<Set<string>> {
  const res = await fetch(`${base}/api/tags`, {
    signal: AbortSignal.timeout(5_000),
  });
  if (!res.ok) return new Set();
  const data = (await res.json()) as {
    models?: { name?: string; model?: string }[];
  };
  const names = new Set<string>();
  for (const m of data.models ?? []) {
    if (m.name) names.add(m.name);
    if (m.model) names.add(m.model);
  }
  return names;
}

/**
 * Pick an installed chat model: env → NexAtlas llama3.2 → other fallbacks.
 * Caches for 60s so ingest loops don't hammer /api/tags.
 */
export async function resolveOllamaModel(): Promise<string | null> {
  const now = Date.now();
  if (resolvedModel && now - resolveAttemptedAt < 60_000) {
    return resolvedModel;
  }
  resolveAttemptedAt = now;
  const base = ollamaBaseUrl();
  try {
    const installed = await listOllamaModels(base);
    if (installed.size === 0) {
      resolvedModel = null;
      return null;
    }
    for (const preferred of PREFERRED_MODELS) {
      if (installed.has(preferred)) {
        resolvedModel = preferred;
        return preferred;
      }
      // allow tag-less match (llama3.2 matches llama3.2:latest)
      const bare = preferred.split(":")[0];
      for (const name of installed) {
        if (name === bare || name.startsWith(`${bare}:`)) {
          resolvedModel = name;
          return name;
        }
      }
    }
    // last resort: first non-embedding model-ish name
    for (const name of installed) {
      if (!/embed|ocr|docling|vision/i.test(name)) {
        resolvedModel = name;
        return name;
      }
    }
    resolvedModel = [...installed][0] ?? null;
    return resolvedModel;
  } catch {
    resolvedModel = null;
    return null;
  }
}

/** Sync helper for logging / ingest metadata after resolve. */
export function lastResolvedOllamaModel(): string | null {
  return resolvedModel;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("No JSON object in model response");
  }
}

/**
 * Classify a CTI entity via Ollama /api/chat.
 * Returns null on network, parse, or schema validation failure
 * so the caller can archive as unclassified and retry later.
 */
export async function classifyEntity(
  input: ClassifyEntityInput,
): Promise<ClassificationResult | null> {
  const model = await resolveOllamaModel();
  if (!model) return null;

  const userParts = [`Title: ${input.title}`];
  if (input.body?.trim()) {
    userParts.push(`Body: ${input.body.trim()}`);
  }
  if (input.country?.trim()) {
    userParts.push(`Country: ${input.country.trim()}`);
  }

  try {
    const res = await fetch(`${ollamaBaseUrl()}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(CLASSIFY_ENTITY_TIMEOUT_MS),
      body: JSON.stringify({
        model,
        stream: false,
        format: "json",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userParts.join("\n") },
        ],
      }),
    });

    if (!res.ok) {
      return null;
    }

    const payload = (await res.json()) as {
      message?: { content?: string };
    };
    const content = payload.message?.content;
    if (!content) {
      return null;
    }

    const validated = classificationSchema.safeParse(
      extractJsonObject(content),
    );
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}
