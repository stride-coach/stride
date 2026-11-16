import type { AttachmentKind, SentAttachment } from "./attachments";
import type { ThreadItem } from "./items";
import type { StreamEvent } from "./stream";

export type QuickAskContextKind = AttachmentKind | null;

const suggestions: Record<
  AttachmentKind | "none",
  readonly [string, string, string]
> = {
  session: [
    "Pourquoi cette séance aujourd’hui ?",
    "Je n’ai que 40 minutes",
    "Je préfère courir à midi",
  ],
  activity: [
    "Comment s’est passée cette sortie ?",
    "Ai-je couru trop vite ?",
    "Que retenir de cette activité ?",
  ],
  race: [
    "Comment aborder cette course ?",
    "Quelle allure viser au départ ?",
    "Que dois-je ajuster d’ici la course ?",
  ],
  none: [
    "Que faire aujourd’hui ?",
    "Comment va ma forme en ce moment ?",
    "Où en est ma préparation ?",
  ],
};

const headings: Record<AttachmentKind | "none", string> = {
  session: "Souvent demandé sur cette séance",
  activity: "Souvent demandé sur cette activité",
  race: "Souvent demandé sur cette course",
  none: "Souvent demandé",
};

const attachedNotes: Record<AttachmentKind, string> = {
  session: "La séance affichée est jointe d’office.",
  activity: "L’activité affichée est jointe d’office.",
  race: "La course affichée est jointe d’office.",
};

export function quickAskSuggestions(kind: QuickAskContextKind) {
  return suggestions[kind ?? "none"];
}

export function quickAskHeading(kind: QuickAskContextKind) {
  return headings[kind ?? "none"];
}

export function quickAskNote(kind: QuickAskContextKind) {
  const kept = "L’échange est gardé dans le fil principal.";
  return kind ? `${attachedNotes[kind]} ${kept}` : kept;
}

const screens: Record<string, string> = {
  today: "Aujourd’hui",
  plan: "Plan",
  activities: "Activités",
  health: "Santé",
  races: "Courses",
  notifications: "Notifications",
};

export function quickAskScreen(pathname: string) {
  const segment = pathname.split("/")[1] ?? "";
  return screens[segment] ?? "cet écran";
}

export function opensQuickAsk(pathname: string) {
  return !/^\/coach(?:\/|$)/.test(pathname);
}

export type QuickAskExchange = {
  items: readonly ThreadItem[];
  pending: { text: string; attachments: SentAttachment[] } | null;
  threadId: string | null;
  pendingQuestion: string | null;
  composingSince: string | null;
  finished: boolean;
};

export const emptyExchange: QuickAskExchange = {
  items: [],
  pending: null,
  threadId: null,
  pendingQuestion: null,
  composingSince: null,
  finished: false,
};

export function hasExchange(exchange: QuickAskExchange) {
  return exchange.items.length > 0 || exchange.pending !== null;
}

export function beginExchange(
  exchange: QuickAskExchange,
  pending: NonNullable<QuickAskExchange["pending"]>,
): QuickAskExchange {
  return { ...exchange, pending, composingSince: null, finished: false };
}

export function endSend(exchange: QuickAskExchange): QuickAskExchange {
  return { ...exchange, pending: null };
}

export function applyStreamEvent(
  exchange: QuickAskExchange,
  event: StreamEvent,
): QuickAskExchange {
  switch (event.type) {
    case "session":
      return { ...exchange, threadId: event.threadId };
    case "item": {
      const settled =
        event.item.kind === "athlete" || event.item.kind === "answer";
      return {
        ...exchange,
        items: [...exchange.items, event.item],
        pending: settled ? null : exchange.pending,
        pendingQuestion:
          event.item.kind === "answer" ? null : exchange.pendingQuestion,
      };
    }
    case "question":
      return { ...exchange, pendingQuestion: event.toolUseId };
    case "composing":
      return { ...exchange, composingSince: event.since };
    case "done":
      return {
        ...exchange,
        finished: true,
        composingSince: null,
        pendingQuestion:
          event.status === "awaiting_athlete" ? exchange.pendingQuestion : null,
      };
    case "error":
      return exchange;
  }
}

export function reopenedExchange(
  exchange: QuickAskExchange,
  working: boolean,
): QuickAskExchange {
  return working ? exchange : emptyExchange;
}
