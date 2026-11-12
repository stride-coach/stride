import "server-only";
import { raceEditions, type EditionRun } from "@/features/races/editions";
import type { RaceSummary } from "@/features/races/race";
import { readActivityDetail } from "@/server/activities/activities";
import type { OnboardingContext } from "@/server/onboarding/context";
import { listRaces } from "./races";
import { readRaceResults } from "./results";

async function editionRun(
  context: OnboardingContext,
  race: RaceSummary & { date: string },
  result: { activityId: string; seconds: number; distanceMeters: number },
): Promise<EditionRun> {
  const detail = await readActivityDetail(context, result.activityId).catch(
    () => null,
  );
  return {
    year: race.date.slice(0, 4),
    seconds: result.seconds,
    distanceMeters: result.distanceMeters,
    averageHeartRate: detail?.activity.averageHeartRate ?? null,
    series: detail?.track?.series ?? null,
  };
}

export async function loadEditions(
  context: OnboardingContext,
  race: RaceSummary & { date: string },
  today: string,
  withId: string | null,
) {
  const editions = raceEditions(await listRaces(context), race, today);
  const chosen =
    editions.find((item) => item.id === withId) ?? editions[0] ?? null;
  if (!chosen) return { editions, chosen: null, current: null, previous: null };
  const results = await readRaceResults(context, [race, chosen]);
  const [current, previous] = await Promise.all([
    results[race.id] ? editionRun(context, race, results[race.id]) : null,
    results[chosen.id] ? editionRun(context, chosen, results[chosen.id]) : null,
  ]);
  return { editions, chosen, current, previous };
}
