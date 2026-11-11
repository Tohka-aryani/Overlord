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
- sector: Finance | Gov | Telco | Healthcare | Energy | Education | Other
- confidence: number from 0 to 1
- rationale: one short sentence explaining the label`;

function ollamaBaseUrl(): string {
  return (
    process.env.OLLAMA_BASE_URL?.replace(/\/$/, "") ||
    "http://192.168.100.140:11434"
  );
}

function ollamaModel(): string {
  return process.env.OLLAMA_MODEL || "qwen2.5:14b";
}

/** Wall-clock timeout for Ollama /api/chat during entity classification. */
export const CLASSIFY_ENTITY_TIMEOUT_MS = 120_000;

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
        model: ollamaModel(),
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

    const parsed = extractJsonObject(content);
    const validated = classificationSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}
