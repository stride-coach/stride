import type { ThreadItem } from "./items";
import type { ThreadEntry } from "./thread";

export const threadPageSize = 60;

export type ReadMarker = {
  readThroughId: string | null;
  readAt: string | null;
};

export type ThreadRow = { threadId: string; item: ThreadItem };

export type UnreadBoundary = { firstId: string; count: number };

const incomingKinds: readonly ThreadItem["kind"][] = [
  "coach",
  "staff_message",
  "question",
  "proposal",
  "blocks",
  "error",
  "topic_summary",
];

export function isIncomingMessage(item: ThreadItem) {
  return incomingKinds.includes(item.kind);
}

function isUnreadItem(item: ThreadItem, marker: ReadMarker | undefined) {
  if (!item.id || !isIncomingMessage(item)) return false;
  if (!marker) return false;
  if (marker.readThroughId !== null)
    return BigInt(item.id) > BigInt(marker.readThroughId);
  if (marker.readAt !== null)
    return Date.parse(item.at) > Date.parse(marker.readAt);
  return true;
}

export function unreadBoundary(
  rows: readonly ThreadRow[],
  markers: ReadonlyMap<string, ReadMarker>,
  hasOlder: boolean,
): UnreadBoundary | null {
  const unread = rows.filter((row) =>
    isUnreadItem(row.item, markers.get(row.threadId)),
  );
  const first = unread[0]?.item.id;
  if (!first) return null;
  if (!hasOlder && rows[0]?.item.id === first) return null;
  return { firstId: first, count: unread.length };
}

export function olderCursor(items: readonly ThreadItem[]) {
  return items[0]?.id ?? null;
}

export function prependOlder(
  items: readonly ThreadItem[],
  older: readonly ThreadItem[],
) {
  const loaded = new Set(items.flatMap((item) => (item.id ? [item.id] : [])));
  return [
    ...older.filter((item) => !item.id || !loaded.has(item.id)),
    ...items,
  ];
}

export function newMessagesLabel(count: number) {
  return count === 1 ? "1 nouveau message" : `${count} nouveaux messages`;
}

export type OlderState = {
  base: ThreadItem[];
  items: ThreadItem[];
  hasMore: boolean;
  loaded: number;
};

export function syncOlder(
  previous: OlderState,
  base: ThreadItem[],
  hasMore: boolean,
): OlderState {
  if (previous.base === base) return previous;
  const first = base[0]?.id;
  const oldest = previous.items[0]?.id ?? previous.base[0]?.id;
  const newest = previous.base.at(-1)?.id;
  if (!first || !oldest || !newest)
    return { base, items: [], hasMore, loaded: 0 };
  const start = BigInt(first);
  if (start <= BigInt(oldest) || start > BigInt(newest))
    return { base, items: [], hasMore, loaded: 0 };
  return {
    base,
    items: [...previous.items, ...previous.base].filter(
      (item) => item.id && BigInt(item.id) < start,
    ),
    hasMore: previous.hasMore,
    loaded: previous.loaded,
  };
}

export function applyOlderPage(
  state: OlderState,
  before: string,
  page: readonly ThreadItem[],
  hasMore: boolean,
): OlderState {
  const oldest = state.items[0]?.id ?? state.base[0]?.id;
  if (oldest !== before) return state;
  const items = prependOlder(state.items, page);
  return {
    ...state,
    items,
    hasMore,
    loaded: state.loaded + items.length - state.items.length,
  };
}

function entryItemIds(entry: ThreadEntry) {
  switch (entry.type) {
    case "athlete":
      return entry.itemId ? [entry.itemId] : [];
    case "staff":
      return entry.blocks.flatMap((block) =>
        block.itemId ? [block.itemId] : [],
      );
    case "topic_summary":
      return entry.item.id ? [entry.item.id] : [];
    case "typing":
      return [];
  }
}

export function unreadEntryIndex(
  entries: readonly ThreadEntry[],
  firstId: string,
) {
  const first = BigInt(firstId);
  return entries.findIndex((entry) =>
    entryItemIds(entry).some((id) => BigInt(id) >= first),
  );
}
