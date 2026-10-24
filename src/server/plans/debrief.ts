import "server-only";
import type { DebriefLap } from "@/features/plans/debrief/debrief";
import {
  buildDebriefView,
  type DebriefView,
} from "@/features/plans/debrief/view";
import type { ActivitySegment } from "@/features/activities/detail";
import {
  activityTotals,
  mergeLaps,
} from "@/features/plans/view/session-activities";
import type { OnboardingContext } from "@/server/onboarding/context";
import type { SessionMatch } from "./matches";
import { loadPlanOverview } from "./overview";
import { loadIntensityPaceRanges } from "./paces";
import { readSessionActivities } from "./session-activities";

export type DebriefTarget = { sessionKey: string } | { activityId: string };

export function debriefLaps(segments: ActivitySegment[]): DebriefLap[] {
  return segments
    .filter((segment) => segment.type === "lap")
    .map((segment) => ({
      index: segment.index,
      durationSeconds: segment.durationSeconds,
      distanceMeters: segment.distanceMeters,
      averageHeartRate: segment.averageHeartRate,
    }));
}

export function isDebriefMatch(
  match: SessionMatch | undefined,
): match is SessionMatch & { activityId: string } {
  return (
    !!match?.activityId &&
    (match.status === "completed" || match.status === "partial")
  );
}

export async function loadSessionDebrief(
  context: OnboardingContext,
  target: DebriefTarget,
): Promise<DebriefView | null> {
  const overview = await loadPlanOverview(context);
  if (!overview) return null;
  const match = overview.matches.find((item) =>
    "sessionKey" in target
      ? item.sessionKey === target.sessionKey && isDebriefMatch(item)
      : item.activityId === target.activityId,
  );
  if (!isDebriefMatch(match)) return null;
  const session = overview.plan.state.sessions.find(
    (item) => item.sessionKey === match.sessionKey,
  );
  if (!session) return null;
  const [{ reads, main, feeling }, paceRanges] = await Promise.all([
    readSessionActivities(context, overview.matches, match.sessionKey),
    loadIntensityPaceRanges(context),
  ]);
  if (!main) return null;
  const activities = reads.map((read) => read.activity);
  return buildDebriefView({
    session,
    activityId: main.id,
    activityIds: activities.map((activity) => activity.id),
    laps: mergeLaps(reads.map((read) => debriefLaps(read.segments))),
    paceRanges,
    match,
    garmin: {
      rpe: main.perceivedEffort,
      feel: main.feel,
    },
    athlete: feeling,
    averageHeartRate: activityTotals(activities).averageHeartRate,
  });
}
