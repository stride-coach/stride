"use server";

import { z } from "zod";
import { planEffect, type PlanEffect } from "@/features/races/plan-effect";
import { getOnboardingContext } from "@/server/onboarding/context";

const proposalSchema = z.object({
  id: z.string(),
  status: z.string(),
  title: z.string(),
  summary: z.string().nullable(),
});

export async function readRacePlanEffect(
  threadId: string,
): Promise<PlanEffect | null> {
  const id = z.uuid().safeParse(threadId);
  if (!id.success) return null;
  const context = await getOnboardingContext();
  if (!context) return null;
  const [session, proposals] = await Promise.all([
    context.client
      .from("coach_sessions")
      .select("status")
      .eq("id", id.data)
      .eq("user_id", context.userId)
      .maybeSingle(),
    context.client
      .from("plan_proposals")
      .select("id, status, title, summary")
      .eq("coach_session_id", id.data)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  if (session.error || proposals.error || !session.data) return null;
  const proposal = proposalSchema.safeParse(proposals.data?.[0]);
  return planEffect({
    sessionStatus: session.data.status,
    proposal: proposal.success ? proposal.data : null,
  });
}
