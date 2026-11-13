import "server-only";
import { positionAt } from "@/features/races/course";
import { isNightAt } from "@/features/races/night";
import { mapData } from "@/features/races/map";
import { profileData } from "@/features/races/profile";
import type { RaceWorkspaceData } from "./races";
import { withFuelingCap } from "@/features/fueling/tests";
import { distanceAtElapsed } from "@/features/races/simulation";
import {
  slotTimes,
  type RaceWeather,
  type SlotRequest,
} from "@/features/races/weather";
import {
  courseModel,
  estimatedCourseModel,
  planModel,
  scenarioModel,
  scenarioPlan,
  scenariosOf,
  type CourseModel,
  type RacePlanModel,
  type ScenarioKey,
} from "@/features/races/workspace";
import { roadbookRows, roadbookTotals } from "@/features/races/axis";
import { barriersOf, cutoffAlert } from "@/features/races/cutoff-alert";
import { crewPlan } from "@/features/races/crew";
import { printedRoadbook } from "@/features/races/printed-roadbook";
import { paceFactorsOf, type RaceStrategy } from "@/features/races/proposals";
import { raceWeather } from "./weather";
import type { NutritionProduct } from "@/features/fueling/products";
import { raceAllocation } from "@/features/races/race-nutrition";
import { raceTimeline, timelineFueling } from "@/features/races/timeline";

export type CourseViews = {
  model: CourseModel;
  planned: RacePlanModel | null;
  weather: RaceWeather | null;
};

export function planFor(
  data: RaceWorkspaceData,
  scenarioKey: ScenarioKey | null = null,
  strategy: RaceStrategy | null = data.strategy,
) {
  if (!data.course) return null;
  const model = courseModel(
    data.course,
    data.waypoints,
    data.plan,
    data.race.kind,
  );
  const scenarios = scenariosOf(data.race, data.plan, data.scenarios);
  const scenario =
    scenarios.find((item) => item.key === scenarioKey) ??
    scenarios.find((item) => item.key === "target") ??
    scenarios[0] ??
    null;
  const planned = scenario
    ? planModel({
        model: scenarioModel(model, data.plan, scenario),
        race: data.race,
        plan: withFuelingCap(
          scenarioPlan(data.plan, scenario),
          data.fuelingCapG ?? null,
        ),
        scenario,
        timeZone: data.course.timeZone,
        paceFactors: strategy ? paceFactorsOf(strategy) : undefined,
      })
    : null;
  return { model, planned, scenarios };
}

export async function printedRoadbookFor(
  data: RaceWorkspaceData,
  products: { active: NutritionProduct[]; archived: NutritionProduct[] },
) {
  const views = data.course ? planFor(data) : estimateFor(data);
  if (!views?.planned) return null;
  const { model, planned } = views;
  const weather = data.course
    ? await weatherFor(data, model, planned).catch(() => null)
    : null;
  const timeline = timelineFor({ data, model, planned, weather, products });
  const { profile } = chartViews(model, planned, weather);
  const estimate = data.course === null;
  const rows = roadbookRows(timeline, weather);
  return printedRoadbook({
    race: data.race,
    planned,
    timeline,
    rows: estimate ? rows.map((row) => ({ ...row, walk: "—" })) : rows,
    totals: roadbookTotals(timeline, model.course.distanceM),
    walkGradePercent: data.plan.walkGradePercent,
    rain: weather?.mode === "forecast" ? profile.rain : [],
    estimate,
  });
}

export function crewFor(data: RaceWorkspaceData) {
  const views = planFor(data);
  if (!views?.planned) return null;
  const alternative = (key: "ambitious" | "cautious") =>
    views.scenarios.some((scenario) => scenario.key === key)
      ? (planFor(data, key)?.planned ?? null)
      : null;
  return {
    views,
    crew: crewPlan({
      model: views.model,
      planned: views.planned,
      ambitious: alternative("ambitious"),
      cautious: alternative("cautious"),
    }),
  };
}

export function estimateFor(data: RaceWorkspaceData) {
  if (data.course) return null;
  const model = estimatedCourseModel(data.race, data.waypoints);
  const scenario = scenariosOf(data.race, data.plan).find(
    (item) => item.key === "target",
  );
  if (!model || !scenario) return null;
  const planned = planModel({
    model,
    race: { ...data.race, date: null },
    plan: withFuelingCap(data.plan, data.fuelingCapG ?? null),
    scenario,
    timeZone: "Europe/Paris",
    paceFactors: data.strategy ? paceFactorsOf(data.strategy) : undefined,
  });
  return { model, planned };
}

export function cutoffFor(
  data: RaceWorkspaceData,
  model: CourseModel,
  planned: RacePlanModel,
) {
  const inputs = {
    model,
    planned,
    plan: data.plan,
    paceFactors: data.strategy ? paceFactorsOf(data.strategy) : undefined,
  };
  const alert = cutoffAlert(inputs);
  return alert ? { alert, barriers: barriersOf(inputs) } : null;
}

export async function weatherFor(
  data: RaceWorkspaceData,
  model: CourseModel,
  planned: RacePlanModel | null,
) {
  if (
    !planned ||
    !data.race.date ||
    !data.course ||
    planned.startEpochMs === null
  )
    return null;
  const start = planned.startEpochMs;
  const slots: SlotRequest[] = slotTimes(
    planned.simulation.passages[0].clockMinutes,
    planned.simulation.finishSeconds,
  ).map((elapsedSeconds) => {
    const distanceM = distanceAtElapsed(
      model.course,
      planned.simulation,
      elapsedSeconds,
    );
    const position = positionAt(model.course, distanceM);
    return {
      elapsedSeconds,
      epochMs: start + elapsedSeconds * 1000,
      clockMinutes:
        planned.simulation.passages[0].clockMinutes + elapsedSeconds / 60,
      distanceM,
      lat: position.lat,
      lon: position.lon,
      night: planned.night ? isNightAt(planned.night, elapsedSeconds) : false,
    };
  });
  return raceWeather({
    slots,
    date: data.race.date,
    timeZone: data.course.timeZone,
    now: new Date(),
  }).catch(() => null);
}

export function chartViews(
  model: CourseModel,
  planned: RacePlanModel | null,
  weather: RaceWeather | null,
) {
  const profile = profileData({
    course: model.course,
    waypoints: model.waypoints,
    marks: model.marks,
    portions: model.portions,
    planned,
    weather,
  });
  return { profile, map: mapData(model.course, profile) };
}

export function timelineFor({
  data,
  model,
  planned,
  weather,
  products,
}: {
  data: RaceWorkspaceData;
  model: CourseModel;
  planned: RacePlanModel;
  weather: RaceWeather | null;
  products: { active: NutritionProduct[]; archived: NutritionProduct[] };
}) {
  return raceTimeline({
    model,
    planned,
    weather,
    strategy: data.strategy,
    fueling: timelineFueling(
      raceAllocation({
        model,
        planned,
        plan: withFuelingCap(data.plan, data.fuelingCapG ?? null),
        nutritionPlan: data.nutritionPlan?.plan ?? null,
        dropBagExtras: data.dropBag?.extras ?? [],
        products: products.active,
        archivedProducts: products.archived,
        weather,
      }),
    ),
    stops: data.plan,
    walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
  });
}
