import "server-only";
import {
  progressActivityColumns,
  progressActivitySchema,
  isRunning,
} from "@/features/progress/history";
import {
  fuelingTestColumns,
  fuelingTests,
  type LongRun,
} from "@/features/fueling/tests";
import type { OnboardingContext } from "@/server/onboarding/context";

const longRunSeconds = 75 * 60;
const longRunDays = 180;

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function readFuelingTests(context: OnboardingContext) {
  const { data, error } = await context.client
    .from("fueling_tests")
    .select(fuelingTestColumns)
    .eq("user_id", context.userId)
    .order("tested_on", { ascending: false })
    .limit(30);
  return error ? [] : fuelingTests(data ?? []);
}

export async function readLongRuns(
  context: OnboardingContext,
  today: string,
): Promise<LongRun[]> {
  const { data, error } = await context.client
    .from("provider_activities")
    .select(progressActivityColumns)
    .eq("user_id", context.userId)
    .gte("started_at", `${addDays(today, -longRunDays)}T00:00:00Z`)
    .gte("duration_seconds", longRunSeconds)
    .order("started_at", { ascending: false })
    .limit(30);
  if (error) return [];
  return (data ?? []).flatMap((row) => {
    const parsed = progressActivitySchema.safeParse(row);
    return parsed.success &&
      isRunning(parsed.data.type) &&
      (parsed.data.duration ?? 0) >= longRunSeconds
      ? [
          {
            id: parsed.data.id,
            day: parsed.data.day,
            name: parsed.data.name,
            durationSeconds: parsed.data.duration ?? 0,
            distanceM: parsed.data.distance,
          },
        ]
      : [];
  });
}
