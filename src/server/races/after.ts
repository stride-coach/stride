import "server-only";
import { z } from "zod";
import { recoveryNights } from "@/features/progress/recovery";
import type { RaceSummary } from "@/features/races/race";
import { readActivityDetail } from "@/server/activities/activities";
import { readActivityFeeling } from "@/server/activities/feelings";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readRaceResults } from "./results";

const observationSchema = z.object({
  metric: z.string(),
  observed_on: z.string(),
  value_numeric: z.union([z.number(), z.string()]).nullable(),
});

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function readRecoveryNights(
  context: OnboardingContext,
  raceDate: string,
) {
  const { data, error } = await context.client
    .from("provider_observations")
    .select("metric, observed_on, value_numeric")
    .eq("user_id", context.userId)
    .in("metric", ["resting_heart_rate_bpm", "hrv_last_night_ms"])
    .in("availability", ["available", "partial"])
    .gte("observed_on", addDays(raceDate, -28))
    .lte("observed_on", addDays(raceDate, 10))
    .order("observed_on", { ascending: true })
    .limit(200);
  if (error) return [];
  return recoveryNights(
    (data ?? []).flatMap((row) => {
      const parsed = observationSchema.safeParse(row);
      if (!parsed.success) return [];
      const value =
        parsed.data.value_numeric === null
          ? NaN
          : Number(parsed.data.value_numeric);
      return [
        {
          metric: parsed.data.metric,
          day: parsed.data.observed_on,
          value: Number.isFinite(value) ? value : null,
          text: null,
        },
      ];
    }),
  );
}

export async function loadAfterRace(
  context: OnboardingContext,
  race: RaceSummary & { date: string },
) {
  const [results, nights] = await Promise.all([
    readRaceResults(context, [race]),
    readRecoveryNights(context, race.date),
  ]);
  const result = results[race.id] ?? null;
  if (!result) return { result: null, detail: null, feeling: null, nights };
  const [detail, feeling] = await Promise.all([
    readActivityDetail(context, result.activityId).catch(() => null),
    readActivityFeeling(context, result.activityId).catch(() => null),
  ]);
  return { result, detail, feeling, nights };
}
