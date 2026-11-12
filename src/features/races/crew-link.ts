import { z } from "zod";
import { raceKinds } from "@/features/onboarding/goals";
import { crewPlan, type CrewPlan } from "./crew";
import {
  defaultPlan,
  defaultStartMinutes,
  formatRaceDate,
  type RacePlan,
} from "./race";
import { clockFromSql, formatClock } from "./format";
import { services, waypointKinds, type Waypoint } from "./waypoints";
import { courseModel, planModel, scenariosOf } from "./workspace";

const dayFormat = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function shifted(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

export function crewLinkPeriod(raceDate: string | null) {
  if (!raceDate) return null;
  return `actif du ${dayFormat.format(shifted(raceDate, -1))} au ${dayFormat.format(shifted(raceDate, 1))}`;
}

export function crewLinkPath(token: string) {
  return `/crew/${token}`;
}

export const crewLinkTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{32,64}$/);

const clock = z
  .string()
  .regex(/^\d{2}:\d{2}(:\d{2})?$/)
  .nullable();

export const crewSnapshotSchema = z.object({
  race: z.object({
    name: z.string(),
    race_date: z.iso.date().nullable(),
    race_kind: z.enum(raceKinds),
    distance_km: z.coerce.number().nullable(),
    elevation_gain_m: z.number().int().nullable(),
    target_duration_seconds: z.number().int().nullable(),
  }),
  plan: z
    .object({
      start_time: clock,
      ambitious_duration_seconds: z.number().int().nullable(),
      cautious_duration_seconds: z.number().int().nullable(),
      cutoff_duration_seconds: z.number().int().nullable(),
      walk_grade_percent: z.number().int(),
      walk_pace_seconds_per_km: z.number().int(),
      aid_stop_seconds: z.number().int(),
      water_stop_seconds: z.number().int(),
    })
    .nullable(),
  course: z
    .object({
      time_zone: z.string(),
      distance_m: z.coerce.number(),
      elevation_gain_m: z.number().int().nullable(),
      elevation_loss_m: z.number().int().nullable(),
      step_m: z.coerce.number(),
      points: z
        .array(z.tuple([z.number(), z.number(), z.number().nullable()]))
        .min(2),
    })
    .nullable(),
  waypoints: z.array(
    z.object({
      id: z.uuid(),
      kind: z.enum(waypointKinds),
      name: z.string(),
      distance_m: z.coerce.number(),
      cutoff_time: clock,
      services: z.array(z.enum(services)),
      stop_seconds: z.number().int().nullable(),
      crew_access: z.string().nullable(),
      crew_prepare: z.string().nullable(),
      crew_reason: z.string().nullable(),
    }),
  ),
  pace_factors: z.record(z.string(), z.number()).nullable(),
});

export type CrewSnapshot = z.output<typeof crewSnapshotSchema>;

export type CrewPage = {
  name: string;
  date: string | null;
  start: string;
  crew: CrewPlan;
};

function waypointOf(row: CrewSnapshot["waypoints"][number]): Waypoint {
  return {
    id: row.id,
    kind: row.kind,
    name: row.name,
    distanceM: row.distance_m,
    cutoffMinutes: clockFromSql(row.cutoff_time),
    services: row.services,
    watchLabel: null,
    alertDistanceM: 500,
    voiceNote: null,
    todo: null,
    nutritionNote: null,
    stopSeconds: row.stop_seconds,
    crewAccess: row.crew_access,
    crewPrepare: row.crew_prepare,
    crewReason: row.crew_reason,
    source: "athlete",
    needsReview: false,
    revision: 1,
  };
}

export function crewPage(snapshot: CrewSnapshot): CrewPage | null {
  const { race, course } = snapshot;
  if (!course || race.race_kind !== "trail") return null;
  const plan: RacePlan = snapshot.plan
    ? {
        ...defaultPlan,
        startMinutes: clockFromSql(snapshot.plan.start_time),
        ambitiousSeconds: snapshot.plan.ambitious_duration_seconds,
        cautiousSeconds: snapshot.plan.cautious_duration_seconds,
        cutoffSeconds: snapshot.plan.cutoff_duration_seconds,
        walkGradePercent: snapshot.plan.walk_grade_percent,
        walkPaceSecondsPerKm: snapshot.plan.walk_pace_seconds_per_km,
        aidStopSeconds: snapshot.plan.aid_stop_seconds,
        waterStopSeconds: snapshot.plan.water_stop_seconds,
      }
    : defaultPlan;
  const summary = {
    id: "crew",
    name: race.name,
    kind: race.race_kind,
    date: race.race_date,
    distanceKm: race.distance_km,
    elevationGainM: race.elevation_gain_m,
    priority: "A" as const,
    targetSeconds: race.target_duration_seconds,
    revision: 1,
  };
  const model = courseModel(
    {
      source: "gpx",
      fileName: null,
      sourceActivityId: null,
      timeZone: course.time_zone,
      distanceM: course.distance_m,
      elevationGainM: course.elevation_gain_m,
      elevationLossM: course.elevation_loss_m,
      stepM: course.step_m,
      points: course.points,
      importedAt: "",
    },
    snapshot.waypoints.map(waypointOf),
    plan,
    race.race_kind,
  );
  const scenarios = scenariosOf(summary, plan);
  const planned = (key: "target" | "ambitious" | "cautious") => {
    const scenario = scenarios.find((item) => item.key === key);
    return scenario
      ? planModel({
          model,
          race: summary,
          plan,
          scenario,
          timeZone: course.time_zone,
          paceFactors: snapshot.pace_factors ?? undefined,
        })
      : null;
  };
  const target = planned("target");
  if (!target) return null;
  return {
    name: race.name,
    date: race.race_date ? formatRaceDate(race.race_date) : null,
    start: formatClock(plan.startMinutes ?? defaultStartMinutes),
    crew: crewPlan({
      model,
      planned: target,
      ambitious: planned("ambitious"),
      cautious: planned("cautious"),
    }),
  };
}
