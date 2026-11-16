import { describe, expect, it } from "vitest";
import type { ThreadItem } from "../../src/features/coach/items";
import {
  newMessagesLabel,
  olderCursor,
  prependOlder,
  unreadBoundary,
  type ReadMarker,
} from "../../src/features/coach/long-thread";

function item(
  id: string,
  kind: "athlete" | "coach" | "answer",
  at: string,
): ThreadItem {
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
