import "server-only";
import type { RaceFormRace } from "@/features/races/components/race-form";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readGoals } from "@/server/onboarding/goals";
import { readActivePlan } from "@/server/plans/stored";
import {
  raceDetailColumns,
  raceDetailsOf,
  type ReferenceRace,
} from "@/features/races/race-details";
import { localToday } from "@/features/app-shell/shell";
import { listRaces } from "./races";
import { readRaceResults } from "./results";
import type { RaceResult } from "@/features/races/results";

export async function loadRaceForm(
  context: OnboardingContext,
  raceId: string | null,
) {
  const today = localToday(new Date());
  const [goals, plan, races] = await Promise.all([
    readGoals(context),
    readActivePlan(context),
    listRaces(context).catch(() => []),
  ]);
  const past = races.filter(
    (item) =>
      item.id !== raceId &&
      item.date !== null &&
      item.date < today &&
      item.distanceKm !== null,
  );
  const results = await readRaceResults(context, past).catch(
    (): Record<string, RaceResult> => ({}),
  );
  const references: ReferenceRace[] = past.flatMap((item) => {
    const result = results[item.id];
    return result && item.date && item.distanceKm
      ? [
          {
            name: item.name,
            date: item.date,
            kind: item.kind,
            distanceKm: item.distanceKm,
            elevationGainM: item.elevationGainM,
            seconds: result.seconds,
          },
        ]
      : [];
  });
  const snapshot = raceId
    ? (goals.races.find((race) => race.id === raceId) ?? null)
    : null;
  const details = snapshot
    ? await context.client
        .from("athlete_races")
        .select(raceDetailColumns)
        .eq("user_id", context.userId)
        .eq("id", snapshot.id)
        .maybeSingle()
    : null;
  const measured = snapshot
    ? await context.client
        .from("race_courses")
        .select("distance_m, elevation_gain_m")
        .eq("user_id", context.userId)
        .eq("race_id", snapshot.id)
        .maybeSingle()
    : null;
  const stored = snapshot
    ? await context.client
        .from("race_plans")
        .select("start_time, cutoff_duration_seconds")
        .eq("user_id", context.userId)
        .eq("race_id", snapshot.id)
        .maybeSingle()
    : null;
  if (stored?.error) throw new Error("Unable to read the race plan");
  const race: RaceFormRace | null = snapshot
    ? {
        id: snapshot.id,
        revision: snapshot.revision ?? 1,
        values: snapshot.values,
        startTime: stored?.data?.start_time?.slice(0, 5) ?? null,
        cutoffSeconds: stored?.data?.cutoff_duration_seconds ?? null,
        details: raceDetailsOf(details?.data ?? null),
        course: measured?.data
          ? {
              distanceM: Number(measured.data.distance_m),
              elevationGainM: measured.data.elevation_gain_m,
            }
          : null,
      }
    : null;
  const primaryRace = goals.races.find(
    (item) =>
      item.values.priority === "A" &&
      item.id !== snapshot?.id &&
      item.values.name,
  );
  const primaryName = primaryRace?.values.name ?? null;
  const primary =
    primaryRace && primaryName
      ? { name: primaryName, kind: primaryRace.values.race_kind }
      : null;
  return { race, primaryName, primary, hasPlan: plan !== null, references };
}
