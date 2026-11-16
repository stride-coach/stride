import type { ThreadStatus } from "./conversations";
import type { ThreadItem } from "./items";

export const starterPrompts = [
  {
    key: "week",
    title: "Explique-moi ma semaine",
    subtitle: "Pourquoi ces séances, dans cet ordre",
  },
  {
    key: "fatigue",
    title: "Je me sens fatigué",
    subtitle: "Le staff regarde ta récupération",
  },
  {
    key: "race",
    title: "Parlons de ma course",
    subtitle: "Objectif, allures, ravitaillement",
  },
  {
    key: "missed",
    title: "Je n’ai pas pu courir hier",
    subtitle: "Le staff réorganise la semaine",
  },
] as const;

export type StarterPrompt = (typeof starterPrompts)[number];
export type SuggestedReplyState = {
  mode: "conversation" | "plan";
  busy: boolean;
  closed: boolean;
  questionPending: boolean;
  status: ThreadStatus;
  items: readonly ThreadItem[];
};

export function suggestedReplies(
  state: SuggestedReplyState,
): readonly string[] {
  if (state.busy || state.closed || state.questionPending) return [];
  if (state.status === "working" || state.status === "question") return [];
  if (state.status === "closed") return [];
  const turnStart = state.items.findLastIndex(
    (item) => item.kind === "athlete" || item.kind === "answer",
  );
  const turn = state.items.slice(turnStart + 1);
  if (turn.some((item) => item.kind === "error")) return [];
  return turn.findLast((item) => item.kind === "blocks")?.replies ?? [];
}
