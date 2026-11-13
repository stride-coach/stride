"use server";

import { revalidatePath } from "next/cache";
import { editionName, redoInputSchema } from "@/features/races/redo";
import { getOnboardingContext } from "@/server/onboarding/context";

export type RedoResult =
  | { status: "saved"; id: string; name: string }
  | {
      status:
        "invalid" | "missing" | "race-limit" | "error" | "session-expired";
    };

export async function redoRace(input: unknown): Promise<RedoResult> {
  const parsed = redoInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const values = parsed.data;
  const source = await context.client
    .from("athlete_races")
    .select("name")
    .eq("user_id", context.userId)
    .eq("id", values.sourceId)
    .maybeSingle();
  if (source.error) return { status: "error" };
  if (!source.data?.name) return { status: "missing" };
  const name = editionName(source.data.name, values.date.slice(0, 4));
  const { data, error } = await context.client.rpc("redo_race", {
    p_source: values.sourceId,
    p_name: name,
    p_date: values.date,
    p_priority: values.priority,
    p_target: values.targetSeconds ?? undefined,
    p_course: values.course,
    p_nutrition: values.nutrition,
    p_gear: values.gear,
  });
  if (error)
    return {
      status:
        error.code === "PT409"
          ? "race-limit"
          : error.code === "PT404"
            ? "missing"
            : "error",
    };
  revalidatePath("/races", "layout");
  return { status: "saved", id: data, name };
}
