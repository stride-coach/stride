import {
  breakIn,
  breakInBudgetKm,
  type BreakInStatus,
} from "@/features/gear/break-in";
import { pairWear, replacementDate, weeklyKm } from "@/features/gear/mileage";
import type { ShoeTerrain } from "@/features/gear/model";
import { formatKm, modelName, type ShoeInput } from "@/features/gear/view";
import {
  plainPortions,
  type RaceNutritionAllocation,
} from "@/features/fueling/allocation";
import { formatKm as formatCourseKm } from "./format";
import type { Waypoint } from "./waypoints";

const breakInLabels: Record<BreakInStatus, string> = {
  new: "neuves",
  breaking_in: "en rodage",
  broken_in: "rodées",
};

const terrainWords: Record<ShoeTerrain, string> = {
  road: "route",
  trail: "trail",
  mixed: "terrain mixte",
};

export type RacePairView = {
  id: string;
  name: string;
  facts: string;
  terrain: string;
  badge: string;
  advice: string;
  raceDay: string | null;
};

const dayMs = 86_400_000;

export function racePairView({
  shoe,
  source,
  raceDate,
  today,
  dropBag,
}: {
  shoe: ShoeInput;
  source: "checklist" | "reserved";
  raceDate: string | null;
  today: string;
  dropBag: boolean;
}): RacePairView {
  const wear = pairWear({
    startingDistanceM: shoe.startingDistanceM,
    garminDistanceM: shoe.garmin?.totalDistanceM ?? 0,
    lifespanKm: shoe.spec.lifespanKm,
  });
  const longestKm =
    Math.max(0, ...shoe.activities.map((run) => run.distanceM)) / 1000;
  const state = breakIn(wear.totalKm, longestKm);
  const replacement = replacementDate(wear, shoe.activities, today);
  const lifespan = formatKm(wear.lifespanKm);
  const wearAdvice =
    state.status !== "broken_in"
      ? `Rode-les avant la course : encore ${formatKm(Math.max(breakInBudgetKm.max - wear.totalKm, 1))} km pour atteindre ${breakInBudgetKm.min} à ${breakInBudgetKm.max} km.`
      : wear.worn ||
          (replacement !== null && raceDate !== null && replacement <= raceDate)
        ? `Elles atteindront ${lifespan} km avant la course : prévois une paire neuve et rodée.`
        : `Change-les après ${lifespan} km : il te reste la marge jusqu’à la course.`;
  const perWeek = weeklyKm(shoe.activities, today);
  const days =
    raceDate === null
      ? 0
      : (Date.parse(`${raceDate}T00:00:00Z`) -
          Date.parse(`${today}T00:00:00Z`)) /
        dayMs;
  const projected =
    days > 0 && perWeek >= 1 ? wear.totalKm + (perWeek * days) / 7 : null;
  return {
    id: shoe.id,
    name: `${shoe.spec.brand} ${modelName(shoe.spec)}`,
    facts: `${formatKm(wear.totalKm)} km · ${breakInLabels[state.status]}`,
    terrain: terrainWords[shoe.spec.terrain],
    badge: source === "checklist" ? "Choisie" : "Recommandée",
    raceDay:
      projected === null
        ? null
        : `≈ ${formatKm(projected)} km le jour J, ${projected < wear.lifespanKm ? "sous" : "au-delà de"} sa limite de ${lifespan} km`,
    advice: dropBag
      ? `${wearAdvice} Une paire de rechange dans le sac d’allègement est conseillée.`
      : wearAdvice,
  };
}

export type DropBagView = {
  stationId: string;
  km: string;
  nutrition: string | null;
};

export function dropBagView(
  waypoints: readonly Waypoint[],
  allocation: RaceNutritionAllocation | null,
): DropBagView[] {
  const byId = new Map(waypoints.map((point) => [point.id, point]));
  const bags = allocation?.dropBags.length
    ? allocation.dropBags.flatMap((bag) => {
        const base = byId.get(bag.stationId);
        return base ? [{ base, items: bag.items }] : [];
      })
    : waypoints
        .filter((point) => point.kind === "base")
        .map((base) => ({ base, items: [] }));
  return bags.map(({ base, items }) => ({
    stationId: base.id,
    km: formatCourseKm(base.distanceM),
    nutrition: items.length ? plainPortions(items, ", ") : null,
  }));
}
