"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { lessonInputSchema, maximumLessons } from "@/features/races/lessons";
import { getOnboardingContext } from "@/server/onboarding/context";
import type { ActionResult } from "./actions";

export type LessonActionResult = ActionResult | { status: "lesson-limit" };

function refresh(raceId: string) {
  revalidatePath(`/races/${raceId}`, "layout");
}

export async function addRaceLesson(
  input: unknown,
): Promise<LessonActionResult> {
  const parsed = lessonInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { raceId, kind, body } = parsed.data;
  const existing = await context.client
    .from("race_lessons")
    .select("id", { count: "exact", head: true })
    .eq("user_id", context.userId)
    .eq("race_id", raceId);
  if (existing.error) return { status: "error" };
  const count = existing.count ?? 0;
  if (count >= maximumLessons) return { status: "lesson-limit" };
  const inserted = await context.client.from("race_lessons").insert({
    race_id: raceId,
    user_id: context.userId,
    kind,
    body,
    position: count,
  });
  if (inserted.error) return { status: "error" };
  refresh(raceId);
  return { status: "saved" };
}

const deleteSchema = z.object({ raceId: z.uuid(), lessonId: z.uuid() });

export async function deleteRaceLesson(
  input: unknown,
): Promise<LessonActionResult> {
  const parsed = deleteSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { raceId, lessonId } = parsed.data;
  const removed = await context.client
    .from("race_lessons")
    .delete()
    .eq("user_id", context.userId)
    .eq("race_id", raceId)
    .eq("id", lessonId)
    .select("id");
  if (removed.error) return { status: "error" };
  if (!removed.data?.length) return { status: "missing" };
  refresh(raceId);
  return { status: "saved" };
}
