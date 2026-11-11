import "server-only";
import { displayTimeZone } from "@/features/app-shell/shell";
import { isUnread } from "@/features/coach/conversations";
import type { ThreadItem } from "@/features/coach/items";
import {
  mainSessionReusable,
  topicDecisions,
  topicLead,
  topicMessageCount,
  type TopicSummary,
} from "@/features/coach/topics";
import type { OnboardingContext } from "@/server/onboarding/context";
import {
  findLatestMainSession,
  findOwnThread,
  listMainSessions,
  listOwnTopics,
  readSessionsItems,
  readThreadItems,
  readThreadProposalStatuses,
  type CoachSessionRecord,
} from "./managed/store";

export const coachTimeZone = displayTimeZone;

export type CoachMainData = {
  threadId: string | null;
  lastActivityAt: string | null;
  state: CoachSessionRecord["status"] | null;
  pendingToolUseId: string | null;
  lastTurnAt: string | null;
  composingSince: string | null;
  unreadIds: string[];
  items: ThreadItem[];
  proposalStatuses: Record<string, string>;
};

export type CoachTopicData = {
  id: string;
  mode: CoachSessionRecord["mode"];
  title: string;
  raceId: string | null;
  closedAt: string | null;
  state: CoachSessionRecord["status"];
  pendingToolUseId: string | null;
  lastTurnAt: string | null;
  composingSince: string | null;
  createdAt: string;
  unread: boolean;
  items: ThreadItem[];
  proposalStatuses: Record<string, string>;
};

function mergedStatuses(statuses: Map<string, Record<string, string>>) {
  return Object.assign({}, ...statuses.values()) as Record<string, string>;
}

export async function loadMainThread(
  context: OnboardingContext,
  now: Date,
): Promise<CoachMainData> {
  const sessions = await listMainSessions(context);
  const ids = sessions.map((session) => session.id);
  const [rows, statuses] = await Promise.all([
    readSessionsItems(context, ids),
    readThreadProposalStatuses(context, ids),
  ]);
  const latest = sessions[0] ?? null;
  const live =
    latest && mainSessionReusable(latest, now, coachTimeZone) ? latest : null;
  return {
    threadId: latest?.id ?? null,
    lastActivityAt: latest?.lastActivityAt ?? null,
    state: live ? live.status : latest ? "idle" : null,
    pendingToolUseId: live?.pendingToolUseId ?? null,
    lastTurnAt: live?.lastTurnAt ?? null,
    composingSince: live?.composingSince ?? null,
    unreadIds: sessions
      .filter((session) => isUnread(session.lastActivityAt, session.readAt))
      .map((session) => session.id),
    items: rows.map((row) => row.item),
    proposalStatuses: mergedStatuses(statuses),
  };
}

export async function loadMainActivity(context: OnboardingContext) {
  return (await findLatestMainSession(context))?.lastActivityAt ?? null;
}

const topicKinds: readonly ThreadItem["kind"][] = [
  "athlete",
  "answer",
  "coach",
  "consult_request",
  "consult_reply",
  "staff_message",
  "question",
  "proposal",
];

export async function loadTopics(
  context: OnboardingContext,
): Promise<TopicSummary[]> {
  const topics = await listOwnTopics(context);
  const ids = topics.map((topic) => topic.id);
  const [itemsByTopic, statuses] = await Promise.all([
    Promise.all(
      ids.map((id) => readSessionsItems(context, [id], 500, topicKinds)),
    ),
    readThreadProposalStatuses(context, ids),
  ]);
  return topics.map((topic, index) => {
    const items = itemsByTopic[index].map((row) => row.item);
    return {
      id: topic.id,
      title: topic.title ?? "Sujet",
      lead: topicLead(items),
      messages: topicMessageCount(items),
      decisions: topicDecisions(items, statuses.get(topic.id) ?? {}).length,
      lastActivityAt: topic.lastActivityAt,
      closedAt: topic.closedAt,
      unread: isUnread(topic.lastActivityAt, topic.readAt),
    };
  });
}

export type TopicLookup =
  { kind: "topic"; topic: CoachTopicData } | { kind: "main" } | null;

export async function loadTopic(
  context: OnboardingContext,
  threadId: string,
): Promise<TopicLookup> {
  const thread = await findOwnThread(context, threadId);
  if (!thread) return null;
  if (thread.kind === "main") return { kind: "main" };
  const [items, proposals] = await Promise.all([
    readThreadItems(context, thread.id),
    readThreadProposalStatuses(context, [thread.id]),
  ]);
  if (thread.title === null && items.length === 0) return null;
  return {
    kind: "topic",
    topic: {
      id: thread.id,
      mode: thread.mode,
      title: thread.title ?? "Sujet",
      raceId: thread.raceId,
      closedAt: thread.closedAt,
      state: thread.status,
      pendingToolUseId: thread.pendingToolUseId,
      lastTurnAt: thread.lastTurnAt,
      composingSince: thread.composingSince,
      createdAt: thread.createdAt,
      unread: isUnread(thread.lastActivityAt, thread.readAt),
      items,
      proposalStatuses: proposals.get(thread.id) ?? {},
    },
  };
}
