import { z } from "zod";

export const threatLevels = [
  "Critical",
  "High",
  "Medium",
  "Low",
  "Info",
] as const;

export const categories = [
  "Ransomware",
  "Breach",
  "Infostealer",
  "Forum Actor",
  "Hacktivism",
  "Fraud",
  "Vulnerability",
  "Other",
] as const;

export const malaysiaRelevances = ["Direct", "Indirect", "None"] as const;

export const sectors = [
  "Finance",
  "Gov",
  "Telco",
  "Healthcare",
  "Energy",
  "Education",
  "Other",
] as const;

function asEnumOr<T extends readonly string[]>(
  value: unknown,
  allowed: T,
  fallback: T[number],
): T[number] {
  return typeof value === "string" &&
    (allowed as readonly string[]).includes(value)
    ? (value as T[number])
    : fallback;
}

/** Coerce model drift (e.g. sector "Manufacturing") into allowed enums. */
export const classificationSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object") return raw;
  const o = raw as Record<string, unknown>;
  let confidence: unknown = o.confidence;
  if (typeof confidence === "string" && confidence.trim() !== "") {
    confidence = Number(confidence);
  }
  if (typeof confidence === "number" && !Number.isNaN(confidence)) {
    confidence = Math.min(1, Math.max(0, confidence));
  }
  return {
    ...o,
    threat_level: asEnumOr(o.threat_level, threatLevels, "Info"),
    category: asEnumOr(o.category, categories, "Other"),
    malaysia_relevance: asEnumOr(
      o.malaysia_relevance,
      malaysiaRelevances,
      "None",
    ),
    sector: asEnumOr(o.sector, sectors, "Other"),
    confidence,
    rationale:
      typeof o.rationale === "string" && o.rationale.trim()
        ? o.rationale.trim()
        : "Unspecified",
  };
}, z.object({
  threat_level: z.enum(threatLevels),
  category: z.enum(categories),
  malaysia_relevance: z.enum(malaysiaRelevances),
  sector: z.enum(sectors),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
}));

export type ClassificationResult = z.infer<typeof classificationSchema>;
