import {
  allocateRaceNutrition,
  type AllocationStation,
} from "@/features/fueling/allocation";
import type { NutritionProduct } from "@/features/fueling/products";
import {
  emptyNutritionPlan,
  type RaceNutritionPlan,
} from "@/features/fueling/race-plan";
import type { RacePlan } from "./race";
import {
  segmentNight,
  type CourseModel,
  type RacePlanModel,
} from "./workspace";

export function raceAllocation({
  model,
  planned,
  plan,
  nutritionPlan,
  products,
  dropBagExtras = [],
}: {
  model: CourseModel;
  planned: RacePlanModel;
  plan: RacePlan;
  nutritionPlan: RaceNutritionPlan | null;
  products: readonly NutritionProduct[];
  dropBagExtras?: readonly string[];
}) {
  const waypoints = new Map(model.waypoints.map((point) => [point.id, point]));
  const segments = planned.simulation.segments;
  const station = (id: string): AllocationStation => {
    const waypoint = waypoints.get(id);
    return {
      id,
      kind: waypoint?.kind ?? "aid",
      services: waypoint?.services ?? [],
    };
  };
  const stations = segments.length
    ? [
        station(segments[0].fromId),
        ...segments.map((segment) => station(segment.toId)),
      ]
    : [];
  return allocateRaceNutrition({
    stations,
    segments: segments.map((segment, index) => ({
      id: segment.toId,
      movingSeconds: segment.movingSeconds,
      startElapsedSeconds:
        segment.arrival.elapsedSeconds - segment.movingSeconds,
      night: segmentNight(planned, index),
    })),
    products,
    targets: {
      carbsPerHourG: plan.carbsPerHourG,
      waterMlPerHour: plan.waterMlPerHour,
      sodiumMgPerHour: plan.sodiumMgPerHour,
      caffeineMaxMg: plan.caffeineMaxMg,
      nightCaffeine: plan.nightCaffeine,
      flaskMl: plan.flaskMl,
      flaskCount: plan.flaskCount,
      bladderMl: plan.bladderMl,
    },
    plan: nutritionPlan ?? emptyNutritionPlan,
    dropBagExtras,
  });
}
