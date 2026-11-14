import "server-only";
import { z } from "zod";
import {
  raceDayCheckinSchema,
  type RaceDayCheckin,
} from "@/features/races/race-day";
import type { OnboardingContext } from "@/server/onboarding/context";

const checkinRowSchema = z.object({
  waypoint_id: z.uuid(),
  checked_at: z.string(),
});

export async function readRaceCheckins(
  context: OnboardingContext,
  raceId: string,
): Promise<RaceDayCheckin[]> {
  const { data, error } = await context.client
    .from("race_checkins")
    .select("waypoint_id, checked_at")
    .eq("user_id", context.userId)
    .eq("race_id", raceId);
  if (error) return [];
  return (data ?? []).flatMap((row) => {
    const parsed = checkinRowSchema.safeParse(row);
    if (!parsed.success) return [];
    const checkedAt = Date.parse(parsed.data.checked_at);
    return Number.isFinite(checkedAt)
      ? [{ waypointId: parsed.data.waypoint_id, checkedAt }]
      : [];
  });
}

export async function saveRaceCheckin(
  context: OnboardingContext,
  raceId: string,
  input: unknown,
): Promise<"saved" | "invalid" | "error"> {
  const parsed = raceDayCheckinSchema.safeParse(input);
  if (!parsed.success) return "invalid";
  const { error } = await context.client.from("race_checkins").upsert(
    {
      race_id: raceId,
      waypoint_id: parsed.data.waypointId,
      user_id: context.userId,
      checked_at: new Date(parsed.data.checkedAt).toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "race_id,waypoint_id" },
  );
  return error ? (error.code === "42501" ? "invalid" : "error") : "saved";
}
