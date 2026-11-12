import type { SessionBlock, Zone } from "@/components/stride/session-blocks";
import { familyLabels, type SessionFamily } from "./program";

export type SessionIntensity = { level: Zone | null; label: string };

export const intensityLabels: Record<Zone, string> = {
  1: "Récup",
  2: "Facile",
  3: "Tempo",
  4: "Seuil",
  5: "Fractionné",
};

const unrankedFamilies: Partial<Record<SessionFamily, string>> = {
  strength: "Renfo",
  mobility: "Mobilité",
  cross: "Sport croisé",
  race: "Course",
};

export function dayIntensity(
  family: SessionFamily,
  blocks: readonly SessionBlock[],
): SessionIntensity | null {
  if (family === "rest") return null;
  const unranked = unrankedFamilies[family];
  if (unranked) return { level: null, label: unranked };
  const peak = blocks.reduce<Zone | null>(
    (zone, block) =>
      block.removed
        ? zone
        : zone === null || block.zone > zone
          ? block.zone
          : zone,
    null,
  );
  if (peak === null) return { level: null, label: familyLabels[family] };
  if (family === "long" || family === "long_trail")
    return { level: peak, label: "Long" };
  return { level: peak, label: intensityLabels[peak] };
}
