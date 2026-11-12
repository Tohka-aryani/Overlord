import { threatLevels } from "@/lib/classification-schema";

const THREAT_RANK: Record<string, number> = Object.fromEntries(
  threatLevels.map((level, i) => [level, i]),
);

/** Lower = more urgent. Unclassified sits after Info so labeled Critical/High win. */
export function threatSortRank(level: string | null | undefined): number {
  if (!level) return threatLevels.length;
  return THREAT_RANK[level] ?? threatLevels.length;
}
