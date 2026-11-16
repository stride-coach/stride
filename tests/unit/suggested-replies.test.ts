import { describe, expect, it } from "vitest";
import type { ThreadItem } from "../../src/features/coach/items";
import {
  starterPrompts,
  suggestedReplies,
  type SuggestedReplyState,
} from "../../src/features/coach/suggested-replies";

const at = "2026-10-18T08:00:00.000Z";

const athlete: ThreadItem = {
  kind: "athlete",
  at,
  text: "Mon mollet est tendu",
  consult: null,
  attachments: [],
};

const coach: ThreadItem = { kind: "coach", at, text: "On reste en facile." };

const consultEnd: ThreadItem = {
  kind: "consult_end",
  at,
  thread: "sthr_calf",
  agent: "medical",
};

const proposed: ThreadItem = {
  kind: "blocks",
  at,
  agent: "coach",
  card: null,
  choices: [],
  links: [],
  replies: ["Pourquoi ?", "Et demain ?"],
};

const staffReplied: SuggestedReplyState = {
  mode: "conversation",
  busy: false,
  closed: false,
  questionPending: false,
  status: null,
  items: [athlete, coach, proposed],
};

describe("suggestedReplies", () => {
  it("offers the replies the staff proposed for the turn", () => {
    expect(suggestedReplies(staffReplied)).toEqual([
      "Pourquoi ?",
      "Et demain ?",
    ]);
    expect(
      suggestedReplies({
        ...staffReplied,
        items: [athlete, proposed, coach, consultEnd],
      }),
    ).toEqual(["Pourquoi ?", "Et demain ?"]);
  });

  it("shows none when the staff proposes none", () => {
    expect(
      suggestedReplies({ ...staffReplied, items: [athlete, coach] }),
    ).toEqual([]);
    expect(
      suggestedReplies({
        ...staffReplied,
        items: [athlete, coach, { ...proposed, replies: [] }],
      }),
    ).toEqual([]);
  });

  it("drops the replies of an earlier turn and of a failed one", () => {
    expect(
      suggestedReplies({
        ...staffReplied,
        items: [athlete, proposed, { ...athlete, text: "Merci" }, coach],
      }),
    ).toEqual([]);
    expect(
      suggestedReplies({
        ...staffReplied,
        items: [
          athlete,
          proposed,
          { kind: "error", at, code: "failed", text: "Échec" },
        ],
      }),
    ).toEqual([]);
  });

  it("hides the row while the staff works", () => {
    expect(suggestedReplies({ ...staffReplied, busy: true })).toEqual([]);
    expect(suggestedReplies({ ...staffReplied, status: "working" })).toEqual(
      [],
    );
  });

  it("leaves a pending question to its options", () => {
    expect(
      suggestedReplies({
        ...staffReplied,
        questionPending: true,
        status: "question",
      }),
    ).toEqual([]);
  });

  it("hides the row in a closed thread", () => {
    expect(
      suggestedReplies({ ...staffReplied, closed: true, status: "closed" }),
    ).toEqual([]);
  });

  it("leaves a new conversation to the starter cards", () => {
    expect(suggestedReplies({ ...staffReplied, items: [] })).toEqual([]);
  });

  it("offers four starters with a title and a subtitle", () => {
    expect(starterPrompts).toHaveLength(4);
    for (const starter of starterPrompts) {
      expect(starter.title.length).toBeGreaterThan(0);
      expect(starter.subtitle.length).toBeGreaterThan(0);
    }
  });
});
