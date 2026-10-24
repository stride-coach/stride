import "server-only";
import { cache } from "react";
import { readRunningMaximum } from "@/server/heart-rate/maximum";
import {
  activityColumns,
  activityNamePattern,
  activityNameRegex,
  activityRowSchema,
  activityTypesByFilter,
  shiftDate,
  typedActivityFilters,
  type Activity,
  type ActivityFilter,
} from "@/features/activities/activities";
import {
  activityDetailColumns,
  activityDetailRowSchema,
  segmentColumns,
  segmentRowSchema,
} from "@/features/activities/detail";
import { parseTrack, trackColumns } from "@/features/activities/track";
import {
  calculateHeartRateZones,
  type HeartRateZones,
} from "@/features/onboarding/heart-rate-zones";
import type { OnboardingContext } from "@/server/onboarding/context";

const knownTypes = typedActivityFilters.flatMap((group) => [
  ...activityTypesByFilter[group],
]);

type ActivityQuery<Query> = {
  in(column: string, values: string[]): Query;
  or(filters: string): Query;
  filter(column: string, operator: "imatch", value: string): Query;
  ilike(column: string, pattern: string): Query;
};

export function scopeActivities<Query extends ActivityQuery<Query>>(
  query: Query,
  filter: ActivityFilter,
  search: string,
): Query {
  let scoped = query;
  if (filter === "other")
    scoped = scoped.or(
      `activity_type.is.null,activity_type.not.in.(${knownTypes.join(",")})`,
    );
  else if (filter !== "all")
    scoped = scoped.in("activity_type", [...activityTypesByFilter[filter]]);
  if (search)
    scoped = search.includes("*")
      ? scoped.filter("activity_name", "imatch", activityNameRegex(search))
      : scoped.ilike("activity_name", activityNamePattern(search));
  return scoped;
}

export const listActivities = cache(async function listActivities(
  context: OnboardingContext,
  filter: ActivityFilter,
  limit: number,
  search = "",
): Promise<{ activities: Activity[]; total: number }> {
  const query = scopeActivities(
    context.client
      .from("provider_activities")
      .select(activityColumns, { count: "exact" })
      .eq("user_id", context.userId)
      .not("started_at", "is", null),
    filter,
    search,
  );
  const { data, error, count } = await query
    .order("started_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);
  if (error) throw new Error("Unable to read activities");
  const activities = (data ?? []).map((row) => activityRowSchema.parse(row));
  return { activities, total: Math.max(count ?? 0, activities.length) };
});

export const countActivities = cache(async function countActivities(
  context: OnboardingContext,
  search = "",
): Promise<Record<ActivityFilter, number>> {
  const count = async (filter: ActivityFilter) => {
    const { count, error } = await scopeActivities(
      context.client
        .from("provider_activities")
        .select("id", { count: "exact", head: true })
        .eq("user_id", context.userId)
        .not("started_at", "is", null),
      filter,
      search,
    );
    if (error) throw new Error("Unable to count activities");
    return count ?? 0;
  };
  const [all, ...groups] = await Promise.all(
    (["all", ...typedActivityFilters] as const).map(count),
  );
  const typed = Object.fromEntries(
    typedActivityFilters.map((filter, index) => [filter, groups[index]]),
  ) as Record<(typeof typedActivityFilters)[number], number>;
  return {
    all,
    ...typed,
    other: Math.max(0, all - groups.reduce((sum, value) => sum + value, 0)),
  };
});

export const readWeekActivities = cache(async function readWeekActivities(
  context: OnboardingContext,
  weekStart: string,
  filter: ActivityFilter = "all",
  search = "",
): Promise<Activity[]> {
  const weekEnd = shiftDate(weekStart, 6);
  const { data, error } = await scopeActivities(
    context.client
      .from("provider_activities")
      .select(activityColumns)
      .eq("user_id", context.userId)
      .gte("started_at", `${shiftDate(weekStart, -1)}T00:00:00Z`)
      .lte("started_at", `${shiftDate(weekEnd, 1)}T23:59:59Z`),
    filter,
    search,
  )
    .order("started_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Unable to read the week activities");
  return (data ?? [])
    .map((row) => activityRowSchema.parse(row))
    .filter(
      (activity) => activity.date >= weekStart && activity.date <= weekEnd,
    );
});

export const readActivity = cache(async function readActivity(
  context: OnboardingContext,
  id: string,
): Promise<Activity | null> {
  const { data, error } = await context.client
    .from("provider_activities")
    .select(activityColumns)
    .eq("user_id", context.userId)
    .eq("id", id)
    .not("started_at", "is", null)
    .maybeSingle();
  if (error) throw new Error("Unable to read activity");
  return data ? activityRowSchema.parse(data) : null;
});

export const readActivityDetail = cache(async function readActivityDetail(
  context: OnboardingContext,
  id: string,
) {
  const [activity, segments, track] = await Promise.all([
    context.client
      .from("provider_activities")
      .select(activityDetailColumns)
      .eq("user_id", context.userId)
      .eq("id", id)
      .not("started_at", "is", null)
      .maybeSingle(),
    context.client
      .from("provider_activity_segments")
      .select(segmentColumns)
      .eq("user_id", context.userId)
      .eq("activity_id", id)
      .order("segment_type", { ascending: true })
      .order("segment_index", { ascending: true }),
    context.client
      .from("provider_activity_tracks")
      .select(trackColumns)
      .eq("user_id", context.userId)
      .eq("activity_id", id)
      .maybeSingle(),
  ]);
  if (activity.error || segments.error)
    throw new Error("Unable to read activity detail");
  if (!activity.data) return null;
  return {
    activity: activityDetailRowSchema.parse(activity.data),
    segments: (segments.data ?? []).map((row) => segmentRowSchema.parse(row)),
    track: track.error || !track.data ? null : parseTrack(track.data),
  };
});

const dayMs = 86_400_000;

export const loadHeartRateZones = cache(async function loadHeartRateZones(
  context: OnboardingContext,
  now: Date,
): Promise<HeartRateZones | null> {
  const month = new Date(now.getTime() - 28 * dayMs).toISOString().slice(0, 10);
  const [maximum, resting] = await Promise.all([
    readRunningMaximum(context, now),
    context.client
      .from("provider_observations")
      .select("metric, observed_on, value_numeric")
      .eq("user_id", context.userId)
      .eq("availability", "available")
      .eq("metric", "resting_heart_rate_bpm")
      .gte("observed_on", month)
      .limit(100),
  ]);
  if (resting.error) return null;
  return calculateHeartRateZones({
    maximum: maximum.value,
    observations: (resting.data ?? []).flatMap((row) =>
      row.metric && row.observed_on && row.value_numeric !== null
        ? [
            {
              metric: row.metric,
              observedOn: row.observed_on,
              value: Number(row.value_numeric),
            },
          ]
        : [],
    ),
    today: now,
  });
});
