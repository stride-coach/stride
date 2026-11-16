import { describe, expect, it } from "vitest";
import {
  correctionContext,
  correctionInputSchema,
  excerptOf,
  staffCopyText,
} from "../../src/features/coach/corrections";
import type { ThreadItem } from "../../src/features/coach/items";
import { buildThread } from "../../src/features/coach/thread";

const at = (minute: number) =>
  new Date(Date.UTC(2026, 10, 16, 7, minute)).toISOString();

describe("correctionInputSchema", () => {
  it("trims the text and keeps the item id as digits", () => {
    expect(
      correctionInputSchema.parse({
        itemId: "12",
        text: "  Je ne cours pas le mardi  ",
      }),
    ).toEqual({ itemId: "12", text: "Je ne cours pas le mardi" });
  });

  it("refuses an empty correction, a long one and a bad id", () => {
    expect(
      correctionInputSchema.safeParse({ itemId: "12", text: "   " }).success,
    ).toBe(false);
    expect(
      correctionInputSchema.safeParse({ itemId: "12", text: "a".repeat(501) })
        .success,
    ).toBe(false);
    expect(
      correctionInputSchema.safeParse({ itemId: "abc", text: "Non" }).success,
    ).toBe(false);
  });
});

describe("excerptOf", () => {
  it("collapses whitespace and cuts long messages with an ellipsis", () => {
    expect(excerptOf("Six  semaines\nsans gêne")).toBe(
      "Six semaines sans gêne",
    );
    const cut = excerptOf("mot ".repeat(80));
    expect(cut.length).toBeLessThanOrEqual(160);
    expect(cut.endsWith("…")).toBe(true);
  });
});

describe("correctionContext", () => {
  it("returns null when there is nothing to tell the staff", () => {
    expect(correctionContext([])).toBeNull();
  });

  it("lists each correction under the message it answers", () => {
    const text = correctionContext([
      { excerpt: "Feu vert de mon côté", text: "J'ai eu mal hier" },
      { excerpt: "Charge en hausse", text: "Je n'ai pas couru mardi" },
    ]);
    expect(text).toContain("Corrections de l’athlète");
    expect(text).toContain("- Sur « Feu vert de mon côté » : J'ai eu mal hier");
    expect(text).toContain(
      "- Sur « Charge en hausse » : Je n'ai pas couru mardi",
    );
  });

  it("keeps only the ten latest corrections", () => {
    const many = Array.from({ length: 12 }, (_, index) => ({
      excerpt: `Message ${index}`,
      text: `Correction ${index}`,
    }));
    const text = correctionContext(many) ?? "";
    expect(text).not.toContain("Correction 1 ");
    expect(text).toContain("Correction 11");
    expect(text.match(/^- Sur/gm)).toHaveLength(10);
  });
});

describe("staffCopyText", () => {
  const items: ThreadItem[] = [
    {
      kind: "athlete",
      at: at(0),
      text: "Ça va ?",
      consult: null,
      attachments: [],
    },
    { kind: "coach", at: at(1), id: "2", text: "Oui, **très bien**." },
    { kind: "coach", at: at(2), id: "3", text: "On garde l'allure facile." },
  ];

  it("joins the text blocks of a staff message", () => {
    const entry = buildThread({
      items,
      live: false,
      pendingToolUseId: null,
    })[1];
    expect(entry.type === "staff" && staffCopyText(entry)).toBe(
      "Oui, **très bien**.\n\nOn garde l'allure facile.",
    );
  });
});

describe("what the staff read for a message", () => {
  const read = (id: string, minute: number, label: string): ThreadItem => ({
    kind: "read",
    at: at(minute),
    id,
    thread: "t1",
    agent: "coach",
    tool: "read_active_plan",
    label,
  });

  it("lists the reads of the turn, once each, before the reply", () => {
    const entries = buildThread({
      items: [
        {
          kind: "athlete",
          at: at(0),
          id: "1",
          text: "Et mon plan ?",
          consult: null,
          attachments: [],
        },
        read("2", 1, "Plan"),
        read("3", 2, "Plan"),
        read("4", 3, "Garmin · Sommeil"),
        { kind: "coach", at: at(4), id: "5", text: "Il est stable." },
      ],
      live: false,
      pendingToolUseId: null,
    });
    const staff = entries[1];
    expect(staff.type === "staff" && staff.lookedAt).toEqual([
      "Plan",
      "Garmin · Sommeil",
    ]);
  });

  it("starts over after the next athlete message", () => {
    const entries = buildThread({
      items: [
        read("1", 0, "Plan"),
        { kind: "coach", at: at(1), id: "2", text: "Premier." },
        {
          kind: "athlete",
          at: at(2),
          id: "3",
          text: "Merci",
          consult: null,
          attachments: [],
        },
        { kind: "coach", at: at(3), id: "4", text: "Second." },
      ],
      live: false,
      pendingToolUseId: null,
    });
    const second = entries[2];
    expect(second.type === "staff" && second.lookedAt).toEqual([]);
  });
});
