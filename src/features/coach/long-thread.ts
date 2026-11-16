import type { ThreadItem } from "./items";

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
