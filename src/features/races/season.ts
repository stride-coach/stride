import { mondayOf } from "@/features/plans/model/dates";
import { longestRunTargetMeters } from "@/features/plans/feasibility/feasibility";
import {
  matchTemplate,
  planTemplates,
} from "@/features/plans/templates/templates";
import type { GarminPrediction } from "@/features/progress/garmin-predictions";
import { formatClock } from "@/features/progress/format";
import { isRunning, type ProgressActivity } from "@/features/progress/history";
import { formatHours, formatInteger, formatPace } from "./format";
import type { RaceSummary } from "./race";
import { formatResultDelta, type RaceResult } from "./results";

export type SeasonTone = "success" | "warning" | "muted";

export function seasonRole(race: RaceSummary, races: RaceSummary[]) {
  if (race.priority === "A") return "Objectif de la saison";
  if (race.priority === "B")
    return races.some(
      (other) =>
        other.priority === "A" &&
        other.date !== null &&
        race.date !== null &&
        other.date > race.date,
    )
      ? "Répétition générale"
      : "Course importante";
  return race.kind === "road" ? "Test d’allure" : "Course de préparation";
}

export function raceOutcome(
  race: Pick<RaceSummary, "targetSeconds">,
  result: RaceResult | undefined,
): { label: string; tone: SeasonTone } {
  if (!result) return { label: "Résultat non trouvé", tone: "muted" };
  if (race.targetSeconds === null || result.deltaSeconds === null)
    return { label: "Terminé", tone: "muted" };
  return result.deltaSeconds <= 0
    ? { label: "Objectif tenu", tone: "success" }
    : {
        label: `${formatResultDelta(result.deltaSeconds)} sur l’objectif`,
        tone: "warning",
      };
}

export function bestWeeklyRunSeconds(activities: ProgressActivity[]) {
  const weeks = new Map<string, number>();
  for (const activity of activities)
    if (isRunning(activity.type) && activity.duration)
      weeks.set(
        mondayOf(activity.day),
        (weeks.get(mondayOf(activity.day)) ?? 0) + activity.duration,
      );
  return weeks.size === 0 ? null : Math.max(...weeks.values());
}

export type RaceDemand = {
  key: "longest" | "gain" | "volume";
  label: string;
  current: string;
  target: string;
  ratio: number;
};

export type DemandMarks = {
  longestRunMeters: number | null;
  maxWeeklyGainMeters: number | null;
  maxWeeklyRunSeconds: number | null;
};

function demand(
  key: RaceDemand["key"],
  label: string,
  current: number | null,
  target: number,
  format: (value: number) => string,
): RaceDemand {
  return {
    key,
    label,
    current: current === null ? "—" : format(current),
    target: format(target),
    ratio: current === null ? 0 : Math.min(current / target, 1),
  };
}

export function raceDemands(
  race: Pick<RaceSummary, "kind" | "distanceKm" | "elevationGainM">,
  marks: DemandMarks,
): RaceDemand[] {
  const rows: RaceDemand[] = [];
  const km = (meters: number) => `${formatInteger(meters / 1000)} km`;
  const gain = (meters: number) => `+${formatInteger(meters)} m`;
  if (race.distanceKm)
    rows.push(
      demand(
        "longest",
        "Sortie la plus longue",
        marks.longestRunMeters,
        longestRunTargetMeters(race.distanceKm),
        km,
      ),
    );
  if (race.kind === "trail" && race.elevationGainM)
    rows.push(
      demand(
        "gain",
        "Dénivelé / semaine",
        marks.maxWeeklyGainMeters,
        race.elevationGainM,
        gain,
      ),
    );
  const template = race.distanceKm
    ? matchTemplate({ distanceKm: race.distanceKm, kind: race.kind })
    : null;
  if (template && template.id !== planTemplates.base_building.id)
    rows.push(
      demand(
        "volume",
        "Volume / semaine",
        marks.maxWeeklyRunSeconds,
        template.peakWeekHours.min * 3600,
        formatHours,
      ),
    );
  return rows;
}

export type CurrentValue = {
  key: GarminPrediction["key"];
  label: string;
  time: string;
  change: string | null;
  tone: SeasonTone;
};

const valueLabels: Partial<Record<GarminPrediction["key"], string>> = {
  "10k": "10 km",
  half_marathon: "Semi",
  marathon: "Marathon",
};

export function currentValues(predictions: GarminPrediction[]): CurrentValue[] {
  return (["10k", "half_marathon", "marathon"] as const).flatMap((key) => {
    const prediction = predictions.find((item) => item.key === key);
    if (!prediction) return [];
    const change = prediction.previous
      ? prediction.seconds - prediction.previous.seconds
      : null;
    return [
      {
        key,
        label: valueLabels[key] ?? prediction.label,
        time: formatClock(prediction.seconds),
        change: change === null ? null : formatResultDelta(change),
        tone:
          change === null || change === 0
            ? "muted"
            : change < 0
              ? "success"
              : "warning",
      },
    ];
  });
}

export function targetPace(
  race: Pick<RaceSummary, "targetSeconds" | "distanceKm">,
) {
  return race.targetSeconds && race.distanceKm
    ? `${formatPace(race.targetSeconds / race.distanceKm)} /km`
    : null;
}
