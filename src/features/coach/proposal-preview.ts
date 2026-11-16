import type { PlanSession, PlanState } from "@/features/plans/model/plan";
import { applyOperations } from "@/features/plans/operations/apply";
import { planOperationsSchema } from "@/features/plans/operations/operations";
import { sessionMeta } from "@/features/plans/review/review";
import { sessionBlocks } from "@/features/plans/view/plan-view";
import type { ProposalPreview } from "./proposal-card";

export function proposalPreview(
  operations: unknown,
  input: { state: PlanState | null; applied: boolean; today: string },
): ProposalPreview | null {
  const parsed = planOperationsSchema.safeParse(operations);
  if (!parsed.success || !input.state || parsed.data.length === 0) return null;
  const keys = new Set(
    parsed.data.map((operation) =>
      "sessionKey" in operation ? operation.sessionKey : null,
    ),
  );
  const [key] = keys;
  if (keys.size !== 1 || !key) return null;
  const current = input.state.sessions.find(
    (session) => session.sessionKey === key,
  );
  if (!current) return null;
  let after: PlanSession | null = current;
  if (!input.applied) {
    const outcome = applyOperations(input.state, parsed.data, {
      today: input.today,
      matchedSessionKeys: new Set(),
    });
    after = outcome.ok
      ? (outcome.state.sessions.find((session) => session.sessionKey === key) ??
        null)
      : null;
  }
  return {
    heading: current.title,
    meta: after ? sessionMeta(after) : null,
    blocks: sessionBlocks(after ?? current),
    keep: input.applied ? null : current.title,
    sessionDate: current.scheduledOn,
  };
}
