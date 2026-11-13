import { positionAt, type Course } from "./course";
import { gradesOf, walkPortions, walkSummary, type WalkPortion } from "./grade";
import { nightOverlap, nightPlan, type NightPlan } from "./night";
import {
  nutritionSegment,
  nutritionTotals,
  type NutritionSegment,
} from "./nutrition";
import {
  daysUntil,
  defaultStartMinutes,
  type RacePlan,
  type RaceSummary,
  type StoredCourse,
} from "./race";
import { distanceAtElapsed, simulate, type Simulation } from "./simulation";
import { localMinutes, zonedEpoch } from "./sun";
import {
  sortWaypoints,
  waypointMarks,
  type Waypoint,
  type WaypointMark,
} from "./waypoints";

export type BuiltinScenarioKey = "ambitious" | "target" | "cautious";
export type ScenarioKey = BuiltinScenarioKey | `custom:${string}`;

export type CustomScenario = {
  id: string;
  name: string;
  targetSeconds: number;
  walkGradePercent: number | null;
  aidStopSeconds: number | null;
  carbsPerHourG: number | null;
  position: number;
};

export type Scenario = {
  key: ScenarioKey;
  seconds: number;
  label: string;
  custom?: CustomScenario;
};

export function customKey(id: string): ScenarioKey {
  return `custom:${id}`;
}

export function isCustomKey(key: string): key is `custom:${string}` {
  return key.startsWith("custom:");
}

export function scenarioPlan(plan: RacePlan, scenario: Scenario): RacePlan {
  const custom = scenario.custom;
  if (!custom) return plan;
  return {
    ...plan,
    walkGradePercent: custom.walkGradePercent ?? plan.walkGradePercent,
    aidStopSeconds: custom.aidStopSeconds ?? plan.aidStopSeconds,
    carbsPerHourG: custom.carbsPerHourG ?? plan.carbsPerHourG,
  };
}

export function scenarioModel(
  model: CourseModel,
  plan: RacePlan,
  scenario: Scenario,
): CourseModel {
  const threshold = scenario.custom?.walkGradePercent;
  if (
    threshold === null ||
    threshold === undefined ||
    threshold === plan.walkGradePercent ||
    model.portions.length === 0
  )
    return model;
  return {
    ...model,
    portions: walkPortions(model.course, threshold, model.grades),
  };
}

export const scenarioLabels: Record<BuiltinScenarioKey, string> = {
  ambitious: "ambitieux",
  target: "objectif",
  cautious: "prudent",
};

export const walkThresholds = [8, 10, 12] as const;

export function courseFromStored(stored: StoredCourse): Course {
  return {
    stepM: stored.stepM,
    distanceM: stored.distanceM,
    points: stored.points,
    elevationGainM: stored.elevationGainM,
    elevationLossM: stored.elevationLossM,
  };
}

export function scenariosOf(
  race: RaceSummary,
  plan: RacePlan,
  custom: readonly CustomScenario[] = [],
): Scenario[] {
  const list: Scenario[] = [];
  if (plan.ambitiousSeconds)
    list.push({
      key: "ambitious",
      seconds: plan.ambitiousSeconds,
      label: scenarioLabels.ambitious,
    });
  if (race.targetSeconds)
    list.push({
      key: "target",
      seconds: race.targetSeconds,
      label: scenarioLabels.target,
    });
  if (plan.cautiousSeconds)
    list.push({
      key: "cautious",
      seconds: plan.cautiousSeconds,
      label: scenarioLabels.cautious,
    });
  return [
    ...list.sort((a, b) => a.seconds - b.seconds),
    ...[...custom]
      .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name))
      .map((item) => ({
        key: customKey(item.id),
        seconds: item.targetSeconds,
        label: item.name,
        custom: item,
      })),
  ];
}

function virtualWaypoint(
  kind: "start" | "finish",
  distanceM: number,
): Waypoint {
  return {
    id: `virtual-${kind}`,
    kind,
    name: kind === "start" ? "Départ" : "Arrivée",
    distanceM,
    cutoffMinutes: null,
    services: [],
    watchLabel: null,
    alertDistanceM: 0,
    voiceNote: null,
    todo: null,
    nutritionNote: null,
    stopSeconds: null,
    crewAccess: null,
    crewPrepare: null,
    crewReason: null,
    source: "course",
    needsReview: false,
    revision: 1,
  };
}

export function completeWaypoints(waypoints: Waypoint[], course: Course) {
  const inside = waypoints.filter(
    (waypoint) => waypoint.distanceM <= course.distanceM + 50,
  );
  const withStart = inside.some((waypoint) => waypoint.kind === "start")
    ? inside
    : [virtualWaypoint("start", 0), ...inside];
  const complete = withStart.some((waypoint) => waypoint.kind === "finish")
    ? withStart
    : [...withStart, virtualWaypoint("finish", course.distanceM)];
  return sortWaypoints(complete);
}

export type CourseModel = {
  course: Course;
  waypoints: Waypoint[];
  marks: WaypointMark[];
  grades: number[];
  portions: WalkPortion[];
  walkByThreshold: { threshold: number; count: number; distanceM: number }[];
};

export function courseModel(
  stored: StoredCourse,
  waypoints: Waypoint[],
  plan: RacePlan,
  kind: RaceSummary["kind"] = "trail",
): CourseModel {
  const course = courseFromStored(stored);
  const grades = gradesOf(course);
  const complete = completeWaypoints(
    kind === "road"
      ? waypoints.filter(
          (waypoint) => waypoint.kind === "start" || waypoint.kind === "finish",
        )
      : waypoints,
    course,
  );
  const thresholds = [
    ...new Set([...walkThresholds, plan.walkGradePercent]),
  ].sort((a, b) => a - b);
  return {
    course,
    waypoints: complete,
    marks: waypointMarks(complete),
    grades,
    portions:
      kind === "road"
        ? []
        : walkPortions(course, plan.walkGradePercent, grades),
    walkByThreshold: thresholds.map((threshold) => ({
      threshold,
      ...walkSummary(
        kind === "road" ? [] : walkPortions(course, threshold, grades),
      ),
    })),
  };
}

export function estimatedCourse(
  distanceM: number,
  elevationGainM: number | null,
): Course {
  const stepM = Math.max(100, Math.ceil(distanceM / 2000));
  const count = Math.max(2, Math.ceil(distanceM / stepM) + 1);
  const bump = elevationGainM ? 10 : 0;
  return {
    stepM,
    distanceM,
    points: Array.from({ length: count }, (_, index) => [
      0,
      0,
      100 + (index % 2) * bump,
    ]),
    elevationGainM,
    elevationLossM: elevationGainM,
  };
}

export function estimatedCourseModel(
  race: Pick<RaceSummary, "distanceKm" | "elevationGainM" | "kind">,
  waypoints: Waypoint[],
): CourseModel | null {
  if (!race.distanceKm || race.distanceKm <= 0) return null;
  const course = estimatedCourse(race.distanceKm * 1000, race.elevationGainM);
  const complete = completeWaypoints(
    race.kind === "road"
      ? waypoints.filter(
          (waypoint) => waypoint.kind === "start" || waypoint.kind === "finish",
        )
      : waypoints.filter(
          (waypoint) =>
            waypoint.kind !== "finish" ||
            Math.abs(waypoint.distanceM - course.distanceM) <= 50,
        ),
    course,
  );
  return {
    course,
    waypoints: complete,
    marks: waypointMarks(complete),
    grades: course.points.map(() => 0),
    portions: [],
    walkByThreshold: [],
  };
}

export type RacePlanModel = {
  scenario: Scenario;
  simulation: Simulation;
  night: NightPlan | null;
  nightKm: { fromM: number; toM: number }[];
  nutrition: NutritionSegment[];
  nutritionTotals: ReturnType<typeof nutritionTotals>;
  startEpochMs: number | null;
  finishMarginSeconds: number | null;
};

export function planModel({
  model,
  race,
  plan,
  scenario,
  timeZone,
  paceFactors,
}: {
  model: CourseModel;
  race: RaceSummary;
  plan: RacePlan;
  scenario: Scenario;
  timeZone: string;
  paceFactors?: Readonly<Record<string, number>>;
}): RacePlanModel {
  const startMinutes = plan.startMinutes ?? defaultStartMinutes;
  const simulation = simulate(
    model.course,
    model.grades,
    model.portions,
    model.waypoints,
    {
      targetSeconds: scenario.seconds,
      walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
      aidStopSeconds: race.kind === "road" ? 0 : plan.aidStopSeconds,
      waterStopSeconds: race.kind === "road" ? 0 : plan.waterStopSeconds,
      startMinutes,
      paceFactors: race.kind === "road" ? undefined : paceFactors,
    },
  );
  const start = positionAt(model.course, 0);
  const night = race.date
    ? nightPlan({
        date: race.date,
        startMinutes,
        durationSeconds: simulation.finishSeconds,
        latitude: start.lat,
        longitude: start.lon,
        timeZone,
      })
    : null;
  const nightKm = (night?.windows ?? []).map((window) => ({
    fromM: distanceAtElapsed(model.course, simulation, window.fromSeconds),
    toM: distanceAtElapsed(model.course, simulation, window.toSeconds),
  }));
  const settings = {
    carbsPerHourG: plan.carbsPerHourG,
    waterMlPerHour: plan.waterMlPerHour,
    sodiumMgPerHour: plan.sodiumMgPerHour,
    alarmMinutes: plan.alarmMinutes,
    nightCaffeine: plan.nightCaffeine,
  };
  const nutrition = simulation.segments.map((segment) => {
    const end = segment.arrival.elapsedSeconds;
    const begin = end - segment.movingSeconds;
    const fraction =
      night && segment.movingSeconds > 0
        ? nightOverlap(night, begin, end) / segment.movingSeconds
        : 0;
    return nutritionSegment(segment.movingSeconds, fraction, settings);
  });
  const finish = simulation.passages[simulation.passages.length - 1];
  const finishCutoff = finish.cutoffSeconds ?? plan.cutoffSeconds;
  return {
    scenario,
    simulation,
    night,
    nightKm,
    nutrition,
    nutritionTotals: nutritionTotals(nutrition, settings),
    startEpochMs: race.date
      ? zonedEpoch(race.date, startMinutes, timeZone)
      : null,
    finishMarginSeconds: finishCutoff
      ? finishCutoff - simulation.finishSeconds
      : null,
  };
}

export function countdown(race: RaceSummary, today: string) {
  return race.date ? daysUntil(race.date, today) : null;
}

export function clockOfEpoch(epochMs: number, timeZone: string) {
  return localMinutes(epochMs, timeZone);
}

export function segmentNight(planned: RacePlanModel, index: number) {
  const segment = planned.simulation.segments[index];
  if (!planned.night) return false;
  const end = segment.arrival.elapsedSeconds;
  const begin = end - segment.movingSeconds;
  return nightOverlap(planned.night, begin, end) >= segment.movingSeconds / 2;
}
