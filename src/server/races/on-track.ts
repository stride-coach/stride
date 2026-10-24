import "server-only";
import { cache } from "react";
import { buildProgram } from "@/features/plans/view/program";
import { garminPredictions } from "@/features/progress/garmin-predictions";
import {
  nextKeySession,
  preparationWindowDays,
} from "@/features/progress/goal";
import {
  progressActivityColumns,
  progressActivitySchema,
} from "@/features/progress/history";
import { addDays } from "@/features/progress/period";
import { fitnessRecords } from "@/features/progress/records";
import type { OnTrackInputs } from "@/features/races/on-track";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadPlanOverview, programInput } from "@/server/plans/overview";
import { readPredictions } from "@/server/progress/predictions";

async function readRecentActivities(context: OnboardingContext, today: string) {
  const since = addDays(today, -preparationWindowDays);
  const { data, error } = await context.client
    .from("provider_activities")
    .select(progressActivityColumns)
    .eq("user_id", context.userId)
    .gte("started_at", `${addDays(since, -1)}T00:00:00Z`)
    .order("started_at", { ascending: true })
    .limit(1000);
  if (error) throw new Error("Unable to read the recent activities");
  return (data ?? []).flatMap((row) => {
    const parsed = progressActivitySchema.safeParse(row);
    return parsed.success &&
      parsed.data.day >= since &&
      parsed.data.day <= today
      ? [parsed.data]
      : [];
  });
}

export const loadOnTrackInputs = cache(
  async (context: OnboardingContext, today: string): Promise<OnTrackInputs> => {
    const [overview, predictions, activities] = await Promise.all([
      loadPlanOverview(context).catch(() => null),
      readPredictions(context, today).catch(() => []),
      readRecentActivities(context, today).catch(() => []),
    ]);
    const program = overview ? buildProgram(programInput(overview)) : null;
    const recent = fitnessRecords(activities, []);
    return {
      today,
      predictions: garminPredictions(predictions, today),
      longestRunMeters: recent.longest?.meters ?? null,
      longestRunDay: recent.longest?.day ?? null,
      maxWeeklyGainMeters: recent.weeklyGain?.meters ?? null,
      program,
      blockKinds: Object.fromEntries(
        (overview?.plan.state.blocks ?? []).map((block) => [
          block.blockKey,
          block.kind,
        ]),
      ),
      nextKey: overview
        ? nextKeySession(overview.plan.state.sessions, today)
        : null,
    };
  },
);
