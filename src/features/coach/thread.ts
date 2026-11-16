import type { SentAttachment } from "./attachments";
import type { DataCard, LinkDestination } from "./blocks";
import type { ProposalCard } from "./proposal-card";
import type {
  ItemOf,
  ProposalOpinion,
  ProposalScope,
  ThreadItem,
} from "./items";
import type { SpecialistAgent, StaffAgent, StaffMember } from "./staff";

export type ProposalCardStatus =
  "pending" | "applying" | "applied" | "rejected" | "closed";

export type QuestionState = "pending" | "answered" | "closed";

export type StaffBlock = { itemId?: string } & (
  | { type: "text"; text: string }
  | {
      type: "question";
      toolUseId: string;
      question: string;
      options: string[];
      askedFor: StaffAgent;
      state: QuestionState;
      answer: string | null;
      answeredAt: string | null;
    }
  | {
      type: "proposal";
      proposalId: string;
      scope: ProposalScope;
      raceId: string | null;
      title: string;
      summary: string | null;
      opinions: ProposalOpinion[];
      status: ProposalCardStatus;
      card: ProposalCard | null;
    }
  | { type: "error"; text: string; interrupted: boolean }
  | { type: "data_card"; card: DataCard }
  | { type: "choices"; choices: string[]; open: boolean }
  | { type: "links"; links: LinkDestination[] }
);

export type ThreadEntry =
  | {
      type: "athlete";
      key: string;
      itemId?: string;
      at: string;
      text: string;
      consult: StaffAgent | null;
      replyTo: StaffAgent | null;
      attachments: SentAttachment[];
    }
  | {
      type: "staff";
      key: string;
      at: string;
      agent: StaffAgent;
      blocks: StaffBlock[];
      reads: string[];
      lookedAt: string[];
    }
  | {
      type: "typing";
      key: string;
      at: string;
      agent: StaffAgent;
      read: string | null;
      preview: string | null;
    }
  | {
      type: "topic_summary";
      key: string;
      at: string;
      item: ItemOf<"topic_summary">;
    };

export type ThreadInput = {
  items: readonly ThreadItem[];
  live: boolean;
  pendingToolUseId: string | null;
  proposalStatuses?: Readonly<Record<string, string>>;
  proposalCards?: Readonly<Record<string, ProposalCard>>;
};

export function proposalCardStatus(status: string | undefined) {
  switch (status) {
    case undefined:
    case "draft":
    case "ready":
      return "pending";
    case "accepted":
      return "applying";
    case "applied":
      return "applied";
    case "rejected":
      return "rejected";
    default:
      return "closed";
  }
}

type Handoff = {
  agent: StaffAgent;
  at: string;
  brief: string | null;
  reads: string[];
  done: boolean;
  spoke: boolean;
};

export function buildThread(input: ThreadInput): ThreadEntry[] {
  const answers = new Map(
    input.items.flatMap((item) =>
      item.kind === "answer" ? [[item.toolUseId, item] as const] : [],
    ),
  );
  const askedFor = new Map(
    input.items.flatMap((item) =>
      item.kind === "question"
        ? [[item.toolUseId, item.askedFor] as const]
        : [],
    ),
  );
  const lastAthlete = input.items.findLastIndex(
    (item) => item.kind === "athlete" || item.kind === "answer",
  );
  const entries: ThreadEntry[] = [];
  let current: Extract<ThreadEntry, { type: "staff" }> | null = null;
  let handoffs = new Map<string, Handoff>();
  let turnReads: string[] = [];

  function speak(agent: StaffAgent, at: string, index: number) {
    if (!current || current.agent !== agent) {
      current = {
        type: "staff",
        key: `staff-${index}`,
        at,
        agent,
        blocks: [],
        reads: [],
        lookedAt: [...turnReads],
      };
      entries.push(current);
    }
    if (agent !== "coach")
      for (const handoff of handoffs.values())
        if (handoff.agent === agent)
          for (const read of handoff.reads.splice(0))
            if (!current.reads.includes(read)) current.reads.push(read);
    return current;
  }

  function handoffOf(thread: string, agent: StaffAgent, at: string) {
    const handoff = handoffs.get(thread) ?? {
      agent,
      at,
      brief: null,
      reads: [],
      done: false,
      spoke: false,
    };
    handoffs.set(thread, handoff);
    return handoff;
  }

  input.items.forEach((item, index) => {
    switch (item.kind) {
      case "athlete":
      case "answer": {
        current = null;
        turnReads = [];
        if (item.kind === "athlete") handoffs = new Map();
        const target =
          item.kind === "answer"
            ? (askedFor.get(item.toolUseId) ?? null)
            : null;
        entries.push({
          type: "athlete",
          key: `athlete-${index}`,
          itemId: item.id,
          at: item.at,
          text: item.text,
          consult: item.kind === "athlete" ? item.consult : null,
          replyTo: target === "coach" ? null : target,
          attachments: item.kind === "athlete" ? item.attachments : [],
        });
        return;
      }
      case "coach":
        if (item.text.trim())
          speak("coach", item.at, index).blocks.push({
            type: "text",
            itemId: item.id,
            text: item.text,
          });
        return;
      case "consult_request": {
        const handoff = handoffOf(item.thread, item.agent, item.at);
        handoff.done = false;
        handoff.spoke = false;
        handoff.brief = item.text;
        return;
      }
      case "staff_message": {
        const handoff = handoffOf(item.thread, item.agent, item.at);
        handoff.done = true;
        handoff.spoke = true;
        speak(item.agent, item.at, index).blocks.push({
          type: "text",
          itemId: item.id,
          text: item.text,
        });
        return;
      }
      case "read":
        if (!turnReads.includes(item.label)) turnReads.push(item.label);
        if (current && !current.lookedAt.includes(item.label))
          current.lookedAt.push(item.label);
        if (item.agent !== "coach") {
          const handoff = handoffOf(item.thread, item.agent, item.at);
          if (!handoff.reads.includes(item.label))
            handoff.reads.push(item.label);
        }
        return;
      case "consult_note":
        return;
      case "consult_reply": {
        const handoff = handoffOf(item.thread, item.agent, item.at);
        handoff.done = true;
        if (!handoff.spoke && item.text.trim())
          speak(item.agent, item.at, index).blocks.push({
            type: "text",
            itemId: item.id,
            text: item.text,
          });
        return;
      }
      case "consult_end":
        handoffOf(item.thread, item.agent, item.at).done = true;
        return;
      case "question": {
        const answer = answers.get(item.toolUseId) ?? null;
        speak(item.askedFor, item.at, index).blocks.push({
          type: "question",
          itemId: item.id,
          toolUseId: item.toolUseId,
          question: item.question,
          options: item.options,
          askedFor: item.askedFor,
          state: answer
            ? "answered"
            : item.toolUseId === input.pendingToolUseId
              ? "pending"
              : "closed",
          answer: answer?.text ?? null,
          answeredAt: answer?.at ?? null,
        });
        return;
      }
      case "proposal":
        speak(item.agent ?? "coach", item.at, index).blocks.push({
          type: "proposal",
          itemId: item.id,
          proposalId: item.proposalId,
          scope: item.scope,
          raceId: item.raceId ?? null,
          title: item.title,
          summary: item.summary,
          opinions: item.opinions,
          status: proposalCardStatus(input.proposalStatuses?.[item.proposalId]),
          card: input.proposalCards?.[item.proposalId] ?? null,
        });
        return;
      case "error":
        speak("coach", item.at, index).blocks.push({
          type: "error",
          itemId: item.id,
          text: item.text,
          interrupted: item.code !== "budget_reached",
        });
        return;
      case "blocks": {
        const staffEntry = speak(item.agent, item.at, index);
        if (item.card)
          staffEntry.blocks.push({
            type: "data_card",
            itemId: item.id,
            card: item.card,
          });
        if (item.choices.length)
          staffEntry.blocks.push({
            type: "choices",
            itemId: item.id,
            choices: item.choices,
            open: index > lastAthlete && !input.live && !input.pendingToolUseId,
          });
        if (item.links.length)
          staffEntry.blocks.push({
            type: "links",
            itemId: item.id,
            links: item.links,
          });
        return;
      }
      case "topic_summary":
        current = null;
        entries.push({
          type: "topic_summary",
          key: `topic-${index}`,
          at: item.at,
          item,
        });
        return;
    }
  });

  if (input.live && !input.pendingToolUseId)
    for (const [thread, handoff] of handoffs)
      if (!handoff.done)
        entries.push({
          type: "typing",
          key: `typing-${thread}`,
          at: handoff.at,
          agent: handoff.agent,
          read: handoff.reads.at(-1) ?? null,
          preview: handoff.brief ? previewText(handoff.brief) : null,
        });
  return entries;
}

export type RetryableMessage = {
  text: string;
  consult: SpecialistAgent | null;
  attachments: SentAttachment[];
};

export function retryableMessage(
  items: readonly ThreadItem[],
): RetryableMessage | null {
  const last = items.at(-1);
  if (last?.kind !== "error" || last.code === "budget_reached") return null;
  for (let index = items.length - 2; index >= 0; index -= 1) {
    const item = items[index];
    if (item.kind === "answer" || item.kind === "error") return null;
    if (item.kind === "athlete")
      return {
        text: item.text,
        consult: item.consult === "coach" ? null : item.consult,
        attachments: item.attachments,
      };
  }
  return null;
}

const concludingKinds: readonly ThreadItem["kind"][] = [
  "proposal",
  "topic_summary",
];

export function revisableQuestion(items: readonly ThreadItem[]) {
  const index = items.findLastIndex((item) => item.kind === "question");
  const question = items[index];
  if (question?.kind !== "question") return null;
  const later = items.slice(index + 1);
  if (
    !later.some(
      (item) => item.kind === "answer" && item.toolUseId === question.toolUseId,
    ) ||
    later.some((item) => concludingKinds.includes(item.kind))
  )
    return null;
  return question.toolUseId;
}

export function answerRevisionText(
  items: readonly ThreadItem[],
  toolUseId: string,
  text: string,
) {
  const question = items.find(
    (item) => item.kind === "question" && item.toolUseId === toolUseId,
  );
  const previous = items.findLast(
    (item) => item.kind === "answer" && item.toolUseId === toolUseId,
  );
  if (question?.kind !== "question" || previous?.kind !== "answer") return null;
  return `L’athlète change sa réponse à la question « ${question.question} ». Sa nouvelle réponse, « ${text} », remplace la précédente, « ${previous.text} ». Reprends ton avis avec cette réponse.`;
}

const previewLength = 90;

export function previewText(text: string) {
  const clean = text
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return null;
  const sentence = /^.*?[.!?](?=\s|$)/.exec(clean)?.[0] ?? clean;
  const cut =
    sentence.length > previewLength
      ? `${sentence.slice(0, previewLength).trimEnd()}…`
      : sentence;
  return cut.endsWith("…") ? cut : `${cut.replace(/[.!?]$/, "")}…`;
}

export function typingLabel(member: StaffMember, read: string | null) {
  return read
    ? `${member.subject} lit ${read.toLowerCase()}…`
    : `${member.subject} écrit…`;
}

export function questionAttribution(member: StaffMember) {
  return `Question ${member.of}`;
}

export function replyToLabel(member: StaffMember) {
  return `En réponse ${member.to}`;
}

const roleMention =
  /(@(?:Directeur sportif|Stratège de course|[\p{Lu}][\p{L}’'-]*))/u;

export function splitMentions(text: string) {
  return text.split(roleMention);
}
