import { buildCourse, type RawPoint } from "@/features/races/course";
import {
  defaultPlan,
  type RaceSummary,
  type StoredCourse,
} from "@/features/races/race";
import { raceAllocation } from "@/features/races/race-nutrition";
import { raceTimeline, timelineFueling } from "@/features/races/timeline";
import type { Waypoint } from "@/features/races/waypoints";
import { courseModel, planModel } from "@/features/races/workspace";

const metersPerDegree = 111_195;
export const ids = {
  start: "00000000-0000-4000-8000-000000000001",
  aid: "00000000-0000-4000-8000-000000000002",
  water: "00000000-0000-4000-8000-000000000003",
  finish: "00000000-0000-4000-8000-000000000004",
};

function rolling(lengthM: number): RawPoint[] {
  return Array.from({ length: lengthM / 10 + 1 }, (_, index) => ({
    lat: 48.8 + (index * 10) / metersPerDegree,
    lon: 2.3,
    ele: 100 + 60 * Math.sin((index * 10) / 900),
  }));
}

function waypoint(
  id: string,
  kind: Waypoint["kind"],
  distanceM: number,
  extra: Partial<Waypoint> = {},
): Waypoint {
  return {
    id,
    kind,
    name: kind === "aid" ? "Ravito 1 · Trappes" : id,
    distanceM,
    cutoffMinutes: null,
    services: [],
    watchLabel: null,
    alertDistanceM: 500,
    voiceNote: null,
    todo: null,
    nutritionNote: null,
    stopSeconds: null,
    crewAccess: null,
    crewPrepare: null,
    crewReason: null,
    source: "athlete",
    needsReview: false,
    revision: 1,
    ...extra,
  };
}

export const course = buildCourse(rolling(40_000))!;
export const stored: StoredCourse = {
  ...course,
  source: "gpx",
  fileName: "trail.gpx",
  sourceActivityId: null,
  timeZone: "Europe/Paris",
  importedAt: "2026-10-11T00:00:00Z",
};
export const waypoints = [
  waypoint(ids.start, "start", 0),
  waypoint(ids.aid, "aid", 15_000, {
    cutoffMinutes: 11 * 60,
    todo: "Recharge la frontale",
  }),
  waypoint(ids.water, "water", 25_000),
  waypoint(ids.finish, "finish", course.distanceM),
];
export const race: RaceSummary = {
  id: "race",
  name: "Trail",
  kind: "trail",
  date: "2027-03-20",
  distanceKm: 40,
  elevationGainM: null,
  priority: "A",
  targetSeconds: 5 * 3600,
  revision: 1,
};
export const plan = {
  ...defaultPlan,
  startMinutes: 6 * 60,
  walkGradePercent: 5,
};
export const model = courseModel(stored, waypoints, plan, race.kind);
const scenario = {
  key: "target" as const,
  label: "objectif",
  seconds: 5 * 3600,
};

export function planned(paceFactors?: Record<string, number>) {
  return planModel({
    model,
    race,
    plan,
    scenario,
    timeZone: stored.timeZone,
    paceFactors,
  });
}

export const target = planned()!;
export const timeline = raceTimeline({
  model,
  planned: target,
  weather: null,
  strategy: null,
  fueling: timelineFueling(
    raceAllocation({
      model,
      planned: target,
      plan,
      nutritionPlan: null,
      products: [],
    }),
  ),
  stops: plan,
  walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
});
