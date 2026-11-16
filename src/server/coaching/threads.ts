import "server-only";
import { displayTimeZone } from "@/features/app-shell/shell";
import { isUnread } from "@/features/coach/conversations";
import type { ThreadItem } from "@/features/coach/items";
import {
  threadPageSize,
  unreadBoundary,
  type ReadMarker,
  type UnreadBoundary,
} from "@/features/coach/long-thread";
import type { ProposalCard } from "@/features/coach/proposal-card";
import { notifyOffer, type NotifyOffer } from "@/features/coach/notify";
import type { StepReport } from "@/features/coach/steps";
import { messageKinds, type ThreadAnchor } from "@/features/coach/search";
import { zonedEpoch } from "@/features/races/sun";
import {
  mainSessionReusable,
  topicDecisions,
  topicLead,
  topicMessageCount,
  type TopicSummary,
} from "@/features/coach/topics";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readPushSettings } from "@/server/push/preferences";
import {
  findFirstItemSince,
  findItemInSessions,
  findLatestMainSession,
  findOwnThread,
  hasItemsBefore,
  listMainSessions,
  listOwnTopics,
  readItemsAround,
  readSessionsItems,
  readThreadProposalStatuses,
  type CoachSessionRecord,
  type ItemScope,
} from "./managed/store";
import { readProposalCards } from "./proposal-cards";

export const coachTimeZone = displayTimeZone;

export type CoachMainData = {
  threadId: string | null;
  lastActivityAt: string | null;
  state: CoachSessionRecord["status"] | null;
  pendingToolUseId: string | null;
  lastTurnAt: string | null;
  composingSince: string | null;
  writingStep: StepReport | null;
  notifyWhenReady: boolean;
  notifyOffer: NotifyOffer;
  unreadIds: string[];
  items: ThreadItem[];
  proposalStatuses: Record<string, string>;
  proposalCards: Record<string, ProposalCard>;
  anchorId: string | null;
  hasMore: boolean;
  unread: UnreadBoundary | null;
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
  writingStep: StepReport | null;
  notifyWhenReady: boolean;
  notifyOffer: NotifyOffer;
  createdAt: string;
  unread: boolean;
  unreadBoundary: UnreadBoundary | null;
  hasMore: boolean;
  items: ThreadItem[];
  proposalStatuses: Record<string, string>;
  proposalCards: Record<string, ProposalCard>;
  anchorId: string | null;
};

async function readNotifyOffer(context: OnboardingContext) {
  const settings = await readPushSettings(context).catch(() => null);
  return notifyOffer({
    devices: settings?.publicKey ? settings.endpoints.length : 0,
    staffEnabled: settings?.preferences.plan_staff ?? false,
  });
}

async function readAnchoredItems(
  context: OnboardingContext,
  ids: ItemScope,
  anchor: ThreadAnchor | null,
) {
  const rows = await readSessionsItems(context, ids, threadPageSize);
  if (!anchor) return { rows, anchorId: null };
  const target =
    anchor.kind === "item"
      ? await findItemInSessions(context, ids, anchor.id)
      : await findFirstItemSince(
          context,
          ids,
          new Date(zonedEpoch(anchor.date, 0, coachTimeZone)).toISOString(),
          messageKinds,
        );
  const anchorId = target?.item.id ?? null;
  if (!anchorId || rows.some((row) => row.item.id === anchorId))
    return { rows, anchorId };
  return { rows: await readItemsAround(context, ids, anchorId), anchorId };
}

function markerOf(session: CoachSessionRecord): ReadMarker {
  return {
    readThroughId: session.readThroughItemId,
    readAt: session.readAt,
  };
}

function cardsOf(context: OnboardingContext, items: readonly ThreadItem[]) {
  return readProposalCards(context, items).catch(
    (): Record<string, ProposalCard> => ({}),
  );
}

function mergedStatuses(statuses: Map<string, Record<string, string>>) {
  return Object.assign({}, ...statuses.values()) as Record<string, string>;
}

export async function loadMainThread(
  context: OnboardingContext,
  now: Date,
  anchor: ThreadAnchor | null = null,
): Promise<CoachMainData> {
  const sessions = await listMainSessions(context);
  const ids = sessions.map((session) => session.id);
  const [{ rows, anchorId }, statuses] = anchor
    ? await readAnchoredItems(context, "main", anchor).then(
        async (read) =>
          [
            read,
            await readThreadProposalStatuses(context, [
              ...new Set(read.rows.map((row) => row.threadId)),
            ]),
          ] as const,
      )
    : await Promise.all([
        readAnchoredItems(context, ids, null),
        readThreadProposalStatuses(context, ids),
      ]);
  const items = rows.map((row) => row.item);
  const [proposalCards, hasMore] = await Promise.all([
    cardsOf(context, items),
    hasItemsBefore(context, anchor ? "main" : ids, items[0]?.id),
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
    writingStep: live?.writingStep ?? null,
    notifyWhenReady: live?.notifyWhenReady ?? false,
    notifyOffer: await readNotifyOffer(context),
    unreadIds: sessions
      .filter((session) => isUnread(session.lastActivityAt, session.readAt))
      .map((session) => session.id),
    items,
    proposalStatuses: mergedStatuses(statuses),
    proposalCards,
    anchorId,
    hasMore,
    unread: unreadBoundary(
      rows,
      new Map(sessions.map((session) => [session.id, markerOf(session)])),
      hasMore,
    ),
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
  anchor: ThreadAnchor | null = null,
): Promise<TopicLookup> {
  const thread = await findOwnThread(context, threadId);
  if (!thread) return null;
  if (thread.kind === "main") return { kind: "main" };
  const [{ rows, anchorId }, proposals] = await Promise.all([
    readAnchoredItems(context, [thread.id], anchor),
    readThreadProposalStatuses(context, [thread.id]),
  ]);
  const items = rows.map((row) => row.item);
  if (thread.title === null && items.length === 0) return null;
  const [proposalCards, hasMore] = await Promise.all([
    cardsOf(context, items),
    hasItemsBefore(context, [thread.id], items[0]?.id),
  ]);
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
      writingStep: thread.writingStep,
      notifyWhenReady: thread.notifyWhenReady,
      notifyOffer: await readNotifyOffer(context),
      createdAt: thread.createdAt,
      unread: isUnread(thread.lastActivityAt, thread.readAt),
      unreadBoundary: unreadBoundary(
        rows,
        new Map([[thread.id, markerOf(thread)]]),
        hasMore,
      ),
      hasMore,
      items,
      proposalStatuses: proposals.get(thread.id) ?? {},
      proposalCards,
      anchorId,
    },
  };
}

export type OlderTarget =
  { kind: "main" } | { kind: "topic"; threadId: string };

export type OlderPage = {
  items: ThreadItem[];
  hasMore: boolean;
  proposalStatuses: Record<string, string>;
  proposalCards: Record<string, ProposalCard>;
};

export async function loadOlderItems(
  context: OnboardingContext,
  target: OlderTarget,
  before: string,
): Promise<OlderPage | null> {
  let scope: ItemScope;
  if (target.kind === "main") {
    scope = (await listMainSessions(context)).map((session) => session.id);
  } else {
    const thread = await findOwnThread(context, target.threadId);
    if (!thread || thread.kind === "main") return null;
    scope = [thread.id];
  }
  const rows = await readSessionsItems(
    context,
    scope,
    threadPageSize,
    undefined,
    before,
  );
  const items = rows.map((row) => row.item);
  const [hasMore, statuses, proposalCards] = await Promise.all([
    hasItemsBefore(context, scope, items[0]?.id),
    readThreadProposalStatuses(context, [
      ...new Set(rows.map((row) => row.threadId)),
    ]),
    cardsOf(context, items),
  ]);
  return {
    items,
    hasMore,
    proposalStatuses: mergedStatuses(statuses),
    proposalCards,
  };
}
