import { isRunning } from "@/features/progress/history";
import type { RaceSummary } from "./race";

export type ResultActivity = {
  id: string;
  type: string | null;
  date: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
};

export type RaceResult = {
  activityId: string;
  seconds: number;
  distanceMeters: number;
  deltaSeconds: number | null;
};

export const resultDistanceTolerance = 0.15;

export function matchRaceResult(
  race: Pick<RaceSummary, "date" | "distanceKm" | "targetSeconds">,
  activities: ResultActivity[],
): RaceResult | null {
  if (!race.date || !race.distanceKm) return null;
  const meters = race.distanceKm * 1000;
  const best = activities
    .filter(
      (activity) =>
        activity.date === race.date &&
        activity.type !== null &&
        isRunning(activity.type) &&
        activity.distanceMeters !== null &&
        activity.durationSeconds !== null &&
        Math.abs(activity.distanceMeters - meters) <=
          meters * resultDistanceTolerance,
    )
    .sort(
      (a, b) =>
        Math.abs(a.distanceMeters! - meters) -
        Math.abs(b.distanceMeters! - meters),
    )[0];
  if (!best) return null;
  return {
    activityId: best.id,
    seconds: best.durationSeconds!,
    distanceMeters: best.distanceMeters!,
    deltaSeconds:
      race.targetSeconds === null
        ? null
        : best.durationSeconds! - race.targetSeconds,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatResultTime(seconds: number) {
  const total = Math.round(seconds);
  if (total < 3600) return `${Math.floor(total / 60)}:${pad(total % 60)}`;
  const minutes = Math.round(total / 60);
  return `${Math.floor(minutes / 60)}h${pad(minutes % 60)}`;
}

export function formatResultDelta(seconds: number) {
  const sign = seconds > 0 ? "+" : seconds < 0 ? "−" : "±";
  const total = Math.abs(Math.round(seconds));
  if (total < 60) return `${sign}${total} s`;
  const minutes = Math.round(total / 60);
  if (minutes < 60) return `${sign}${minutes} min`;
  return `${sign}${Math.floor(minutes / 60)}h${pad(minutes % 60)}`;
}

export function resultWindow(races: Pick<RaceSummary, "date">[]) {
  const days = races.flatMap((race) => (race.date ? [race.date] : [])).sort();
  return days.length ? { from: days[0], to: days[days.length - 1] } : null;
}

export function raceResults(
  races: Pick<RaceSummary, "id" | "date" | "distanceKm" | "targetSeconds">[],
  activities: ResultActivity[],
): Record<string, RaceResult> {
  return Object.fromEntries(
    races.flatMap((race) => {
      const result = matchRaceResult(race, activities);
      return result ? [[race.id, result]] : [];
    }),
  );
}
