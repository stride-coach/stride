import "server-only";
import { localToday } from "@/features/app-shell/shell";
import { buildProgram } from "@/features/plans/view/program";
import { buildToday, todaySessionKey } from "@/features/today/today";
import type { Activity } from "@/features/activities/activities";
import { listActivities, readActivity } from "@/server/activities/activities";
import { pairQuestion } from "@/features/gear/check-view";
import { loadWatchView } from "@/server/garmin/watch";
import { loadPairChecks } from "@/server/gear/checks";
import { reconcileGearNotificationsAfterResponse } from "@/server/notifications/garmin";
import type { OnboardingContext } from "@/server/onboarding/context";
import {
  loadPlanOverview,
  programInput,
  readPlanRaces,
} from "@/server/plans/overview";
import type { SessionMatch } from "@/server/plans/matches";
import { loadIntensityPaces } from "@/server/plans/paces";
import { sessionActivityIds } from "@/server/plans/session-activities";
import { loadSessionDebrief } from "@/server/plans/debrief";
import { loadSessionPanel } from "@/server/plans/session-panel";
import { readConditionReports } from "@/server/plans/health";
import { loadRecovery } from "@/server/progress/recovery";

async function loadLatestGroup(
  context: OnboardingContext,
  matches: SessionMatch[],
  latest: Activity | null,
) {
  const sessionKey = latest
    ? matches.find((match) => match.activityId === latest.id)?.sessionKey
    : undefined;
  if (!latest || !sessionKey) return [];
  const ids = sessionActivityIds(matches, sessionKey);
  if (ids.length < 2) return [];
  const activities = await Promise.all(
    ids.map((id) =>
      id === latest.id ? latest : readActivity(context, id).catch(() => null),
    ),
  );
  return activities.filter((activity) => activity !== null);
}

export async function loadToday(context: OnboardingContext, now: Date) {
  const overviewRead = loadPlanOverview(context);
  const latestRead = listActivities(context, "all", 1)
    .then(({ activities }) => activities[0] ?? null)
    .catch(() => null);
  const [
    overview,
    paces,
    recovery,
    latest,
    panel,
    races,
    ,
    checks,
    debrief,
    conditions,
    latestGroup,
  ] = await Promise.all([
    overviewRead,
    loadIntensityPaces(context),
    loadRecovery(context, localToday(now)),
    latestRead,
    overviewRead.then((overview) => {
      const sessionKey = todaySessionKey(
        overview?.plan.state ?? null,
        overview?.today ?? localToday(now),
      );
      return sessionKey ? loadSessionPanel(context, sessionKey) : null;
    }),
    overviewRead.then((overview) =>
      overview ? overview.races : readPlanRaces(context),
    ),
    overviewRead.then((overview) =>
      loadWatchView(context, overview?.plan ?? null),
    ),
    latestRead.then((latest) => loadPairChecks(context, latest?.id ?? null)),
    latestRead.then((latest) =>
      latest
        ? loadSessionDebrief(context, { activityId: latest.id }).catch(
            () => null,
          )
        : null,
    ),
    readConditionReports(context, null).catch(() => []),
    Promise.all([overviewRead, latestRead]).then(([overview, latest]) =>
      loadLatestGroup(context, overview?.matches ?? [], latest),
    ),
  ]);
  const today = overview?.today ?? localToday(now);
  const plan = overview?.plan.state ?? null;
  reconcileGearNotificationsAfterResponse(context, checks);
  const latestCheck = latest ? checks?.checks.get(latest.id) : null;
  return {
    view: buildToday({
      today,
      plan,
      program: overview ? buildProgram(programInput(overview, paces)) : null,
      races,
      matches: overview?.matches ?? [],
      panel,
      recovery,
      latest,
      latestGroup,
      debrief,
      pairQuestion:
        latestCheck && checks ? pairQuestion(latestCheck, checks.shoes) : null,
      pain: conditions.some(
        (condition) =>
          condition.kind === "pain" && condition.status === "active",
      ),
    }),
  };
}
