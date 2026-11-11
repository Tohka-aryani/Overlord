import { describe, expect, it } from "vitest";
import { classificationSchema } from "../classification-schema";

const valid = {
  threat_level: "High",
  category: "Ransomware",
  malaysia_relevance: "Direct",
  sector: "Finance",
  confidence: 0.87,
  rationale: "MY bank named in LockBit claim.",
};

describe("classificationSchema", () => {
  it("accepts a full valid classification payload", () => {
    const result = classificationSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(valid);
    }
  });

  it("accepts every allowed enum value", () => {
    const threatLevels = ["Critical", "High", "Medium", "Low", "Info"] as const;
    const categories = [
      "Ransomware",
      "Breach",
      "Infostealer",
      "Forum Actor",
      "Hacktivism",
      "Fraud",
      "Vulnerability",
      "Other",
    ] as const;
    const malaysiaRelevances = ["Direct", "Indirect", "None"] as const;
    const sectors = [
      "Finance",
      "Gov",
      "Telco",
      "Healthcare",
      "Energy",
      "Education",
      "Other",
    ] as const;

    for (const threat_level of threatLevels) {
      expect(
        classificationSchema.safeParse({ ...valid, threat_level }).success,
      ).toBe(true);
    }
    for (const category of categories) {
      expect(
        classificationSchema.safeParse({ ...valid, category }).success,
      ).toBe(true);
    }
    for (const malaysia_relevance of malaysiaRelevances) {
      expect(
        classificationSchema.safeParse({ ...valid, malaysia_relevance })
          .success,
      ).toBe(true);
    }
    for (const sector of sectors) {
      expect(
        classificationSchema.safeParse({ ...valid, sector }).success,
      ).toBe(true);
    }
  });

  it("accepts confidence at 0 and 1 inclusive", () => {
    expect(
      classificationSchema.safeParse({ ...valid, confidence: 0 }).success,
    ).toBe(true);
    expect(
      classificationSchema.safeParse({ ...valid, confidence: 1 }).success,
    ).toBe(true);
  });

  it("rejects unknown threat_level", () => {
    const result = classificationSchema.safeParse({
      ...valid,
      threat_level: "Severe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown category", () => {
    const result = classificationSchema.safeParse({
      ...valid,
      category: "Malware",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown malaysia_relevance", () => {
    const result = classificationSchema.safeParse({
      ...valid,
      malaysia_relevance: "Maybe",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unknown sector", () => {
    const result = classificationSchema.safeParse({
      ...valid,
      sector: "Retail",
    });
    expect(result.success).toBe(false);
  });

  it("rejects confidence outside 0–1", () => {
    expect(
      classificationSchema.safeParse({ ...valid, confidence: -0.01 }).success,
    ).toBe(false);
    expect(
      classificationSchema.safeParse({ ...valid, confidence: 1.01 }).success,
    ).toBe(false);
  });

  it("rejects empty rationale", () => {
    const result = classificationSchema.safeParse({
      ...valid,
      rationale: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { rationale: _r, ...missingRationale } = valid;
    expect(classificationSchema.safeParse(missingRationale).success).toBe(
      false,
    );
    expect(classificationSchema.safeParse({}).success).toBe(false);
  });
});
