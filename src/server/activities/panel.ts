import "server-only";
import { cache } from "react";
import { z } from "zod";
import {
  activityGroupOf,
  activityKind,
  activityTypesByFilter,
  activityWeekStart,
  positiveMeasure,
  shiftDate,
} from "@/features/activities/activities";
import { buildActivityView } from "@/features/activities/activity-view";
import {
  buildComparison,
  fastLapPace,
  selectSimilar,
  type CompareActivity,
  type CompareScope,
} from "@/features/activities/compare";
import type { ActivitySegment } from "@/features/activities/detail";
import {
  activityCoachHref,
  weekLoadSentence,
  type ActivityPanelView,
  type PlanCardView,
} from "@/features/activities/panel";
import {
  isPlannedMatch,
  plannedPill,
  sessionProgramme,
  withinPlan,
} from "@/features/activities/plan-status";
import { localToday } from "@/features/app-shell/shell";
import { normalizeFeeling } from "@/features/plans/debrief/debrief";
import {
  isRunningSession,
  sessionDistance,
} from "@/features/plans/model/volume";
import { sessionPanelHref } from "@/features/plans/view/session-href";
import { sessionFamilyOf } from "@/features/plans/view/program";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadSessionDebrief } from "@/server/plans/debrief";
import { loadPlanOverview, type PlanOverview } from "@/server/plans/overview";
import {
  loadHeartRateZones,
  readActivityDetail,
  readWeekActivities,
} from "./activities";
import { readActivityFeeling } from "./feelings";

const similarColumns =
  "id, started_at, local_started_at, distance_meters, duration_seconds, average_heart_rate";

const similarRowSchema = z
  .object({
    id: z.string(),
    started_at: z.string(),
    local_started_at: z.string().nullable(),
    distance_meters: positiveMeasure,
    duration_seconds: positiveMeasure,
    average_heart_rate: positiveMeasure,
  })
  .transform((row): CompareActivity => ({
    id: row.id,
    date: (row.local_started_at ?? row.started_at).slice(0, 10),
    startedAt: row.started_at,
    distanceMeters: row.distance_meters,
    durationSeconds: row.duration_seconds,
    averageHeartRate: row.average_heart_rate,
    repPace: null,
  }));

const lapRowSchema = z.object({
  activity_id: z.string(),
  segment_type: z.string(),
  segment_index: z.number(),
  distance_meters: positiveMeasure,
  duration_seconds: positiveMeasure,
});

function overallPace(activity: {
  distanceMeters: number | null;
  durationSeconds: number | null;
}) {
  return activity.distanceMeters && activity.durationSeconds
    ? activity.durationSeconds / (activity.distanceMeters / 1000)
    : null;
}

function repPaceOf(
  segments: Pick<
    ActivitySegment,
    "type" | "index" | "durationSeconds" | "distanceMeters"
  >[],
  pace: number | null,
) {
  return fastLapPace(
    segments
      .filter((segment) => segment.type === "lap")
      .sort((first, second) => first.index - second.index),
    pace,
  );
}

async function loadSimilar(
  context: OnboardingContext,
  current: CompareActivity,
  scope: CompareScope,
  overview: PlanOverview | null,
): Promise<CompareActivity[]> {
  let query = context.client
    .from("provider_activities")
    .select(similarColumns)
    .eq("user_id", context.userId)
    .lte("started_at", current.startedAt)
    .not("average_heart_rate", "is", null);
  if (scope.kind === "planned") {
    const sessions = new Map(
      (overview?.plan.state.sessions ?? []).map((session) => [
        session.sessionKey,
        session,
      ]),
    );
    const ids = [
      ...new Set(
        (overview?.matches ?? [])
          .filter((match) => {
            const session = sessions.get(match.sessionKey);
            return (
              isPlannedMatch(match) &&
              match.activityId !== current.id &&
              session !== undefined &&
              sessionFamilyOf(session) === scope.family
            );
          })
          .map((match) => match.activityId!),
      ),
    ];
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  } else {
    if (scope.group === "other" || current.distanceMeters === null) return [];
    query = query
      .in("activity_type", [...activityTypesByFilter[scope.group]])
      .gte("distance_meters", Math.floor(current.distanceMeters * 0.75))
      .lte("distance_meters", Math.ceil(current.distanceMeters * 1.25));
  }
  const { data, error } = await query
    .order("started_at", { ascending: false })
    .limit(12);
  if (error) return [];
  const picked = selectSimilar(
    current,
    (data ?? []).flatMap((row) => {
      const parsed = similarRowSchema.safeParse(row);
      return parsed.success ? [parsed.data] : [];
    }),
    scope,
  );
  if (
    scope.kind !== "planned" ||
    current.repPace === null ||
    picked.length === 0
  )
    return picked;
  const laps = await context.client
    .from("provider_activity_segments")
    .select(
      "activity_id, segment_type, segment_index, distance_meters, duration_seconds",
    )
    .eq("user_id", context.userId)
    .in(
      "activity_id",
      picked.map((item) => item.id),
    );
  if (laps.error) return picked;
  const rows = (laps.data ?? []).flatMap((row) => {
    const parsed = lapRowSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
  return picked.map((item) => ({
    ...item,
    repPace: repPaceOf(
      rows
        .filter((row) => row.activity_id === item.id)
        .map((row) => ({
          type: row.segment_type === "lap" ? "lap" : "split",
          index: row.segment_index,
          durationSeconds: row.duration_seconds,
          distanceMeters: row.distance_meters,
        })),
      overallPace(item),
    ),
  }));
}

export const loadActivityPanel = cache(async function loadActivityPanel(
  context: OnboardingContext,
  id: string,
  now: Date,
): Promise<ActivityPanelView | null> {
  const today = localToday(now);
  const [detail, calibration, overview, athlete] = await Promise.all([
    readActivityDetail(context, id),
    loadHeartRateZones(context, now),
    loadPlanOverview(context).catch(() => null),
    readActivityFeeling(context, id).catch(() => null),
  ]);
  if (!detail) return null;
  const { activity, segments } = detail;
  const match = overview?.matches.find(
    (item) => item.activityId === id && isPlannedMatch(item),
  );
  const session = match
    ? overview?.plan.state.sessions.find(
        (item) => item.sessionKey === match.sessionKey,
      )
    : undefined;
  const running = activityKind(activity.type) !== "other";
  const strength = activityGroupOf(activity.type) === "strength";
  const current: CompareActivity = {
    id: activity.id,
    date: activity.date,
    startedAt: activity.startedAt,
    distanceMeters: activity.distanceMeters,
    durationSeconds: activity.durationSeconds,
    averageHeartRate: activity.averageHeartRate,
    repPace: repPaceOf(segments, overallPace(activity)),
  };
  const comparable =
    current.distanceMeters !== null &&
    current.durationSeconds !== null &&
    current.averageHeartRate !== null;
  const scope: CompareScope | null =
    !running || !comparable
      ? null
      : match && session
        ? { kind: "planned", family: sessionFamilyOf(session) }
        : { kind: "unplanned", group: activityGroupOf(activity.type) };
  const weekStart = activityWeekStart(activity.date);
  const [debrief, similar, week] = await Promise.all([
    match && session && isRunningSession(session)
      ? loadSessionDebrief(context, { activityId: id }).catch(() => null)
      : null,
    scope ? loadSimilar(context, current, scope, overview).catch(() => []) : [],
    !match && running && withinPlan(overview?.plan.state.plan, activity.date)
      ? readWeekActivities(context, weekStart).catch(() => null)
      : null,
  ]);
  const comparison = scope
    ? buildComparison({
        current,
        similar,
        scope,
        resting: calibration?.resting ?? null,
        today,
      })
    : null;
  const ownFeeling = normalizeFeeling(
    { rpe: activity.perceivedEffort, feel: activity.feel },
    athlete,
  );
  let card: PlanCardView;
  if (match && session) {
    card = {
      kind: "planned",
      strength,
      sessionTitle: session.title,
      programme: strength ? sessionProgramme(session.structure) : null,
      pill: plannedPill({
        session,
        match,
        verdict: debrief?.verdict ?? null,
        averageHeartRate: activity.averageHeartRate,
      }),
      body: debrief?.verdict.body ?? null,
      planHref: debrief?.planHref ?? sessionPanelHref(session.sessionKey),
      coachHref:
        debrief?.coachHref ??
        `/coach/new?session=${encodeURIComponent(session.sessionKey)}`,
      feelingActivityId: debrief?.activityId ?? activity.id,
      feeling: debrief
        ? debrief.feeling
          ? {
              source: debrief.feeling.source,
              effort: debrief.feeling.value.effort,
              feel: debrief.feeling.value.feel,
            }
          : null
        : ownFeeling,
      comparison,
    };
  } else {
    const weekEnd = shiftDate(weekStart, 6);
    const distances = (overview?.plan.state.sessions ?? [])
      .filter(
        (item) =>
          isRunningSession(item) &&
          item.scheduledOn >= weekStart &&
          item.scheduledOn <= weekEnd,
      )
      .map((item) => sessionDistance(item)?.meters ?? null);
    const planned = distances.some((meters) => meters === null)
      ? null
      : distances.reduce<number>((sum, meters) => sum + meters!, 0);
    card = {
      kind: "unplanned",
      strength,
      inPlan: withinPlan(overview?.plan.state.plan, activity.date),
      load: week
        ? weekLoadSentence({
            date: activity.date,
            today,
            actualMeters: week
              .filter((item) => activityKind(item.type) !== "other")
              .reduce((sum, item) => sum + (item.distanceMeters ?? 0), 0),
            plannedMeters: planned,
          })
        : null,
      coachHref: activityCoachHref(activity.id),
      feelingActivityId: activity.id,
      feeling: ownFeeling,
      comparison,
    };
  }
  return {
    activity,
    segments,
    view: buildActivityView({ ...detail, zones: calibration?.zones ?? null }),
    zoneMethod: calibration?.method ?? null,
    card,
  };
});
