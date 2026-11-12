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
  planModel,
  scenariosOf,
  type CourseModel,
  type RacePlanModel,
  type ScenarioKey,
} from "@/features/races/workspace";
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
  const scenarios = scenariosOf(data.race, data.plan);
  const scenario =
    scenarios.find((item) => item.key === scenarioKey) ??
    scenarios.find((item) => item.key === "target") ??
    scenarios[0] ??
    null;
  const planned = scenario
    ? planModel({
        model,
        race: data.race,
        plan: withFuelingCap(data.plan, data.fuelingCapG ?? null),
        scenario,
        timeZone: data.course.timeZone,
        paceFactors: strategy ? paceFactorsOf(strategy) : undefined,
      })
    : null;
  return { model, planned, scenarios };
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
