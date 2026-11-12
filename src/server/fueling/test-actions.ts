"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fuelingTestInputSchema } from "@/features/fueling/tests";
import { getOnboardingContext } from "@/server/onboarding/context";

export type FuelingTestResult = {
  status: "saved" | "deleted" | "invalid" | "error" | "session-expired";
};

function refresh() {
  revalidatePath("/races", "layout");
}

export async function addFuelingTest(
  input: unknown,
): Promise<FuelingTestResult> {
  const parsed = fuelingTestInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { error } = await context.client.from("fueling_tests").insert({
    user_id: context.userId,
    tested_on: parsed.data.testedOn,
    activity_id: parsed.data.activityId,
    carbs_per_hour_g: parsed.data.carbsPerHourG,
    duration_seconds: parsed.data.durationSeconds,
    tolerance: parsed.data.tolerance,
    note: parsed.data.note,
  });
  if (error) return { status: error.code === "23514" ? "invalid" : "error" };
  refresh();
  return { status: "saved" };
}

export async function deleteFuelingTest(
  id: unknown,
): Promise<FuelingTestResult> {
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { error } = await context.client
    .from("fueling_tests")
    .delete()
    .eq("user_id", context.userId)
    .eq("id", parsed.data);
  if (error) return { status: "error" };
  refresh();
  return { status: "deleted" };
}
