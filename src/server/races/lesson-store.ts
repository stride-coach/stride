import "server-only";
import {
  lessonColumns,
  lessonRowSchema,
  type RaceLesson,
} from "@/features/races/lessons";
import type { OnboardingContext } from "@/server/onboarding/context";

export async function readRaceLessons(
  context: OnboardingContext,
  raceIds: string[],
): Promise<Record<string, RaceLesson[]>> {
  if (raceIds.length === 0) return {};
  const { data, error } = await context.client
    .from("race_lessons")
    .select(lessonColumns)
    .eq("user_id", context.userId)
    .in("race_id", raceIds)
    .order("position", { ascending: true });
  if (error) return {};
  const lessons: Record<string, RaceLesson[]> = {};
  for (const row of data ?? []) {
    const parsed = lessonRowSchema.safeParse(row);
    if (!parsed.success) continue;
    (lessons[parsed.data.raceId] ??= []).push(parsed.data.lesson);
  }
  return lessons;
}
