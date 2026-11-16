import { describe, expect, it } from "vitest";
import type { ThreadItem } from "../../src/features/coach/items";
import { buildThread } from "../../src/features/coach/thread";
import {
  applyOlderPage,
  newMessagesLabel,
  olderCursor,
  prependOlder,
  syncOlder,
  unreadBoundary,
  unreadEntryIndex,
  type ReadMarker,
} from "../../src/features/coach/long-thread";

function item(
  id: string,
  kind: "athlete" | "coach" | "answer" | "read",
  at: string,
): ThreadItem {
  if (kind === "read")
    return {
      kind,
      id,
      at,
      thread: "t",
      agent: "coach",
      tool: "x",
      label: "Plan",
    };
  return kind === "coach"
    ? { kind, id, at, text: "Message" }
    : kind === "answer"
      ? { kind, id, at, toolUseId: "tool", text: "Réponse" }
      : { kind, id, at, text: "Message", consult: null, attachments: [] };
}

const marker = (
  readThroughId: string | null,
  readAt: string | null = null,
): ReadMarker => ({ readThroughId, readAt });

describe("unreadBoundary", () => {
  const rows = [
    { threadId: "a", item: item("10", "coach", "2026-11-10T08:00:00Z") },
    { threadId: "a", item: item("11", "athlete", "2026-11-10T08:05:00Z") },
    { threadId: "a", item: item("12", "coach", "2026-11-10T08:06:00Z") },
    { threadId: "a", item: item("13", "coach", "2026-11-10T08:07:00Z") },
  ];

  it("starts at the first staff item after the read marker", () => {
    expect(unreadBoundary(rows, new Map([["a", marker("11")]]), false)).toEqual(
      { firstId: "12", count: 2 },
    );
  });

  it("compares ids as numbers, not as strings", () => {
    const wide = [
      { threadId: "a", item: item("9", "coach", "2026-11-10T08:00:00Z") },
      { threadId: "a", item: item("100", "coach", "2026-11-10T08:01:00Z") },
    ];
    expect(unreadBoundary(wide, new Map([["a", marker("9")]]), false)).toEqual({
      firstId: "100",
      count: 1,
    });
  });

  it("never counts the athlete's own messages or answers", () => {
    const own = [
      { threadId: "a", item: item("10", "coach", "2026-11-10T08:00:00Z") },
      { threadId: "a", item: item("11", "athlete", "2026-11-10T08:05:00Z") },
      { threadId: "a", item: item("12", "answer", "2026-11-10T08:06:00Z") },
    ];
    expect(unreadBoundary(own, new Map([["a", marker("10")]]), false)).toBe(
      null,
    );
  });

  it("ignores items the thread never shows as messages", () => {
    const mixed = [
      { threadId: "a", item: item("10", "coach", "2026-11-10T08:00:00Z") },
      { threadId: "a", item: item("11", "read", "2026-11-10T08:01:00Z") },
      { threadId: "a", item: item("12", "read", "2026-11-10T08:02:00Z") },
      { threadId: "a", item: item("13", "coach", "2026-11-10T08:03:00Z") },
    ];
    expect(
      unreadBoundary(mixed, new Map([["a", marker("10")]]), false),
    ).toEqual({
      firstId: "13",
      count: 1,
    });
  });

  it("returns null when everything is read", () => {
    expect(unreadBoundary(rows, new Map([["a", marker("13")]]), false)).toBe(
      null,
    );
  });

  it("falls back to the read date for threads read before markers existed", () => {
    expect(
      unreadBoundary(
        rows,
        new Map([["a", marker(null, "2026-11-10T08:06:30Z")]]),
        false,
      ),
    ).toEqual({ firstId: "13", count: 1 });
  });

  it("draws no divider when the whole page is unread and nothing is older", () => {
    expect(unreadBoundary(rows, new Map([["a", marker(null)]]), false)).toBe(
      null,
    );
  });

  it("keeps the divider when the whole page is unread but older items exist", () => {
    expect(unreadBoundary(rows, new Map([["a", marker(null)]]), true)).toEqual({
      firstId: "10",
      count: 3,
    });
  });

  it("applies each thread's own marker in the main thread", () => {
    const merged = [
      { threadId: "a", item: item("10", "coach", "2026-11-09T08:00:00Z") },
      { threadId: "b", item: item("20", "coach", "2026-11-10T08:00:00Z") },
      { threadId: "b", item: item("21", "coach", "2026-11-10T08:01:00Z") },
    ];
    expect(
      unreadBoundary(
        merged,
        new Map([
          ["a", marker("10")],
          ["b", marker("20")],
        ]),
        false,
      ),
    ).toEqual({ firstId: "21", count: 1 });
  });
});

describe("olderCursor and prependOlder", () => {
  const first = item("40", "coach", "2026-11-10T08:00:00Z");
  const second = item("41", "coach", "2026-11-10T08:01:00Z");

  it("uses the id of the oldest loaded item as the cursor", () => {
    expect(olderCursor([first, second])).toBe("40");
    expect(olderCursor([])).toBe(null);
  });

  it("skips items that are already loaded when prepending a page", () => {
    const older = item("39", "coach", "2026-11-10T07:59:00Z");
    expect(prependOlder([first, second], [older, first])).toEqual([
      older,
      first,
      second,
    ]);
  });
});

describe("newMessagesLabel", () => {
  it("pluralises in French", () => {
    expect(newMessagesLabel(1)).toBe("1 nouveau message");
    expect(newMessagesLabel(2)).toBe("2 nouveaux messages");
  });
});

describe("syncOlder", () => {
  const at = "2026-11-10T08:00:00Z";
  const page = (...ids: number[]) =>
    ids.map((id) => item(String(id), "coach", at));
  const ids = (items: ThreadItem[]) => items.map((entry) => entry.id);

  it("returns the same state while the first page is unchanged", () => {
    const base = page(41, 42);
    const state = { base, items: [], hasMore: true, loaded: 0 };
    expect(syncOlder(state, base, true)).toBe(state);
  });

  it("keeps the items a shifting first page drops, so the thread has no gap", () => {
    const state = {
      base: page(41, 42, 43),
      items: page(30, 31),
      hasMore: true,
      loaded: 0,
    };
    const next = syncOlder(state, page(43, 44, 45), false);
    expect(ids(next.items)).toEqual(["30", "31", "41", "42"]);
    expect(next.hasMore).toBe(true);
  });

  it("keeps the dropped items even when no older page was loaded", () => {
    const state = {
      base: page(41, 42, 43),
      items: [],
      hasMore: true,
      loaded: 0,
    };
    const next = syncOlder(state, page(42, 43, 44), false);
    expect(ids(next.items)).toEqual(["41"]);
    expect(next.hasMore).toBe(true);
  });

  it("resets to the server answer when the new page starts earlier", () => {
    const state = {
      base: page(41, 42),
      items: page(30),
      hasMore: true,
      loaded: 0,
    };
    const next = syncOlder(state, page(10, 11), false);
    expect(next.items).toEqual([]);
    expect(next.hasMore).toBe(false);
  });

  it("resets when the new page does not overlap the previous one", () => {
    const state = { base: page(41, 42), items: [], hasMore: true, loaded: 0 };
    const next = syncOlder(state, page(300, 301), true);
    expect(next.items).toEqual([]);
    expect(next.hasMore).toBe(true);
  });
});

describe("unreadEntryIndex", () => {
  const items = [
    item("10", "athlete", "2026-11-10T08:00:00Z"),
    item("11", "coach", "2026-11-10T08:01:00Z"),
    item("12", "athlete", "2026-11-10T08:02:00Z"),
    item("13", "coach", "2026-11-10T08:03:00Z"),
  ];
  const entries = buildThread({
    items,
    live: false,
    pendingToolUseId: null,
  });

  it("finds the entry holding the first unread item", () => {
    expect(unreadEntryIndex(entries, "13")).toBe(3);
  });

  it("finds a staff entry that groups several items", () => {
    const grouped = buildThread({
      items: [
        item("20", "coach", "2026-11-10T08:00:00Z"),
        item("21", "coach", "2026-11-10T08:01:00Z"),
      ],
      live: false,
      pendingToolUseId: null,
    });
    expect(unreadEntryIndex(grouped, "21")).toBe(0);
  });

  it("returns -1 when no entry holds an item that new", () => {
    expect(unreadEntryIndex(entries, "99")).toBe(-1);
  });
});

describe("applyOlderPage", () => {
  const at = "2026-11-10T08:00:00Z";
  const page = (...ids: number[]) =>
    ids.map((id) => item(String(id), "coach", at));
  const ids = (items: ThreadItem[]) => items.map((entry) => entry.id);

  it("prepends a page requested against the oldest known item", () => {
    const state = { base: page(41, 42), items: [], hasMore: true, loaded: 0 };
    const next = applyOlderPage(state, "41", page(39, 40), false);
    expect(ids(next.items)).toEqual(["39", "40"]);
    expect(next.hasMore).toBe(false);
    expect(next.loaded).toBe(2);
  });

  it("discards a late page once the oldest known item changed", () => {
    const state = { base: page(300, 301), items: [], hasMore: true, loaded: 0 };
    expect(applyOlderPage(state, "41", page(39, 40), false)).toBe(state);
  });

  it("counts only the items it really added", () => {
    const state = {
      base: page(41, 42),
      items: page(40),
      hasMore: true,
      loaded: 1,
    };
    const next = applyOlderPage(state, "40", page(39, 40), true);
    expect(next.loaded).toBe(2);
  });
});
