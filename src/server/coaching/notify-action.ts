"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOnboardingContext } from "@/server/onboarding/context";

const notifySchema = z.strictObject({
  threadId: z.uuid(),
  enabled: z.boolean(),
});

export type NotifyWhenReadyResult = {
  status: "saved" | "not-running" | "invalid" | "session-expired" | "error";
};

export async function setNotifyWhenReady(
  input: unknown,
): Promise<NotifyWhenReadyResult> {
  const parsed = notifySchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { data, error } = await context.client
    .from("coach_sessions")
    .update({ notify_when_ready: parsed.data.enabled })
    .eq("user_id", context.userId)
    .eq("id", parsed.data.threadId)
    .eq("status", "running")
    .select("id");
  if (error) return { status: "error" };
  if (!data?.length) return { status: "not-running" };
  revalidatePath("/coach", "layout");
  return { status: "saved" };
}
