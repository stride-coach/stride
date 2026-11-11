import "server-only";
import { cache } from "react";
import { z } from "zod";
import { localToday } from "@/features/plans/constraints";
import type { PlanState } from "@/features/plans/model/plan";
import { toPlanState } from "@/features/plans/model/rows";
import type { ArchivedPlan } from "@/features/plans/view/seasons";
import type { OnboardingContext } from "@/server/onboarding/context";

type PlanContext = Pick<OnboardingContext, "client" | "userId">;

export type StoredPlan = {
  planId: string;
  status: "active" | "archived";
  activeVersion: number;
  version: number;
  versionSummary: string | null;
  state: PlanState;
};

const planColumns =
  "id, status, title, starts_on, ends_on, time_zone, primary_race_id, active_version";
const archivedColumns = `${planColumns}, updated_at`;
const blockColumns =
  "block_key, kind, name, starts_on, ends_on, objective, race_id";
const weekColumns =
  "week_key, week_start, block_key, week_type, target_duration_s, target_distance_m, target_elevation_m, quality_sessions, long_run_target_s, intensity_split, notes";
const sessionColumns =
  "session_key, scheduled_on, sport, kind, title, purpose, is_key, priority, targets, structure, terrain, origin, contingencies";

async function readRows(
  context: PlanContext,
  plan: {
    id: string;
    status: string;
    title: string;
    starts_on: string;
    ends_on: string;
    time_zone: string;
    primary_race_id: string | null;
    active_version: number;
  },
  version: number,
): Promise<StoredPlan | null> {
  const openEnded =
    version === plan.active_version
      ? "valid_to_version.is.null"
      : `valid_to_version.is.null,valid_to_version.gt.${version}`;
  const [versionRow, blocks, weeks, sessions] = await Promise.all([
    context.client
      .from("plan_versions")
      .select("version, race_roles, confidence, summary")
      .eq("plan_id", plan.id)
      .eq("version", version)
      .maybeSingle(),
    context.client
      .from("plan_blocks")
      .select(blockColumns)
      .eq("plan_id", plan.id)
      .lte("valid_from_version", version)
      .or(openEnded),
    context.client
      .from("plan_weeks")
      .select(weekColumns)
      .eq("plan_id", plan.id)
      .lte("valid_from_version", version)
      .or(openEnded),
    context.client
      .from("plan_sessions")
      .select(sessionColumns)
      .eq("plan_id", plan.id)
      .lte("valid_from_version", version)
      .or(openEnded),
  ]);
  if (versionRow.error || blocks.error || weeks.error || sessions.error)
    throw new Error("Unable to read the stored plan");
  if (!versionRow.data) return null;
  return {
    planId: plan.id,
    status: plan.status === "archived" ? "archived" : "active",
    activeVersion: plan.active_version,
    version,
    versionSummary: versionRow.data.summary,
    state: toPlanState({
      plan,
      version: versionRow.data,
      blocks: blocks.data,
      weeks: weeks.data,
      sessions: sessions.data,
    }),
  };
}

export const readActivePlan = cache(async function readActivePlan(
  context: PlanContext,
): Promise<StoredPlan | null> {
  const { data, error } = await context.client
    .from("training_plans")
    .select(planColumns)
    .eq("user_id", context.userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error("Unable to read the active plan");
  return data ? readRows(context, data, data.active_version) : null;
});

export async function readPlanVersion(
  context: PlanContext,
  planId: string,
  version: number,
): Promise<StoredPlan | null> {
  if (
    !z.uuid().safeParse(planId).success ||
    !Number.isInteger(version) ||
    version < 1
  )
    return null;
  const { data, error } = await context.client
    .from("training_plans")
    .select(planColumns)
    .eq("user_id", context.userId)
    .eq("id", planId)
    .maybeSingle();
  if (error) throw new Error("Unable to read the plan");
  if (!data || version > data.active_version) return null;
  return readRows(context, data, version);
}

function archivedOn(updatedAt: string, timeZone: string) {
  return localToday(timeZone, new Date(updatedAt));
}

export const readArchivedPlans = cache(async function readArchivedPlans(
  context: PlanContext,
): Promise<ArchivedPlan[]> {
  const { data, error } = await context.client
    .from("training_plans")
    .select("id, title, primary_race_id, time_zone, updated_at")
    .eq("user_id", context.userId)
    .eq("status", "archived")
    .order("updated_at", { ascending: false });
  if (error) throw new Error("Unable to read the archived plans");
  if (data.length === 0) return [];
  const weeks = await context.client
    .from("plan_weeks")
    .select("plan_id, week_start")
    .eq("user_id", context.userId)
    .in(
      "plan_id",
      data.map((plan) => plan.id),
    )
    .is("valid_to_version", null);
  if (weeks.error) throw new Error("Unable to read the archived plan weeks");
  return data.map((plan) => ({
    planId: plan.id,
    title: plan.title,
    primaryRaceId: plan.primary_race_id,
    archivedOn: archivedOn(plan.updated_at, plan.time_zone),
    weekStarts: weeks.data
      .filter((week) => week.plan_id === plan.id)
      .map((week) => week.week_start),
  }));
});

export const readArchivedPlan = cache(async function readArchivedPlan(
  context: PlanContext,
  planId: string,
): Promise<{ plan: StoredPlan; archivedOn: string } | null> {
  if (!z.uuid().safeParse(planId).success) return null;
  const { data, error } = await context.client
    .from("training_plans")
    .select(archivedColumns)
    .eq("user_id", context.userId)
    .eq("id", planId)
    .eq("status", "archived")
    .maybeSingle();
  if (error) throw new Error("Unable to read the archived plan");
  if (!data) return null;
  const plan = await readRows(context, data, data.active_version);
  return plan
    ? { plan, archivedOn: archivedOn(data.updated_at, data.time_zone) }
    : null;
});
