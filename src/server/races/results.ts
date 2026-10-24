import "server-only";
import {
  activityColumns,
  activityRowSchema,
} from "@/features/activities/activities";
import { runningTypes } from "@/features/progress/history";
import { addDays } from "@/features/progress/period";
import type { RaceSummary } from "@/features/races/race";
import {
  raceResults,
  resultWindow,
  type RaceResult,
} from "@/features/races/results";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readAll } from "@/server/progress/history";

export async function readRaceResults(
  context: OnboardingContext,
  races: RaceSummary[],
): Promise<Record<string, RaceResult>> {
  const window = resultWindow(races);
  if (!window) return {};
  try {
    const rows = await readAll((from, to) =>
      context.client
        .from("provider_activities")
        .select(activityColumns)
        .eq("user_id", context.userId)
        .in("activity_type", [...runningTypes])
        .gte("started_at", `${addDays(window.from, -1)}T00:00:00Z`)
        .lt("started_at", `${addDays(window.to, 2)}T00:00:00Z`)
        .order("started_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    return raceResults(
      races,
      rows.flatMap((row) => {
        const parsed = activityRowSchema.safeParse(row);
        return parsed.success ? [parsed.data] : [];
      }),
    );
  } catch (error) {
    console.error("Race results were not read", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {};
  }
}
