import { toast } from "sonner";
import { reasonText } from "@/features/plans/review/proposal";
import type { ProposalActionResult } from "@/server/plans/actions";

export type DecisionFailures = Partial<
  Record<ProposalActionResult["status"], string>
>;

export type MoveMessages = { blocked: string; stale: string; pending: string };

export function reportDecision(
  result: ProposalActionResult,
  {
    id,
    success,
    failures,
    move,
  }: {
    id: string;
    success: string;
    failures: DecisionFailures;
    move?: MoveMessages;
  },
) {
  if (result.status === "applied" || result.status === "rejected") {
    toast.success(success, { id });
    return;
  }
  const text = !(result.status === "stale" || result.status === "invalid")
    ? failures[result.status]
    : !move
      ? reasonText(result.reason)
      : result.reason === "proposal_pending"
        ? move.pending
        : result.status === "invalid"
          ? move.blocked
          : move.stale;
  if (text) toast.error(text, { id });
}
