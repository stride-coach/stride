"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOnboardingContext } from "@/server/onboarding/context";
import type { ActionResult } from "./actions";

const adoptSchema = z.object({ raceId: z.uuid(), observedOn: z.iso.date() });

export async function adoptRaceWeather(input: unknown): Promise<ActionResult> {
  const parsed = adoptSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { data, error } = await context.client
    .from("race_weather_snapshots")
    .update({ adopted: true })
    .eq("user_id", context.userId)
    .eq("race_id", parsed.data.raceId)
    .eq("observed_on", parsed.data.observedOn)
    .select("observed_on");
  if (error) return { status: "error" };
  if (!data?.length) return { status: "missing" };
  revalidatePath(`/races/${parsed.data.raceId}`, "layout");
  return { status: "saved" };
}
