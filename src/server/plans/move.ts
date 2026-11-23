import "server-only";
import { localToday } from "@/features/plans/constraints";
import { moveOperations } from "@/features/plans/schedule/move-check";
import {
  moveDayLabel,
  weekMoveDays,
} from "@/features/plans/schedule/week-moves";
import type { OnboardingContext } from "@/server/onboarding/context";
import { planChangeset } from "@/server/plans/apply";
import { readSessionMatches } from "@/server/plans/matches";
import { readReadyProposals } from "@/server/plans/proposals";
import { readActivePlan } from "@/server/plans/stored";

export type SessionMoveSubmission =
  { ok: true; proposalId: string } | { ok: false; reason: string };

export async function submitSessionMove(
  context: OnboardingContext,
  sessionKey: string,
  toDate: string,
): Promise<SessionMoveSubmission> {
  const stored = await readActivePlan(context);
  if (!stored) return { ok: false, reason: "no_active_plan" };
  const matches = await readSessionMatches(context, stored.planId);
  const day = weekMoveDays(
    stored.state,
    sessionKey,
    localToday(stored.state.plan.timeZone),
    new Set(
      matches
        .filter((match) => match.status !== "dismissed")
        .map((match) => match.sessionKey),
    ),
  ).find((item) => item.date === toDate);
  const session = stored.state.sessions.find(
    (item) => item.sessionKey === sessionKey,
  );
  if (!day || !session) return { ok: false, reason: "not_allowed" };
  const proposals = await readReadyProposals(context, stored.planId);
  if (
    proposals.some((proposal) =>
      proposal.targetKeys.some(
        (target) => target.slice(target.indexOf(":") + 1) === sessionKey,
      ),
    )
  )
    return { ok: false, reason: "proposal_pending" };
  const changeset = await planChangeset(context, {
    scope: "session",
    operations: moveOperations(sessionKey, day),
    plan_id: stored.planId,
    base_version: stored.activeVersion,
  });
  if (typeof changeset === "string") return { ok: false, reason: changeset };
  const { data, error } = await context.client.rpc(
    "submit_athlete_session_move",
    {
      p_plan_id: stored.planId,
      p_base_version: stored.activeVersion,
      p_session_key: sessionKey,
      p_to_date: toDate,
      p_title: `Séance déplacée : ${session.title}`,
      p_summary: `Tu as déplacé « ${session.title} » de ${moveDayLabel(session.scheduledOn)} à ${day.label}.`,
      p_preview: JSON.parse(JSON.stringify(changeset)),
      ...(day.restKey ? { p_rest_key: day.restKey } : {}),
    },
  );
  if (error?.message === "stale_version")
    return { ok: false, reason: "stale_version" };
  if (error || !data) throw new Error("Unable to submit the session move");
  return { ok: true, proposalId: data.id };
}
