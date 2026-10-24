import "server-only";
import {
  activityColumns,
  activityRowSchema,
} from "@/features/activities/activities";
import { addDays } from "@/features/progress/period";
import type { RaceSummary } from "@/features/races/race";
import { matchRaceResult, type RaceResult } from "@/features/races/results";
import type { OnboardingContext } from "@/server/onboarding/context";

const maxResultDays = 60;

export async function readRaceResults(
  context: OnboardingContext,
  races: RaceSummary[],
): Promise<Record<string, RaceResult>> {
  const days = [
    ...new Set(races.flatMap((race) => (race.date ? [race.date] : []))),
  ].slice(0, maxResultDays);
  if (days.length === 0) return {};
  const { data, error } = await context.client
    .from("provider_activities")
    .select(activityColumns)
    .eq("user_id", context.userId)
    .or(
      days
        .map(
          (day) =>
            `and(started_at.gte.${addDays(day, -1)}T00:00:00Z,started_at.lt.${addDays(day, 2)}T00:00:00Z)`,
        )
        .join(","),
    )
    .limit(1000);
  if (error) throw new Error("Unable to read the race results");
  const activities = (data ?? []).flatMap((row) => {
    const parsed = activityRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  return Object.fromEntries(
    races.flatMap((race) => {
      const result = matchRaceResult(race, activities);
      return result ? [[race.id, result]] : [];
    }),
  );
}
