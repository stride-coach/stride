import "server-only";
import { z } from "zod";
import {
  groupLine,
  specialistAgents,
  staff,
  type SpecialistAgent,
} from "@/features/coach/staff";
import { monthStart, type StaffUsage } from "@/features/coach/team";
import type { OnboardingContext } from "@/server/onboarding/context";
import { displayTimeZone } from "@/features/app-shell/shell";

export async function readGroupLine(context: OnboardingContext) {
  try {
    const { data } = await context.client
      .from("athlete_profiles")
      .select("first_name")
      .eq("user_id", context.userId)
      .maybeSingle();
    return groupLine(staff, data?.first_name?.trim() || null);
  } catch {
    return groupLine(staff, null);
  }
}

const consultRowSchema = z.object({
  coach_session_id: z.string(),
  body: z.object({ agent: z.string(), thread: z.string() }).loose(),
});

export async function loadStaffUsage(
  context: OnboardingContext,
  now: Date,
): Promise<StaffUsage> {
  const since = monthStart(now, displayTimeZone).toISOString();
  const [threads, consults] = await Promise.all([
    context.client
      .from("coach_sessions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("kind", "topic")
      .not("title", "is", null)
      .gte("created_at", since),
    context.client
      .from("coach_thread_items")
      .select("coach_session_id, body")
      .eq("user_id", context.userId)
      .eq("kind", "consult_request")
      .gte("created_at", since)
      .limit(1000),
  ]);
  const rows = z
    .array(consultRowSchema)
    .catch([])
    .parse(consults.data ?? []);
  const opinions = Object.fromEntries(
    specialistAgents.map((agent) => [
      agent,
      new Set(
        rows
          .filter((row) => row.body.agent === agent)
          .map((row) => `${row.coach_session_id}:${row.body.thread}`),
      ).size,
    ]),
  ) as Record<SpecialistAgent, number>;
  return {
    conversations: threads.error ? 0 : (threads.count ?? 0),
    opinions,
  };
}
