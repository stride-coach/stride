import "server-only";
import {
  activityColumns,
  activityRowSchema,
} from "@/features/activities/activities";
import { runningTypes } from "@/features/progress/history";
import { addDays } from "@/features/progress/period";
import {
  raceEditions,
  type EditionDay,
  type EditionRun,
  type EditionSetting,
} from "@/features/races/editions";
import type { RaceSummary } from "@/features/races/race";
import { readActivityDetail } from "@/server/activities/activities";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readAll } from "@/server/progress/history";
import { listRaces } from "./races";
import { readRaceResults } from "./results";
import { raceDayWeather } from "./weather";

const volumeDays = 112;

type EditionRunWithStart = EditionRun & { startedAt: string | null };

async function editionRun(
  context: OnboardingContext,
  race: RaceSummary & { date: string },
  result: { activityId: string; seconds: number; distanceMeters: number },
): Promise<EditionRunWithStart> {
  const detail = await readActivityDetail(context, result.activityId).catch(
    () => null,
  );
  return {
    year: race.date.slice(0, 4),
    seconds: result.seconds,
    distanceMeters: result.distanceMeters,
    averageHeartRate: detail?.activity.averageHeartRate ?? null,
    series: detail?.track?.series ?? null,
    startedAt: detail?.activity.startedAt ?? null,
  };
}

async function runSecondsBefore(context: OnboardingContext, date: string) {
  try {
    const rows = await readAll((from, to) =>
      context.client
        .from("provider_activities")
        .select(activityColumns)
        .eq("user_id", context.userId)
        .in("activity_type", [...runningTypes])
        .gte("started_at", `${addDays(date, -volumeDays)}T00:00:00Z`)
        .lt("started_at", `${date}T00:00:00Z`)
        .order("started_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    );
    return rows.reduce((sum, row) => {
      const parsed = activityRowSchema.safeParse(row);
      return sum + (parsed.success ? (parsed.data.durationSeconds ?? 0) : 0);
    }, 0);
  } catch {
    return null;
  }
}

async function editionSettings(
  context: OnboardingContext,
  races: (RaceSummary & { date: string })[],
): Promise<Record<string, EditionSetting>> {
  const { data } = await context.client
    .from("race_plans")
    .select("race_id, walk_grade_percent, carbs_per_hour_g")
    .eq("user_id", context.userId)
    .in(
      "race_id",
      races.map((race) => race.id),
    );
  const volumes = await Promise.all(
    races.map((race) => runSecondsBefore(context, race.date)),
  );
  return Object.fromEntries(
    races.map((race, index) => {
      const plan = (data ?? []).find((row) => row.race_id === race.id);
      return [
        race.id,
        {
          walkGradePercent: plan?.walk_grade_percent ?? null,
          carbsPerHourG: plan?.carbs_per_hour_g ?? null,
          runSeconds: volumes[index],
        },
      ];
    }),
  );
}

export async function loadEditions(
  context: OnboardingContext,
  race: RaceSummary & { date: string },
  today: string,
  withId: string | null,
  place: { lat: number; lon: number } | null = null,
) {
  const editions = raceEditions(await listRaces(context), race, today);
  const chosen =
    editions.find((item) => item.id === withId) ?? editions[0] ?? null;
  if (!chosen)
    return {
      editions,
      chosen: null,
      current: null,
      previous: null,
      settings: null,
      days: [] as EditionDay[],
    };
  const results = await readRaceResults(context, [race, chosen]);
  const [current, previous, settings] = await Promise.all([
    results[race.id] ? editionRun(context, race, results[race.id]) : null,
    results[chosen.id] ? editionRun(context, chosen, results[chosen.id]) : null,
    editionSettings(context, [race, chosen]),
  ]);
  const days = place
    ? (
        await Promise.all(
          [previous, current].map(async (run) =>
            run?.startedAt
              ? raceDayWeather({
                  ...place,
                  startedAt: run.startedAt,
                  seconds: run.seconds,
                }).then((weather) =>
                  weather ? { year: run.year, ...weather } : null,
                )
              : null,
          ),
        )
      ).filter((day): day is EditionDay => day !== null)
    : [];
  return {
    editions,
    chosen,
    current,
    previous,
    settings: {
      current: settings[race.id],
      previous: settings[chosen.id],
    },
    days,
  };
}
