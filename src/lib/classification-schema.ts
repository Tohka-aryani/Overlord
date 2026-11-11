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

export const classificationSchema = z.object({
  threat_level: z.enum(threatLevels),
  category: z.enum(categories),
  malaysia_relevance: z.enum(malaysiaRelevances),
  sector: z.enum(sectors),
  confidence: z.number().min(0).max(1),
  rationale: z.string().min(1),
});

export type ClassificationResult = z.infer<typeof classificationSchema>;
