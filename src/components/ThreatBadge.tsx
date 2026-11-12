import type { threatLevels } from "@/lib/classification-schema";

type ThreatLevel = (typeof threatLevels)[number] | string | null | undefined;

const TONE: Record<string, { color: string; weight: string }> = {
  Critical: { color: "var(--threat)", weight: "600" },
  High: { color: "var(--threat)", weight: "600" },
  Medium: { color: "var(--muted)", weight: "500" },
  Low: { color: "var(--info)", weight: "500" },
  Info: { color: "var(--info)", weight: "400" },
};

type ThreatBadgeProps = {
  level: ThreatLevel;
  className?: string;
};

/**
 * Severity label. Critical/High use amber threat token and outrank quieter tones.
 * No rainbow chips, no glow, no pills-as-decoration.
 */
export function ThreatBadge({ level, className = "" }: ThreatBadgeProps) {
  const label = level?.trim() || "Unclassified";
  const tone = TONE[label] ?? {
    color: "var(--muted)",
    weight: "500",
  };

  return (
    <span
      className={`inline-flex items-baseline font-mono text-xs uppercase tracking-wider ${className}`}
      style={{ color: tone.color, fontWeight: tone.weight }}
      data-threat={label}
    >
      {label}
    </span>
  );
}
