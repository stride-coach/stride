import "server-only";
import {
  activityColumns,
  activityRowSchema,
} from "@/features/activities/activities";
import { isPlannedMatch } from "@/features/activities/plan-status";
import { localToday } from "@/features/app-shell/shell";
import {
  activityEntry,
  raceEntry,
  sessionEntry,
} from "@/features/search/entries";
import type { SearchEntry, SearchIndex } from "@/features/search/results";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadPlanOverview } from "@/server/plans/overview";
import { listRaces } from "@/server/races/races";

const activityLimit = 500;

async function readSearchActivities(context: OnboardingContext) {
  const { data, error } = await context.client
    .from("provider_activities")
    .select(activityColumns)
    .eq("user_id", context.userId)
    .order("started_at", { ascending: false })
    .limit(activityLimit);
  if (error) throw new Error("Unable to read activities for search");
  return (data ?? []).flatMap((row) => {
    const parsed = activityRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export async function loadSearchIndex(
  context: OnboardingContext,
): Promise<SearchIndex> {
  const [overview, races, activities] = await Promise.all([
    loadPlanOverview(context),
    listRaces(context),
    readSearchActivities(context),
  ]);
  const today = overview?.today ?? localToday(new Date());
  const done = new Set(
    (overview?.matches ?? [])
      .filter((match) => isPlannedMatch(match))
      .map((match) => match.sessionKey),
  );
  const sessions: SearchEntry[] = (overview?.plan.state.sessions ?? [])
    .filter((session) => session.sport !== "rest" && session.kind !== "rest")
    .map((session) =>
      sessionEntry(session, today, done.has(session.sessionKey)),
    );
  return {
    today,
    entries: [
      ...sessions,
      ...activities.map(activityEntry),
      ...races.map((race) => raceEntry(race, today)),
    ],
  };
}
