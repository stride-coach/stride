import "server-only";
import type { ThreadItem } from "@/features/coach/items";
import {
  orderResults,
  searchableKinds,
  searchConversation,
  searchItemLimit,
  searchQuery,
  type SearchResult,
} from "@/features/coach/search";
import type { OnboardingContext } from "@/server/onboarding/context";
import { listAllOwnSessions, readRecentItems } from "./managed/store";

export async function searchCoachConversation(
  context: OnboardingContext,
  raw: string,
): Promise<SearchResult[]> {
  const query = searchQuery(raw);
  if (!query) return [];
  const [sessions, rows] = await Promise.all([
    listAllOwnSessions(context),
    readRecentItems(context, searchableKinds, searchItemLimit),
  ]);
  const mainIds = new Set(
    sessions
      .filter((session) => session.kind === "main")
      .map((session) => session.id),
  );
  const topicIds = new Set(
    sessions
      .filter((session) => session.kind === "topic" && session.title !== null)
      .map((session) => session.id),
  );
  const conversations = new Map<string | null, ThreadItem[]>();
  for (const row of rows) {
    const topicId = mainIds.has(row.threadId)
      ? null
      : topicIds.has(row.threadId)
        ? row.threadId
        : undefined;
    if (topicId === undefined) continue;
    const items = conversations.get(topicId) ?? [];
    items.push(row.item);
    conversations.set(topicId, items);
  }
  return orderResults(
    [...conversations].flatMap(([topicId, items]) =>
      searchConversation(items, topicId, query),
    ),
  );
}
