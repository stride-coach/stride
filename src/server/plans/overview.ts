import "server-only";
import { cache } from "react";
import { z } from "zod";
import { localToday } from "@/features/plans/constraints";
import type { IntensityPaces } from "@/features/plans/model/structure";
import { raceKinds, withRaceCourse } from "@/features/onboarding/goals";
import {
  archivedSeason,
  archivedState,
  type PlanSeason,
} from "@/features/plans/view/seasons";
import {
  withRaceValues,
  type ProgramInput,
  type ProgramRace,
} from "@/features/plans/view/program";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readRaceCourses } from "@/server/races/courses";
import { readFreshSessionMatches } from "./auto-matches";
import { readSessionMatches, type SessionMatch } from "./matches";
import { readReadyProposals, type ReadyProposal } from "./proposals";
import {
  readActivePlan,
  readArchivedPlan,
  readArchivedPlans,
  type StoredPlan,
} from "./stored";

export type PlanOverview = {
  today: string;
  plan: StoredPlan;
  matches: SessionMatch[];
  proposals: ReadyProposal[];
  races: ProgramRace[];
};

const raceSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  race_date: z.string().nullable(),
  priority: z.enum(["A", "B", "C"]).nullable().catch(null),
  target_duration_seconds: z.number().int().positive().nullable().catch(null),
  distance_km: z.coerce.number().positive().nullable().catch(null),
  elevation_gain_m: z.number().int().min(0).nullable().catch(null),
  race_kind: z.enum(raceKinds).catch("trail"),
});

export const readPlanRaces = cache(async function readPlanRaces(
  context: OnboardingContext,
): Promise<ProgramRace[]> {
  const [{ data, error }, courses] = await Promise.all([
    context.client
      .from("athlete_races")
      .select(
        "id, name, race_date, priority, target_duration_seconds, distance_km, elevation_gain_m, race_kind",
      )
      .eq("user_id", context.userId),
    readRaceCourses(context),
  ]);
  if (error) return [];
  return z
    .array(raceSchema)
    .catch([])
    .parse(data)
    .map((row) => {
      const values = withRaceCourse(row, courses.get(row.id));
      return {
        id: row.id,
        name: row.name ?? "Course sans nom",
        date: row.race_date,
        priority: row.priority,
        targetSeconds: row.target_duration_seconds,
        distanceKm: values.distance_km,
        elevationGainM: values.elevation_gain_m,
        kind: row.race_kind,
      };
    });
});

export const loadPlanOverview = cache(
  async (context: OnboardingContext): Promise<PlanOverview | null> => {
    const [plan, races] = await Promise.all([
      readActivePlan(context),
      readPlanRaces(context),
    ]);
    if (!plan) return null;
    const [matches, proposals] = await Promise.all([
      readFreshSessionMatches(context, plan),
      readReadyProposals(context, plan.planId),
    ]);
    return {
      today: localToday(plan.state.plan.timeZone),
      plan: { ...plan, state: withRaceValues(plan.state, races) },
      matches,
      proposals,
      races,
    };
  },
);

export const loadArchivedSeasons = cache(async function loadArchivedSeasons(
  context: OnboardingContext,
): Promise<PlanSeason[]> {
  const [plans, races] = await Promise.all([
    readArchivedPlans(context),
    readPlanRaces(context),
  ]);
  return plans.flatMap((plan) => archivedSeason(plan, races) ?? []);
});

export const loadArchivedPlanOverview = cache(
  async (
    context: OnboardingContext,
    planId: string,
  ): Promise<PlanOverview | null> => {
    const [archived, races] = await Promise.all([
      readArchivedPlan(context, planId),
      readPlanRaces(context),
    ]);
    if (!archived) return null;
    const { plan, archivedOn } = archived;
    const today = localToday(plan.state.plan.timeZone);
    return {
      today: today < archivedOn ? today : archivedOn,
      plan: {
        ...plan,
        state: withRaceValues(archivedState(plan.state, archivedOn), races),
      },
      matches: await readSessionMatches(context, plan.planId),
      proposals: [],
      races,
    };
  },
);

export function programInput(
  overview: PlanOverview,
  paces: IntensityPaces | null = null,
): ProgramInput {
  return {
    state: overview.plan.state,
    today: overview.today,
    summary: overview.plan.versionSummary,
    matches: overview.matches,
    proposalKeys: overview.proposals.flatMap((proposal) => proposal.targetKeys),
    races: overview.races,
    paces,
  };
}
