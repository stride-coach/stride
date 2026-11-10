import { z } from "zod";
import type { ActivityPill, ActivityPlanCell } from "./plan-status";

export const activityFilters = [
  "all",
  "road",
  "trail",
  "strength",
  "cycling",
  "other",
] as const;
export type ActivityFilter = (typeof activityFilters)[number];
export type ActivityGroupKey = Exclude<ActivityFilter, "all">;
export type ActivityKind = "road" | "trail" | "other";

export const activityFilterLabels: Record<ActivityFilter, string> = {
  all: "Tout",
  road: "Course",
  trail: "Trail",
  strength: "Renfo",
  cycling: "Vélo",
  other: "Autres",
};
export const activityTypesByFilter: Record<
  Exclude<ActivityGroupKey, "other">,
  readonly string[]
> = {
  road: ["running", "treadmill_running", "track_running"],
  trail: ["trail_running", "ultra_run"],
  strength: ["strength_training", "indoor_cardio", "hiit", "yoga", "pilates"],
  cycling: [
    "cycling",
    "road_biking",
    "mountain_biking",
    "gravel_cycling",
    "indoor_cycling",
    "virtual_ride",
  ],
};
export const typedActivityFilters = [
  "road",
  "trail",
  "strength",
  "cycling",
] as const;
const typeLabels: Record<string, string> = {
  running: "Course à pied",
  treadmill_running: "Course sur tapis",
  track_running: "Piste",
  trail_running: "Trail",
  ultra_run: "Ultra-trail",
  strength_training: "Renforcement",
  indoor_cardio: "Cardio",
  cycling: "Vélo",
  road_biking: "Vélo de route",
  mountain_biking: "VTT",
  indoor_cycling: "Vélo d’intérieur",
  hiking: "Randonnée",
  walking: "Marche",
  lap_swimming: "Natation",
  open_water_swimming: "Nage en eau libre",
  yoga: "Yoga",
};

export const activityColumns =
  "id, activity_type, activity_name, route_name, started_at, local_started_at, distance_meters, duration_seconds, elevation_gain_meters, average_heart_rate, workout_rpe, workout_feel";

export const positiveMeasure = z
  .union([z.number(), z.string()])
  .nullable()
  .transform((value) => {
    const parsed = value === null ? NaN : Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  });

export const activityRowSchema = z
  .object({
    id: z.string(),
    activity_type: z.string().nullable(),
    activity_name: z.string().nullable().optional(),
    route_name: z.string().nullable(),
    started_at: z.string(),
    local_started_at: z.string().nullable(),
    distance_meters: positiveMeasure,
    duration_seconds: positiveMeasure,
    elevation_gain_meters: positiveMeasure,
    average_heart_rate: positiveMeasure,
    workout_rpe: positiveMeasure.optional().default(null),
    workout_feel: z
      .union([z.number(), z.string()])
      .nullable()
      .optional()
      .transform((value) => {
        if (value === null || value === undefined || value === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
          ? parsed
          : null;
      }),
  })
  .transform((row) => ({
    id: row.id,
    type: row.activity_type,
    name: row.activity_name?.trim() || null,
    routeName: row.route_name?.trim() || null,
    date: (row.local_started_at ?? row.started_at).slice(0, 10),
    distanceMeters: row.distance_meters,
    durationSeconds: row.duration_seconds,
    elevationGainMeters: row.elevation_gain_meters,
    averageHeartRate: row.average_heart_rate,
    garminFeeling: { rpe: row.workout_rpe, feel: row.workout_feel },
  }));

export type Activity = z.output<typeof activityRowSchema>;
export type ActivityMeasures = Pick<
  Activity,
  | "type"
  | "distanceMeters"
  | "durationSeconds"
  | "elevationGainMeters"
  | "averageHeartRate"
>;
export type ActivityMetricKey =
  "distance" | "duration" | "pace" | "elevation" | "heartRate";
export type ActivityMetric = {
  key: ActivityMetricKey;
  label: string;
  value: string;
  unit?: string;
};
export type ActivityGroup = {
  weekStart: string;
  label: string;
  activities: Activity[];
};

const metricLabels: Record<ActivityMetricKey, string> = {
  distance: "Distance",
  duration: "Temps",
  pace: "Allure",
  elevation: "D+",
  heartRate: "FC moy.",
};
const detailMetricOrder: ActivityMetricKey[] = [
  "distance",
  "duration",
  "pace",
  "elevation",
  "heartRate",
];
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const shortDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const shortDayYear = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const dayMs = 86_400_000;

export function parseActivityFilter(value: unknown): ActivityFilter {
  return activityFilters.find((filter) => filter === value) ?? "all";
}

export function activityGroupOf(type: string | null): ActivityGroupKey {
  for (const group of typedActivityFilters)
    if (type && activityTypesByFilter[group].includes(type)) return group;
  return "other";
}

export function matchesActivityFilter(
  type: string | null,
  filter: ActivityFilter,
) {
  return filter === "all" || activityGroupOf(type) === filter;
}

export function activityKind(type: string | null): ActivityKind {
  if (type && activityTypesByFilter.road.includes(type)) return "road";
  if (type && activityTypesByFilter.trail.includes(type)) return "trail";
  return "other";
}

export function activityTitle(
  activity: Pick<Activity, "name" | "type" | "routeName">,
) {
  if (activity.name) return activity.name;
  const label = (activity.type && typeLabels[activity.type]) || "Activité";
  return activity.routeName ? `${label} · ${activity.routeName}` : label;
}

export function formatDistance(meters: number) {
  const kilometers = meters / 1000;
  const digits = kilometers < 10 ? 2 : 1;
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(kilometers);
}

export function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const rest = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

export function formatPace(meters: number, seconds: number) {
  const perKilometer = Math.round(seconds / (meters / 1000));
  return `${Math.floor(perKilometer / 60)}:${String(perKilometer % 60).padStart(2, "0")}`;
}

function metric(
  activity: ActivityMeasures,
  key: ActivityMetricKey,
): ActivityMetric | null {
  const label = metricLabels[key];
  const {
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    averageHeartRate,
  } = activity;
  switch (key) {
    case "distance":
      return distanceMeters
        ? { key, label, value: formatDistance(distanceMeters), unit: "km" }
        : null;
    case "duration":
      return durationSeconds
        ? { key, label, value: formatDuration(durationSeconds) }
        : null;
    case "pace":
      return distanceMeters &&
        distanceMeters >= 100 &&
        durationSeconds &&
        activityKind(activity.type) !== "other"
        ? {
            key,
            label,
            value: formatPace(distanceMeters, durationSeconds),
            unit: "/km",
          }
        : null;
    case "elevation":
      return elevationGainMeters
        ? { key, label, value: integer.format(elevationGainMeters), unit: "m" }
        : null;
    case "heartRate":
      return averageHeartRate
        ? { key, label, value: integer.format(averageHeartRate), unit: "bpm" }
        : null;
  }
}

function present(keys: ActivityMetricKey[], activity: ActivityMeasures) {
  return keys
    .map((key) => metric(activity, key))
    .filter((item): item is ActivityMetric => item !== null);
}

export function detailMetrics(activity: ActivityMeasures) {
  return present(detailMetricOrder, activity);
}

function dayNumber(date: string) {
  return Date.parse(`${date}T00:00:00Z`) / dayMs;
}

function isoOf(day: number) {
  return new Date(day * dayMs).toISOString().slice(0, 10);
}

export function activityWeekStart(date: string) {
  const day = dayNumber(date);
  return isoOf(day - ((new Date(day * dayMs).getUTCDay() + 6) % 7));
}

export function shiftDate(date: string, days: number) {
  return isoOf(dayNumber(date) + days);
}

export function formatActivityDate(date: string, today: string) {
  const value = new Date(`${date}T00:00:00Z`);
  return (
    date.slice(0, 4) === today.slice(0, 4) ? shortDay : shortDayYear
  ).format(value);
}

export function formatWeekSpan(weekStart: string, today: string) {
  const end = shiftDate(weekStart, 6);
  const first = new Date(`${weekStart}T00:00:00Z`);
  const last = new Date(`${end}T00:00:00Z`);
  const range =
    first.getUTCMonth() === last.getUTCMonth()
      ? `${first.getUTCDate()}–${dayMonth.format(last)}`
      : `${dayMonth.format(first)}–${dayMonth.format(last)}`;
  return end.slice(0, 4) === today.slice(0, 4)
    ? range
    : `${range} ${end.slice(0, 4)}`;
}

export function activityWeekLabel(weekStart: string, today: string) {
  const weeks = Math.round(
    (dayNumber(activityWeekStart(today)) - dayNumber(weekStart)) / 7,
  );
  if (weeks <= 0) return "Cette semaine";
  if (weeks === 1) return "Semaine dernière";
  return formatWeekSpan(weekStart, today);
}

export function groupActivities(activities: Activity[], today: string) {
  const groups: ActivityGroup[] = [];
  for (const activity of activities) {
    const weekStart = activityWeekStart(activity.date);
    const last = groups.at(-1);
    if (last?.weekStart === weekStart) last.activities.push(activity);
    else
      groups.push({
        weekStart,
        label: activityWeekLabel(weekStart, today),
        activities: [activity],
      });
  }
  return groups;
}

export type WeekTotals = {
  count: number;
  distanceMeters: number;
  elevationGainMeters: number;
  durationSeconds: number;
};

export function weekTotals(
  activities: readonly Pick<
    Activity,
    "distanceMeters" | "elevationGainMeters" | "durationSeconds"
  >[],
): WeekTotals {
  return activities.reduce<WeekTotals>(
    (totals, activity) => ({
      count: totals.count + 1,
      distanceMeters: totals.distanceMeters + (activity.distanceMeters ?? 0),
      elevationGainMeters:
        totals.elevationGainMeters + (activity.elevationGainMeters ?? 0),
      durationSeconds: totals.durationSeconds + (activity.durationSeconds ?? 0),
    }),
    { count: 0, distanceMeters: 0, elevationGainMeters: 0, durationSeconds: 0 },
  );
}

export type WeekTotalItem = { key: string; value: string; unit?: string };

const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function formatHoursMinutes(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

export function weekTotalItems(totals: WeekTotals): WeekTotalItem[] {
  const items: (WeekTotalItem | null)[] = [
    totals.distanceMeters > 0
      ? {
          key: "distance",
          value: oneDecimal.format(totals.distanceMeters / 1000),
          unit: "km",
        }
      : null,
    totals.elevationGainMeters >= 1
      ? {
          key: "elevation",
          value: integer.format(totals.elevationGainMeters),
          unit: "m D+",
        }
      : null,
    totals.durationSeconds > 0
      ? { key: "duration", value: formatHoursMinutes(totals.durationSeconds) }
      : null,
  ];
  return items.filter((item): item is WeekTotalItem => item !== null);
}

export type ActivityWeekSummary = {
  totals: WeekTotalItem[];
  subline: string;
};

export type ActivityListView = {
  activities: Activity[];
  total: number;
  counts: Record<ActivityFilter, number> | null;
  weeks: Record<string, ActivityWeekSummary>;
  pills: Record<string, ActivityPill[]>;
  plans: Record<string, ActivityPlanCell>;
};

export type PlanWeekCounts = { planned: number; done: number };

export function planWeekLine(
  plan: PlanWeekCounts | null,
  unplanned: number,
): string | null {
  if (!plan || plan.planned === 0) return null;
  const sessions = plan.done >= 2 ? "séances" : "séance";
  return [
    `Plan : ${plan.done} ${sessions} sur ${plan.planned}`,
    unplanned > 0 ? `${unplanned} hors plan` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function weekSubline({
  weekStart,
  today,
  count,
  plan,
}: {
  weekStart: string;
  today: string;
  count: number;
  plan: string | null;
}) {
  const label = activityWeekLabel(weekStart, today);
  const range = formatWeekSpan(weekStart, today);
  return [
    label === range ? null : range,
    `${count} ${count > 1 ? "activités" : "activité"}`,
    plan,
  ]
    .filter(Boolean)
    .join(" · ");
}

export const activityPageSize = 50;
export const maxActivityWindow = 1000;

export function parseActivityLimit(value: unknown) {
  const requested =
    typeof value === "string" && /^\d{1,5}$/.test(value) ? Number(value) : 0;
  const pages = Math.max(1, Math.ceil(requested / activityPageSize));
  return Math.min(pages * activityPageSize, maxActivityWindow);
}

export const activitySearchMaxLength = 160;

export function parseActivitySearch(value: unknown) {
  const result = z
    .string()
    .trim()
    .max(activitySearchMaxLength)
    .safeParse(value);
  return result.success ? result.data : "";
}

export function activityNamePattern(search: string) {
  return `%${search.replace(/[\\%_]/g, "\\$&")}%`;
}

export function activityNameRegex(search: string) {
  return search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function activitiesQuery(
  filter: ActivityFilter,
  limit: number,
  search = "",
) {
  const params = new URLSearchParams();
  if (filter !== "all") params.set("filter", filter);
  if (limit > activityPageSize) params.set("limit", String(limit));
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `?${query}` : "";
}
