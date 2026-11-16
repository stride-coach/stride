import type { ThreadItem } from "./items";
import type { ThreadEntry } from "./thread";

export const threadPageSize = 60;

export type ReadMarker = {
  readThroughId: string | null;
  readAt: string | null;
};

export type ThreadRow = { threadId: string; item: ThreadItem };

export type UnreadBoundary = { firstId: string; count: number };

const ownKinds: readonly ThreadItem["kind"][] = ["athlete", "answer"];

function isUnreadItem(item: ThreadItem, marker: ReadMarker | undefined) {
  if (!item.id || ownKinds.includes(item.kind)) return false;
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
  if (!first || !oldest || !newest) return { base, items: [], hasMore };
  const start = BigInt(first);
  if (start <= BigInt(oldest) || start > BigInt(newest))
    return { base, items: [], hasMore };
  return {
    base,
    items: [...previous.items, ...previous.base].filter(
      (item) => item.id && BigInt(item.id) < start,
    ),
    hasMore: previous.hasMore,
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
