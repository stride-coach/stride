import "server-only";
import { localToday } from "@/features/plans/constraints";
import { applyOperations } from "@/features/plans/operations/apply";
import type { PlanOperation } from "@/features/plans/operations/operations";
import { moveDays } from "@/features/today/move";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readSessionMatches } from "@/server/plans/matches";
import { readActivePlan } from "@/server/plans/stored";

export type SessionMoveSubmission =
  | { ok: true; proposalId: string }
  | { ok: false; reason: "no_active_plan" | "not_allowed" | "stale_version" };

export async function submitSessionMove(
  context: OnboardingContext,
  sessionKey: string,
  toDate: string,
): Promise<SessionMoveSubmission> {
  const stored = await readActivePlan(context);
  if (!stored) return { ok: false, reason: "no_active_plan" };
  const today = localToday(stored.state.plan.timeZone);
  const day = moveDays(stored.state, sessionKey, today).find(
    (item) => item.date === toDate,
  );
  const session = stored.state.sessions.find(
    (item) => item.sessionKey === sessionKey,
  );
  if (!day || !session) return { ok: false, reason: "not_allowed" };
  const operations: PlanOperation[] = [
    { op: "move_session", sessionKey, toDate },
  ];
  const matches = await readSessionMatches(context, stored.planId);
  const result = applyOperations(stored.state, operations, {
    today,
    matchedSessionKeys: new Set(
      matches
        .filter((match) => match.status !== "dismissed")
        .map((match) => match.sessionKey),
    ),
  });
  if (!result.ok) return { ok: false, reason: "not_allowed" };
  const { data, error } = await context.client.rpc("submit_plan_proposal", {
    p_scope: "session",
    p_origin: "schedule",
    p_title: `${session.title} déplacée à ${day.label}`,
    p_summary: `Tu as déplacé « ${session.title} » d’aujourd’hui à ${day.label}.`,
    p_rationale: "Déplacement demandé par l’athlète depuis Aujourd’hui.",
    p_operations: JSON.parse(JSON.stringify(operations)),
    p_preview: JSON.parse(JSON.stringify(result.changeset)),
    p_plan_id: stored.planId,
    p_base_version: stored.activeVersion,
    p_target_keys: [sessionKey],
  });
  if (error?.message === "stale_version")
    return { ok: false, reason: "stale_version" };
  if (error || !data) throw new Error("Unable to submit the session move");
  return { ok: true, proposalId: data.id };
}
