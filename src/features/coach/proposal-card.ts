import type { SessionBlock } from "@/components/stride/session-blocks";
import { timeLabel } from "./conversations";

export type ProposalCardState =
  | "pending"
  | "applying"
  | "accepted"
  | "rejected"
  | "modified"
  | "expired"
  | "reverted"
  | "closed";

export type ProposalFacts = {
  status: string;
  scope: string;
  decisions: readonly { decision: string; createdAt: string }[];
  appliedVersion: number | null;
  activeVersion: number | null;
  sessionDate: string | null;
  sessionMatched: boolean;
  successor: {
    status: string;
    title: string;
    decidedAt: string | null;
  } | null;
};

export type ProposalDecision = {
  state: ProposalCardState;
  decidedAt: string | null;
  canDecide: boolean;
  canUndo: boolean;
};

export type ProposalPreview = {
  heading: string;
  meta: string | null;
  blocks: SessionBlock[];
  keep: string | null;
  sessionDate: string;
};

export type ProposalCard = {
  decision: ProposalDecision;
  preview: ProposalPreview | null;
  scope: string;
  successorTitle: string | null;
};

function decisionAt(facts: ProposalFacts, kinds: readonly string[]) {
  return (
    facts.decisions.findLast((decision) => kinds.includes(decision.decision))
      ?.createdAt ?? null
  );
}

const closed = (
  state: ProposalCardState,
  decidedAt: string | null = null,
): ProposalDecision => ({
  state,
  decidedAt,
  canDecide: false,
  canUndo: false,
});

export function proposalDecision(
  facts: ProposalFacts,
  today: string,
): ProposalDecision {
  const passed = facts.sessionDate !== null && facts.sessionDate < today;
  switch (facts.status) {
    case "draft":
    case "ready":
      return passed
        ? closed("expired")
        : {
            state: "pending",
            decidedAt: null,
            canDecide: facts.status === "ready",
            canUndo: false,
          };
    case "expired":
      return closed("expired");
    case "accepted":
      return closed("applying", decisionAt(facts, ["accepted"]));
    case "applied":
      return {
        state: "accepted",
        decidedAt:
          decisionAt(facts, ["accepted"]) ?? decisionAt(facts, ["applied"]),
        canDecide: false,
        canUndo:
          facts.scope === "session" &&
          facts.appliedVersion !== null &&
          facts.activeVersion === facts.appliedVersion &&
          !passed &&
          !facts.sessionMatched,
      };
    case "rejected":
      return closed("rejected", decisionAt(facts, ["rejected"]));
    case "reverted":
      return closed("reverted", decisionAt(facts, ["reverted"]));
    case "superseded":
      return facts.successor?.status === "applied"
        ? closed("modified", facts.successor.decidedAt)
        : closed("closed");
    default:
      return closed("closed");
  }
}

export type ProposalStatusLine = {
  label: string;
  tone: "ok" | "muted";
  outcome: string | null;
};

const stateLabels: Record<Exclude<ProposalCardState, "pending">, string> = {
  applying: "Application en cours",
  accepted: "Acceptée",
  rejected: "Refusée",
  modified: "Modifiée",
  expired: "Expirée",
  reverted: "Annulée",
  closed: "Plus applicable",
};

function sentence(text: string) {
  const trimmed = text.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function proposalStatusLine(
  decision: Pick<ProposalDecision, "state" | "decidedAt">,
  context: {
    scope: string;
    preview: Pick<ProposalPreview, "keep"> | null;
    successorTitle: string | null;
  },
  timeZone: string,
): ProposalStatusLine | null {
  if (decision.state === "pending") return null;
  const session = context.scope === "session" && context.preview !== null;
  const label =
    decision.decidedAt && decision.state !== "expired"
      ? `${stateLabels[decision.state]} · ${timeLabel(decision.decidedAt, timeZone)}`
      : stateLabels[decision.state];
  switch (decision.state) {
    case "accepted":
      return {
        label,
        tone: "ok",
        outcome: session
          ? "Ta séance est mise à jour."
          : "Ton plan est mis à jour.",
      };
    case "rejected":
      return {
        label,
        tone: "muted",
        outcome: context.preview?.keep
          ? `Tu gardes ${context.preview.keep}.`
          : session
            ? "Tu gardes ta séance."
            : "Ton plan ne change pas.",
      };
    case "modified":
      return {
        label,
        tone: "ok",
        outcome: context.successorTitle
          ? sentence(context.successorTitle)
          : null,
      };
    case "expired":
      return {
        label,
        tone: "muted",
        outcome: "La séance est passée sans réponse.",
      };
    case "reverted":
      return {
        label,
        tone: "muted",
        outcome: session
          ? "Ta séance revient comme avant."
          : "Ton plan revient comme avant.",
      };
    case "applying":
      return { label, tone: "ok", outcome: null };
    case "closed":
      return { label, tone: "muted", outcome: null };
  }
}
