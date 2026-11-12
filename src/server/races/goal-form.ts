import "server-only";
import type { RaceFormRace } from "@/features/races/components/race-form";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readGoals } from "@/server/onboarding/goals";
import { readActivePlan } from "@/server/plans/stored";

export async function loadRaceForm(
  context: OnboardingContext,
  raceId: string | null,
) {
  const [goals, plan] = await Promise.all([
    readGoals(context),
    readActivePlan(context),
  ]);
  const snapshot = raceId
    ? (goals.races.find((race) => race.id === raceId) ?? null)
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
      }
    : null;
  const primaryName =
    goals.races.find(
      (item) =>
        item.values.priority === "A" &&
        item.id !== snapshot?.id &&
        item.values.name,
    )?.values.name ?? null;
  return { race, primaryName, hasPlan: plan !== null };
}
