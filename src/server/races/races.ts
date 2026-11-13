import "server-only";
import { cache } from "react";
import {
  fuelingTestColumns,
  fuelingTests,
  validatedCarbsPerHour,
} from "@/features/fueling/tests";
import {
  raceDetailColumns,
  raceDetailsOf,
  type RaceDetails,
} from "@/features/races/race-details";
import {
  raceColumns,
  raceRowSchema,
  withRaceCourse,
} from "@/features/onboarding/goals";
import {
  checklistColumns,
  checklistRowSchema,
  type ChecklistItem,
} from "@/features/races/checklists";
import {
  courseColumns,
  courseRowSchema,
  defaultPlan,
  planColumns,
  planRowSchema,
  type RacePlan,
  type RaceSummary,
  type StoredCourse,
} from "@/features/races/race";
import {
  dropBagExtrasSchema,
  raceNutritionPlanSchema,
  type RaceNutritionPlan,
} from "@/features/fueling/race-plan";
import {
  strategyColumns,
  strategyRowSchema,
  type StoredStrategy,
} from "@/features/races/proposals";
import {
  sortWaypoints,
  waypointColumns,
  waypointRowSchema,
  type Waypoint,
} from "@/features/races/waypoints";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readRaceCourses } from "./courses";
import {
  customScenarioColumns,
  customScenarioRowSchema,
} from "@/features/races/custom-scenarios";
import type { CustomScenario } from "@/features/races/workspace";

export type RaceWorkspaceData = {
  race: RaceSummary;
  scenarios: CustomScenario[];
  plan: RacePlan;
  course: StoredCourse | null;
  waypoints: Waypoint[];
  checklist: ChecklistItem[];
  strategy: StoredStrategy | null;
  nutritionPlan: {
    plan: RaceNutritionPlan;
    revision: number;
    updatedAt: string;
  } | null;
  dropBag: { extras: string[]; revision: number } | null;
  details: RaceDetails;
  fuelingCapG: number | null;
};

function nutritionPlanOf(
  row: { plan: unknown; revision: number; updated_at: string } | null,
) {
  if (!row) return null;
  const plan = raceNutritionPlanSchema.safeParse(row.plan);
  return plan.success
    ? { plan: plan.data, revision: row.revision, updatedAt: row.updated_at }
    : null;
}

function summary(row: unknown): RaceSummary {
  const race = raceRowSchema.parse(row);
  return {
    id: race.id,
    name: race.name ?? "Course sans nom",
    kind: race.race_kind,
    date: race.race_date,
    distanceKm: race.distance_km,
    elevationGainM: race.elevation_gain_m,
    priority: race.priority,
    targetSeconds: race.target_duration_seconds,
    revision: race.revision,
  };
}

export const listRaces = cache(async (context: OnboardingContext) => {
  const [{ data, error }, courses] = await Promise.all([
    context.client
      .from("athlete_races")
      .select(raceColumns)
      .eq("user_id", context.userId)
      .order("race_date", { ascending: true, nullsFirst: false }),
    readRaceCourses(context),
  ]);
  if (error) throw new Error("Unable to read races");
  return (data ?? []).map((row) => {
    const race = summary(row);
    const resolved = withRaceCourse(
      { distance_km: race.distanceKm, elevation_gain_m: race.elevationGainM },
      courses.get(race.id),
    );
    return {
      ...race,
      distanceKm: resolved.distance_km,
      elevationGainM: resolved.elevation_gain_m,
    };
  });
});

export const readWorkspace = cache(
  async (
    context: OnboardingContext,
    raceId: string,
  ): Promise<RaceWorkspaceData | null> => {
    const [
      race,
      plan,
      course,
      waypoints,
      checklist,
      strategy,
      nutrition,
      dropBag,
      tests,
      scenarios,
    ] = await Promise.all([
      context.client
        .from("athlete_races")
        .select(`${raceColumns}, ${raceDetailColumns}`)
        .eq("user_id", context.userId)
        .eq("id", raceId)
        .maybeSingle(),
      context.client
        .from("race_plans")
        .select(planColumns)
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .maybeSingle(),
      context.client
        .from("race_courses")
        .select(courseColumns)
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .maybeSingle(),
      context.client
        .from("race_waypoints")
        .select(waypointColumns)
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .order("distance_m", { ascending: true }),
      context.client
        .from("race_checklist_items")
        .select(checklistColumns)
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .order("list", { ascending: true })
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      context.client
        .from("race_strategies")
        .select(strategyColumns)
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .maybeSingle(),
      context.client
        .from("race_nutrition_plans")
        .select("plan, revision, updated_at")
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .maybeSingle(),
      context.client
        .from("race_drop_bags")
        .select("extras, revision")
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .maybeSingle(),
      context.client
        .from("fueling_tests")
        .select(fuelingTestColumns)
        .eq("user_id", context.userId),
      context.client
        .from("race_scenarios")
        .select(customScenarioColumns)
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .order("position", { ascending: true }),
    ]);
    if (
      race.error ||
      plan.error ||
      course.error ||
      waypoints.error ||
      checklist.error ||
      strategy.error ||
      nutrition.error ||
      dropBag.error
    )
      throw new Error("Unable to read race workspace");
    if (!race.data) return null;
    return {
      details: raceDetailsOf(race.data),
      fuelingCapG: tests.error
        ? null
        : validatedCarbsPerHour(fuelingTests(tests.data ?? [])),
      race: summary(race.data),
      scenarios: scenarios.error
        ? []
        : (scenarios.data ?? []).flatMap((row) => {
            const parsed = customScenarioRowSchema.safeParse(row);
            return parsed.success ? [parsed.data] : [];
          }),
      plan: plan.data ? planRowSchema.parse(plan.data) : defaultPlan,
      course: course.data ? courseRowSchema.parse(course.data) : null,
      waypoints: sortWaypoints(
        (waypoints.data ?? []).map((row) => waypointRowSchema.parse(row)),
      ),
      checklist: (checklist.data ?? []).map((row) =>
        checklistRowSchema.parse(row),
      ),
      strategy: strategy.data ? strategyRowSchema.parse(strategy.data) : null,
      nutritionPlan: nutritionPlanOf(nutrition.data),
      dropBag: dropBag.data
        ? {
            extras: dropBagExtrasSchema.catch([]).parse(dropBag.data.extras),
            revision: dropBag.data.revision,
          }
        : null,
    };
  },
);
