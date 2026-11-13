"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  customScenarioInputSchema,
  maximumCustomScenarios,
} from "@/features/races/custom-scenarios";
import { getOnboardingContext } from "@/server/onboarding/context";
import { saveRacePlan, type ActionResult } from "./actions";

export type ScenarioActionResult = ActionResult | { status: "limit" };

function refresh(raceId: string) {
  revalidatePath(`/races/${raceId}`, "layout");
}

export async function createRaceScenario(
  input: unknown,
): Promise<ScenarioActionResult> {
  const parsed = customScenarioInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const values = parsed.data;
  const existing = await context.client
    .from("race_scenarios")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .eq("race_id", values.raceId);
  if (existing.error) return { status: "error" };
  const count = existing.count ?? 0;
  if (count >= maximumCustomScenarios) return { status: "limit" };
  const inserted = await context.client.from("race_scenarios").insert({
    race_id: values.raceId,
    user_id: context.userId,
    name: values.name,
    target_seconds: values.targetSeconds,
    walk_grade_percent: values.walkGradePercent,
    aid_stop_seconds: values.aidStopSeconds,
    carbs_per_hour_g: values.carbsPerHourG,
    position: count,
  });
  if (inserted.error) return { status: "error" };
  refresh(values.raceId);
  return { status: "saved" };
}

const deleteSchema = z.object({ raceId: z.uuid(), scenarioId: z.uuid() });

export async function deleteRaceScenario(
  input: unknown,
): Promise<ScenarioActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { raceId, scenarioId } = parsed.data;
  const removed = await context.client
    .from("race_scenarios")
    .delete()
    .eq("user_id", context.userId)
    .eq("race_id", raceId)
    .eq("id", scenarioId)
    .select("id");
  if (removed.error) return { status: "error" };
  if (!removed.data?.length) return { status: "missing" };
  const cleared = await context.client
    .from("race_plans")
    .update({ plan_b: null })
    .eq("user_id", context.userId)
    .eq("race_id", raceId)
    .eq("plan_b", `custom:${scenarioId}`);
  if (cleared.error) return { status: "error" };
  refresh(raceId);
  return { status: "saved" };
}

const planBSchema = z.object({
  raceId: z.uuid(),
  revision: z.number().int().positive().nullable(),
  planB: z.string().nullable(),
});

export async function setRacePlanB(
  input: unknown,
): Promise<ScenarioActionResult> {
  const parsed = planBSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  return saveRacePlan(parsed.data.raceId, parsed.data.revision, {
    planB: parsed.data.planB,
  });
}
