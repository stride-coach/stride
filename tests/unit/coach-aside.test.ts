import { describe, expect, it } from "vitest";
import {
  staffReadRows,
  staffRepliedAt,
} from "../../src/features/coach/conversations";
import type { ThreadItem } from "../../src/features/coach/items";
import { topicClosingSentence } from "../../src/features/coach/topics";

const items: ThreadItem[] = [
  { kind: "coach", at: "2026-11-16T13:11:00Z", text: "Bonjour" },
  {
    kind: "staff_message",
    at: "2026-11-16T13:03:00Z",
    thread: "t1",
    agent: "director",
    text: "Jouable",
  },
  {
    kind: "read",
    at: "2026-11-16T13:02:00Z",
    thread: "t1",
    agent: "director",
    tool: "plan",
    label: "Plan · 25 semaines",
  },
  {
    kind: "read",
    at: "2026-11-16T13:02:30Z",
    thread: "t1",
    agent: "director",
    tool: "profile",
    label: "Profil et contexte",
  },
];

describe("coach aside details", () => {
  it("derives the last reply of each member", () => {
    expect(staffRepliedAt(items, "coach")).toBe("2026-11-16T13:11:00Z");
    expect(staffRepliedAt(items, "director")).toBe("2026-11-16T13:03:00Z");
    expect(staffRepliedAt(items, "nutritionist")).toBeNull();
  });

  it("splits reads into label, value and time", () => {
    expect(staffReadRows(items, "Europe/Paris")).toEqual([
      {
        key: "Plan · 25 semaines",
        label: "Plan",
        value: "25 semaines",
        at: "14:02",
      },
      {
        key: "Profil et contexte",
        label: "Profil et contexte",
        value: null,
        at: "14:02",
      },
    ]);
  });

  it("words the closing sentence", () => {
    expect(topicClosingSentence("Ma nutrition")).toBe(
      "Je clos le sujet sur « Ma nutrition » : voici ce qu’on en retient.",
    );
  });
});
