export type PlanEffectProposal = {
  id: string;
  status: string;
  title: string;
  summary: string | null;
};

export type PlanEffect =
  | { state: "working" }
  | { state: "question" }
  | {
      state: "ready";
      proposal: { id: string; title: string; summary: string | null };
    }
  | { state: "decided"; applied: boolean }
  | { state: "unchanged" }
  | { state: "failed" };

const finished = ["idle"];
const broken = ["budget_reached", "timed_out", "failed", "terminated"];

export function planEffect({
  sessionStatus,
  proposal,
}: {
  sessionStatus: string | null;
  proposal: PlanEffectProposal | null;
}): PlanEffect {
  if (proposal?.status === "ready")
    return {
      state: "ready",
      proposal: {
        id: proposal.id,
        title: proposal.title,
        summary: proposal.summary,
      },
    };
  if (proposal && ["accepted", "applied"].includes(proposal.status))
    return { state: "decided", applied: true };
  if (proposal && proposal.status === "rejected")
    return { state: "decided", applied: false };
  if (sessionStatus === "awaiting_athlete") return { state: "question" };
  if (sessionStatus !== null && broken.includes(sessionStatus))
    return { state: "failed" };
  if (sessionStatus !== null && finished.includes(sessionStatus))
    return { state: "unchanged" };
  return { state: "working" };
}

export function planEffectRequest({
  name,
  priority,
  date,
}: {
  name: string;
  priority: string;
  date: string | null;
}) {
  return [
    `J’ajoute ${name}, course ${priority}${date ? `, le ${date}` : ""}.`,
    "Regarde où elle tombe dans mon plan et propose-moi les changements à relire avant de les appliquer.",
  ].join(" ");
}
