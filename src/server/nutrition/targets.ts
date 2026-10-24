import "server-only";
import { z } from "zod";
import { fuelingDefaults, type FuelingRace } from "@/features/fueling/base";
import { addDays, mondayOf } from "@/features/plans/model/dates";
import type { PlanState } from "@/features/plans/model/plan";
import {
  nutritionForDay,
  type NutritionHealthFlag,
  type NutritionProfile,
  type NutritionRace,
  type NutritionResult,
  type NutritionSession,
} from "@/features/nutrition/calculator";
import type { PlanningHealth } from "@/features/plans/health/health";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readNutritionLibrary } from "@/server/fueling/products";
import { readPlanningHealth } from "@/server/plans/health";
import { readSessionMatches } from "@/server/plans/matches";
import { readActivePlan, type StoredPlan } from "@/server/plans/stored";
import { listRaces } from "@/server/races/races";

const valueSourcesSchema = z
  .object({
    weight_kg: z.object({ source: z.enum(["athlete", "garmin"]) }).optional(),
  })
  .catch({});

const racePlanRowSchema = z.object({
  race_id: z.uuid(),
  carbs_per_hour_g: z.number().int(),
  water_ml_per_hour: z.number().int(),
  sodium_mg_per_hour: z.number().int(),
});

const measuredActivitySchema = z.object({
  id: z.uuid(),
  calories: z.number().nullable(),
  local_started_at: z.string().nullable(),
});

export type MeasuredSession = {
  kcal: number | null;
  localStartedAt: string | null;
};

export type NutritionInputs = {
  profile: NutritionProfile;
  plan: PlanState | null;
  races: NutritionRace[];
  fuelingRaces: FuelingRace[];
  measured: Map<string, MeasuredSession>;
  health: PlanningHealth;
};

export function healthFlagsOf(health: PlanningHealth): NutritionHealthFlag[] {
  const flags = new Set<NutritionHealthFlag>();
  for (const condition of health.conditions) {
    if (condition.status === "resolved") continue;
    if (condition.kind === "illness") flags.add("illness");
    if (condition.kind === "fatigue") flags.add("fatigue");
    if (condition.kind === "pain" && condition.severity >= 4)
      flags.add("injury");
  }
  if (health.readiness.some((day) => day.level === "red"))
    flags.add("poor_readiness");
  return [...flags];
}

function sessionsOn(
  plan: PlanState | null,
  measured: Map<string, MeasuredSession>,
  date: string,
): NutritionSession[] {
  return (plan?.sessions ?? [])
    .filter(
      (session) =>
        session.scheduledOn === date &&
        session.sport !== "rest" &&
        session.kind !== "rest",
    )
    .map((session) => ({
      sport: session.sport,
      kind: session.kind,
      isKey: session.isKey,
      durationSeconds: session.targets.durationSeconds || undefined,
      distanceKm:
        session.targets.distanceMeters === null
          ? undefined
          : session.targets.distanceMeters / 1000,
      elevationGainM: session.targets.elevationGainMeters ?? undefined,
      measuredKcal: measured.get(session.sessionKey)?.kcal ?? undefined,
    }));
}

function weekTypeOn(plan: PlanState | null, date: string) {
  const week = plan?.weeks.find((item) => item.weekStart === mondayOf(date));
  return week?.weekType === "taper" || week?.weekType === "race"
    ? week.weekType
    : null;
}

export function nutritionDays(
  inputs: NutritionInputs,
  from: string,
  days: number,
  deficitRequested: boolean,
): NutritionResult[] {
  const healthFlags = healthFlagsOf(inputs.health);
  return Array.from({ length: days }, (_, index) => {
    const date = addDays(from, index);
    return nutritionForDay({
      date,
      profile: inputs.profile,
      sessions: sessionsOn(inputs.plan, inputs.measured, date),
      races: inputs.races,
      fuelingRaces: inputs.fuelingRaces,
      deficitRequested,
      weekType: weekTypeOn(inputs.plan, date),
      healthFlags,
    });
  });
}

async function readMeasuredSessions(
  context: OnboardingContext,
  stored: StoredPlan | null,
  from: string,
  to: string,
): Promise<Map<string, MeasuredSession>> {
  const measured = new Map<string, MeasuredSession>();
  if (!stored) return measured;
  const keys = new Set(
    stored.state.sessions
      .filter(
        (session) => session.scheduledOn >= from && session.scheduledOn <= to,
      )
      .map((session) => session.sessionKey),
  );
  if (!keys.size) return measured;
  const matches = (await readSessionMatches(context, stored.planId)).filter(
    (match) => match.activityId && keys.has(match.sessionKey),
  );
  if (!matches.length) return measured;
  const { data, error } = await context.client
    .from("provider_activities")
    .select("id, calories, local_started_at")
    .eq("user_id", context.userId)
    .in(
      "id",
      matches.map((match) => match.activityId as string),
    );
  if (error) throw new Error("Unable to read the matched activities");
  const activities = new Map(
    z
      .array(measuredActivitySchema)
      .parse(data)
      .map((activity) => [activity.id, activity]),
  );
  for (const match of matches) {
    const activity = activities.get(match.activityId as string);
    if (!activity) continue;
    const current = measured.get(match.sessionKey);
    const kcal =
      activity.calories !== null && activity.calories > 0
        ? activity.calories
        : null;
    measured.set(match.sessionKey, {
      kcal:
        kcal === null ? (current?.kcal ?? null) : (current?.kcal ?? 0) + kcal,
      localStartedAt:
        current?.localStartedAt && activity.local_started_at
          ? current.localStartedAt < activity.local_started_at
            ? current.localStartedAt
            : activity.local_started_at
          : (current?.localStartedAt ?? activity.local_started_at),
    });
  }
  return measured;
}

async function readFuelingRaces(
  context: OnboardingContext,
  races: Awaited<ReturnType<typeof listRaces>>,
): Promise<FuelingRace[]> {
  if (!races.length) return [];
  const { data, error } = await context.client
    .from("race_plans")
    .select("race_id, carbs_per_hour_g, water_ml_per_hour, sodium_mg_per_hour")
    .eq("user_id", context.userId)
    .in(
      "race_id",
      races.map((race) => race.id),
    );
  if (error) throw new Error("Unable to read the race plans");
  const plans = new Map(
    z
      .array(racePlanRowSchema)
      .parse(data)
      .map((plan) => [plan.race_id, plan]),
  );
  return races.flatMap((race) => {
    if (!race.date) return [];
    const plan = plans.get(race.id);
    return [
      {
        id: race.id,
        name: race.name,
        kind: race.kind,
        date: race.date,
        targets: plan
          ? {
              carbsPerHourG: plan.carbs_per_hour_g,
              waterMlPerHour: plan.water_ml_per_hour,
              sodiumMgPerHour: plan.sodium_mg_per_hour,
            }
          : { ...fuelingDefaults },
      },
    ];
  });
}

export async function readNutritionInputs(
  context: OnboardingContext,
  today: string,
  range: { from: string; to: string } = { from: today, to: today },
): Promise<NutritionInputs> {
  const [profile, allRaces, stored, health] = await Promise.all([
    context.client
      .from("athlete_profiles")
      .select("birth_date, sex, height_cm, weight_kg, value_sources")
      .eq("user_id", context.userId)
      .maybeSingle(),
    listRaces(context),
    readActivePlan(context),
    readPlanningHealth(context, today),
  ]);
  if (profile.error) throw new Error("Unable to read the nutrition inputs");
  const races = allRaces.filter(
    (race) => race.date !== null && race.date >= addDays(range.from, -1),
  );
  const measuredTo = range.to < today ? range.to : today;
  const [fuelingRaces, measured] = await Promise.all([
    readFuelingRaces(context, races),
    range.from <= measuredTo
      ? readMeasuredSessions(context, stored, range.from, measuredTo)
      : Promise.resolve(new Map<string, MeasuredSession>()),
  ]);
  return {
    profile: {
      birthDate: profile.data?.birth_date ?? null,
      sex: profile.data?.sex ?? null,
      heightCm: profile.data?.height_cm ?? null,
      weightKg: profile.data?.weight_kg ?? null,
      weightSource:
        valueSourcesSchema.parse(profile.data?.value_sources ?? {}).weight_kg
          ?.source ?? null,
    },
    plan: stored?.state ?? null,
    races: races.flatMap((race) =>
      race.date
        ? [
            {
              date: race.date,
              sport: race.kind === "road" ? "run" : "trail",
              distanceKm: race.distanceKm ?? undefined,
              elevationGainM: race.elevationGainM ?? undefined,
              expectedDurationSeconds: race.targetSeconds ?? undefined,
            } satisfies NutritionRace,
          ]
        : [],
    ),
    fuelingRaces,
    measured,
    health,
  };
}

export const nutritionPageDays = 7;

export async function loadNutrition(context: OnboardingContext, today: string) {
  const [inputs, library] = await Promise.all([
    readNutritionInputs(context, today),
    readNutritionLibrary(context),
  ]);
  const sessions = (inputs.plan?.sessions ?? [])
    .filter(
      (session) =>
        session.scheduledOn >= today &&
        session.sport !== "rest" &&
        session.kind !== "rest",
    )
    .map((session) => ({
      sessionKey: session.sessionKey,
      date: session.scheduledOn,
      title: session.title,
      durationSeconds: session.targets.durationSeconds,
    }));
  const main = sessions
    .filter((session) => session.date === today)
    .sort((first, second) => second.durationSeconds - first.durationSeconds)[0];
  return {
    results: nutritionDays(inputs, today, nutritionPageDays, false),
    sessions,
    products: library.active,
    fuelingRaces: inputs.fuelingRaces,
    startedAt: main
      ? (inputs.measured.get(main.sessionKey)?.localStartedAt ?? null)
      : null,
  };
}
