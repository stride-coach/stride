"use server";

import { revalidatePath } from "next/cache";
import { localToday } from "@/features/app-shell/shell";
import { recoveryPath } from "@/features/progress/health";
import { checkinFieldSchema } from "@/features/progress/recovery";
import { getOnboardingContext } from "@/server/onboarding/context";

export type CheckinResult =
  | { status: "saved"; updatedAt: string | null }
  | { status: "invalid" | "error" | "session-expired" };

async function writeCheckin(input: unknown): Promise<CheckinResult> {
  const parsed = checkinFieldSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { data, error } = await context.client
    .from("athlete_wellness_checkins")
    .upsert(
      {
        user_id: context.userId,
        checkin_date: localToday(new Date()),
        ...(parsed.data.field === "legs" && { legs: parsed.data.value }),
        ...(parsed.data.field === "sleepFeel" && {
          sleep_feel: parsed.data.value,
        }),
        ...(parsed.data.field === "soreness" && {
          soreness: parsed.data.value,
        }),
        ...(parsed.data.field === "stress" && { stress: parsed.data.value }),
      },
      { onConflict: "user_id,checkin_date" },
    )
    .select("updated_at")
    .single();
  if (error) return { status: "error" };
  return { status: "saved", updatedAt: data?.updated_at ?? null };
}

function revalidateCheckin() {
  revalidatePath(recoveryPath);
  revalidatePath("/today");
}

export async function saveCheckin(input: unknown): Promise<CheckinResult> {
  const result = await writeCheckin(input);
  if (result.status === "saved") revalidateCheckin();
  return result;
}

export async function saveDailyCheckinAnswer(
  input: unknown,
): Promise<CheckinResult> {
  return writeCheckin(input);
}

export async function closeDailyCheckin() {
  revalidateCheckin();
}
