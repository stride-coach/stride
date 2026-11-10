import "server-only";
import { cache } from "react";
import { z } from "zod";
import { sessionVerdict, type Verdict } from "@/features/plans/debrief/debrief";
import { isRunningSession } from "@/features/plans/model/volume";
import {
  isDebriefMatch,
  sessionLapInput,
  type SessionRead,
} from "@/server/plans/debrief";
import { loadIntensityPaceRanges } from "@/server/plans/paces";
import { sessionActivityIds } from "@/server/plans/session-activities";
import {
  activityWeekStart,
  groupActivities,
  positiveMeasure,
  planWeekLine,
  shiftDate,
  weekSubline,
  weekTotalItems,
  weekTotals,
  type ActivityFilter,
  type ActivityListView,
  type ActivityWeekSummary,
} from "@/features/activities/activities";
import {
  activityPlanCell,
  feelingPill,
  isPlannedMatch,
  needsFeeling,
  plannedPill,
  plannedMatchStatuses,
  unplannedPill,
  withinPlan,
  type ActivityPill,
  type ActivityPlanCell,
} from "@/features/activities/plan-status";
import type { OnboardingContext } from "@/server/onboarding/context";
import type { PlanOverview } from "@/server/plans/overview";
import { loadPlanOverview } from "@/server/plans/overview";
import {
  countActivities,
  listActivities,
  readWeekActivities,
} from "./activities";
import { readActivityFeelings } from "./feelings";

function plannedActivityIds(overview: PlanOverview | null) {
  return new Map(
    (overview?.matches ?? [])
      .filter((match) => isPlannedMatch(match))
      .map((match) => [match.activityId!, match]),
  );
}

function planWeek(overview: PlanOverview | null, weekStart: string) {
  if (!overview) return null;
  const weekEnd = shiftDate(weekStart, 6);
  const sessions = overview.plan.state.sessions.filter(
    (session) =>
      session.scheduledOn >= weekStart &&
      session.scheduledOn <= weekEnd &&
      session.sport !== "rest" &&
      session.kind !== "rest",
  );
  if (sessions.length === 0) return null;
  const done = new Set(
    overview.matches
      .filter((match) => plannedMatchStatuses.includes(match.status))
      .map((match) => match.sessionKey),
  );
  return {
    planned: sessions.length,
    done: sessions.filter((session) => done.has(session.sessionKey)).length,
  };
}

const verdictActivitySchema = z.object({
  id: z.string(),
  started_at: z.string(),
  distance_meters: positiveMeasure,
  duration_seconds: positiveMeasure,
  average_heart_rate: positiveMeasure,
});

const verdictLapSchema = z.object({
  activity_id: z.string(),
  segment_type: z.string(),
  segment_index: z.number(),
  distance_meters: positiveMeasure,
  duration_seconds: positiveMeasure,
  average_heart_rate: positiveMeasure,
});

async function readSessionVerdicts(
  context: OnboardingContext,
  overview: PlanOverview | null,
  activityIds: string[],
): Promise<Map<string, Verdict | null>> {
  const verdicts = new Map<string, Verdict | null>();
  if (!overview) return verdicts;
  const sessions = new Map(
    overview.plan.state.sessions.map((session) => [
      session.sessionKey,
      session,
    ]),
  );
  const targets = activityIds.flatMap((id) => {
    const match = overview.matches.find(
      (item) => item.activityId === id && isDebriefMatch(item),
    );
    const session = match ? sessions.get(match.sessionKey) : undefined;
    return match && session && isRunningSession(session)
      ? [{ id, match, session }]
      : [];
  });
  if (targets.length === 0) return verdicts;
  const ids = [
    ...new Set(
      targets.flatMap((target) =>
        sessionActivityIds(overview.matches, target.session.sessionKey),
      ),
    ),
  ];
  const [activities, laps, paceRanges] = await Promise.all([
    context.client
      .from("provider_activities")
      .select(
        "id, started_at, distance_meters, duration_seconds, average_heart_rate",
      )
      .eq("user_id", context.userId)
      .in("id", ids),
    context.client
      .from("provider_activity_segments")
      .select(
        "activity_id, segment_type, segment_index, distance_meters, duration_seconds, average_heart_rate",
      )
      .eq("user_id", context.userId)
      .eq("segment_type", "lap")
      .in("activity_id", ids),
    loadIntensityPaceRanges(context),
  ]);
  if (activities.error || laps.error) return verdicts;
  const rows = (laps.data ?? []).flatMap((row) => {
    const parsed = verdictLapSchema.safeParse(row);
    return parsed.success && parsed.data.segment_type === "lap"
      ? [parsed.data]
      : [];
  });
  const reads = new Map<string, SessionRead>();
  for (const row of activities.data ?? []) {
    const parsed = verdictActivitySchema.safeParse(row);
    if (!parsed.success) continue;
    const activity = parsed.data;
    reads.set(activity.id, {
      activity: {
        id: activity.id,
        startedAt: activity.started_at,
        distanceMeters: activity.distance_meters,
        durationSeconds: activity.duration_seconds,
        averageHeartRate: activity.average_heart_rate,
      },
      segments: rows
        .filter((lap) => lap.activity_id === activity.id)
        .map((lap) => ({
          type: "lap" as const,
          index: lap.segment_index,
          distanceMeters: lap.distance_meters,
          durationSeconds: lap.duration_seconds,
          averageHeartRate: lap.average_heart_rate,
        })),
    });
  }
  for (const { id, match, session } of targets) {
    const sessionReads = sessionActivityIds(
      overview.matches,
      session.sessionKey,
    ).flatMap((activityId) => {
      const read = reads.get(activityId);
      return read ? [read] : [];
    });
    if (sessionReads.length === 0) continue;
    verdicts.set(
      id,
      sessionVerdict({
        session,
        match,
        paceRanges,
        ...sessionLapInput(sessionReads),
      }),
    );
  }
  return verdicts;
}

export const loadActivityList = cache(async function loadActivityList(
  context: OnboardingContext,
  filter: ActivityFilter,
  limit: number,
  search: string,
  today: string,
): Promise<ActivityListView> {
  const counts = countActivities(context, search).catch(() => null);
  const plan = loadPlanOverview(context).catch(() => null);
  const { activities, total } = await listActivities(
    context,
    filter,
    limit,
    search,
  );
  const groups = groupActivities(activities, today);
  const oldest = groups.at(-1);
  const truncated = oldest !== undefined && total > activities.length;
  const recent = activities.filter((activity) =>
    needsFeeling({
      date: activity.date,
      today,
      garmin: activity.garminFeeling,
      athlete: false,
    }),
  );
  const [overview, partial, feelings] = await Promise.all([
    plan,
    truncated
      ? readWeekActivities(context, oldest.weekStart, filter, search).catch(
          () => null,
        )
      : null,
    readActivityFeelings(
      context,
      recent.map((activity) => activity.id),
    ),
  ]);
  const planned = plannedActivityIds(overview);
  const verdicts = await readSessionVerdicts(
    context,
    overview,
    activities
      .filter((activity) => planned.has(activity.id))
      .map((activity) => activity.id),
  ).catch(() => new Map<string, Verdict | null>());
  const sessions = new Map(
    (overview?.plan.state.sessions ?? []).map((session) => [
      session.sessionKey,
      session,
    ]),
  );
  const awaiting = recent.filter((activity) => !planned.has(activity.id));
  const pills: Record<string, ActivityPill[]> = {};
  const plans: Record<string, ActivityPlanCell> = {};
  for (const activity of activities) {
    const match = planned.get(activity.id);
    const session = match ? sessions.get(match.sessionKey) : undefined;
    const list: ActivityPill[] = [];
    if (match && session) plans[activity.id] = activityPlanCell(session, match);
    if (match && session)
      list.push(
        plannedPill({
          session,
          match,
          verdict: verdicts.get(activity.id) ?? null,
          averageHeartRate: activity.averageHeartRate,
        }),
      );
    else {
      if (withinPlan(overview?.plan.state.plan, activity.date))
        list.push(unplannedPill);
      if (awaiting.includes(activity) && !feelings.has(activity.id))
        list.push(feelingPill);
    }
    if (list.length > 0) pills[activity.id] = list;
  }
  const weeks: Record<string, ActivityWeekSummary> = {};
  for (const group of groups) {
    const members =
      truncated && group === oldest && partial ? partial : group.activities;
    const unplanned = members.filter(
      (activity) =>
        !planned.has(activity.id) &&
        withinPlan(overview?.plan.state.plan, activity.date) &&
        activityWeekStart(activity.date) === group.weekStart,
    ).length;
    const totals = weekTotals(members);
    weeks[group.weekStart] = {
      totals: weekTotalItems(totals),
      subline: weekSubline({
        weekStart: group.weekStart,
        today,
        count: totals.count,
        plan: planWeekLine(planWeek(overview, group.weekStart), unplanned),
      }),
    };
  }
  return {
    activities,
    total,
    counts: await counts,
    weeks,
    pills,
    plans,
  };
});
