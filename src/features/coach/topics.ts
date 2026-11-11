import { z } from "zod";
import {
  closedStates,
  listDateLabel,
  messagesLabel,
  sameDay,
  staffMessages,
  type SessionState,
} from "./conversations";
import type { ItemOf, ThreadItem } from "./items";
import type { Staff, StaffAgent } from "./staff";

export type CoachKind = "main" | "topic";

export const mainThreadTitle = "Fil principal";

export const topicTitleSchema = z.string().trim().min(1).max(120);

export const topicThemes = [
  "Préparer une course",
  "Une douleur qui dure",
  "Revoir mon plan",
  "Ma nutrition",
] as const;

export function mainSessionReusable(
  row: { status: SessionState; lastTurnAt: string | null; createdAt: string },
  now: Date,
  timeZone: string,
) {
  if (closedStates.includes(row.status)) return false;
  if (row.status === "running" || row.status === "awaiting_athlete")
    return true;
  return sameDay(row.lastTurnAt ?? row.createdAt, now.toISOString(), timeZone);
}

function speakerOf(
  item: ThreadItem,
  shown: ReadonlySet<ThreadItem>,
): StaffAgent | null {
  switch (item.kind) {
    case "coach":
      return item.text.trim() ? "coach" : null;
    case "staff_message":
      return item.agent;
    case "consult_reply":
      return shown.has(item) && item.text.trim() ? item.agent : null;
    case "question":
      return item.askedFor;
    case "proposal":
      return item.agent ?? "coach";
    default:
      return null;
  }
}

export function topicSpeakers(items: readonly ThreadItem[]) {
  const shown = staffMessages(items);
  const speakers: StaffAgent[] = [];
  for (const item of items) {
    const agent = speakerOf(item, shown);
    if (agent && !speakers.includes(agent)) speakers.push(agent);
  }
  return speakers;
}

export function topicLead(items: readonly ThreadItem[]): StaffAgent {
  return topicSpeakers(items).find((agent) => agent !== "coach") ?? "coach";
}

export function topicCompanions(items: readonly ThreadItem[]) {
  const lead = topicLead(items);
  return topicSpeakers(items).filter((agent) => agent !== lead);
}

export function topicMessageCount(items: readonly ThreadItem[]) {
  const shown = staffMessages(items);
  return items.filter(
    (item) =>
      item.kind === "athlete" ||
      item.kind === "answer" ||
      (item.kind !== "proposal" && speakerOf(item, shown) !== null),
  ).length;
}

const decidedStatuses = new Set(["accepted", "applied"]);

export function topicDecisions(
  items: readonly ThreadItem[],
  proposalStatuses: Readonly<Record<string, string>>,
) {
  const decisions: { proposalId: string; title: string }[] = [];
  for (const item of items)
    if (
      item.kind === "proposal" &&
      decidedStatuses.has(proposalStatuses[item.proposalId] ?? "") &&
      !decisions.some((decision) => decision.proposalId === item.proposalId)
    )
      decisions.push({ proposalId: item.proposalId, title: item.title });
  return decisions;
}

export function decisionsLabel(count: number) {
  if (count === 0) return "Aucune décision";
  return count === 1 ? "1 décision" : `${count} décisions`;
}

export type TopicSummary = {
  id: string;
  title: string;
  lead: StaffAgent;
  messages: number;
  decisions: number;
  lastActivityAt: string;
  closedAt: string | null;
  unread: boolean;
};

export type TopicSections = { open: TopicSummary[]; closed: TopicSummary[] };

export function topicSections(topics: readonly TopicSummary[]): TopicSections {
  const open = topics
    .filter((topic) => topic.closedAt === null)
    .sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  const closed = topics
    .filter((topic) => topic.closedAt !== null)
    .sort((a, b) => (b.closedAt ?? "").localeCompare(a.closedAt ?? ""));
  return { open, closed };
}

export function topicRowMeta(staff: Staff, topic: TopicSummary) {
  return [
    staff[topic.lead].name,
    messagesLabel(topic.messages),
    topic.closedAt !== null && topic.decisions > 0
      ? decisionsLabel(topic.decisions)
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

const shortDay = (timeZone: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone,
  });

export function topicRowDate(topic: TopicSummary, now: Date, timeZone: string) {
  if (topic.closedAt !== null)
    return `clos le ${shortDay(timeZone).format(new Date(topic.closedAt))}`;
  return listDateLabel(topic.lastActivityAt, now, timeZone);
}

export function topicRange(
  openedAt: string,
  closedAt: string,
  timeZone: string,
) {
  const format = shortDay(timeZone);
  const start = format.format(new Date(openedAt));
  const end = format.format(new Date(closedAt));
  return start === end ? start : `${start} → ${end}`;
}

export function topicOpenedLine(
  createdAt: string,
  messages: number,
  timeZone: string,
) {
  const opened = `Sujet ouvert le ${shortDay(timeZone).format(new Date(createdAt))}`;
  return messages > 0 ? `${opened} · ${messagesLabel(messages)}` : opened;
}

export function topicContext(
  title: string,
  race: { title: string; date: string | null } | null,
) {
  const lines = [
    `L’athlète a ouvert un sujet à part : « ${title} ».`,
    race
      ? `Course liée : ${race.title}${race.date ? `, le ${race.date}` : ""}.`
      : null,
    "Reste sur ce sujet. La séance du jour, les alertes et le reste du quotidien se traitent dans le fil principal.",
  ];
  return lines.filter(Boolean).join(" ");
}

export type SummaryCard = {
  topicId: string;
  heading: string;
  range: string;
  lead: StaffAgent;
  summary: string | null;
  chips: string[];
  href: string;
};

export function summaryCard(
  item: ItemOf<"topic_summary">,
  timeZone: string,
): SummaryCard {
  return {
    topicId: item.topicId,
    heading: `Sujet clos · ${item.title}`,
    range: topicRange(item.openedAt, item.closedAt, timeZone),
    lead: item.lead,
    summary: item.summary,
    chips: [
      decisionsLabel(item.decisions.length),
      ...(item.messages > 0 ? [messagesLabel(item.messages)] : []),
    ],
    href: `/coach/${item.topicId}`,
  };
}
