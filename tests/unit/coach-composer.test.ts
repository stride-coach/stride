import { describe, expect, it } from "vitest";
import {
  inlineLayout,
  nextComposerLayout,
  sendButtonState,
} from "../../src/features/coach/composer";
import {
  consultOf,
  insertMention,
  mentionedAgent,
  mentionOptions,
  mentionQuery,
  openMention,
  stepMention,
} from "../../src/features/coach/mentions";
import {
  enqueueMessage,
  outboxCapacity,
  outboxNotice,
  outboxStep,
  parseOutbox,
  removeMessage,
  serializeOutbox,
  type OutboxMessage,
} from "../../src/features/coach/outbox";

const message = (id: string, text = "Je peux la faire sur tapis ?") =>
  ({ id, text, consult: null, attachments: [] }) satisfies OutboxMessage;

const ready = {
  online: true,
  working: false,
  sending: false,
  questionPending: false,
};

describe("send button", () => {
  it("is off while the field is empty and lights up with the first character", () => {
    expect(sendButtonState({ text: "  ", working: false })).toBe("off");
    expect(sendButtonState({ text: "J", working: false })).toBe("on");
  });

  it("becomes the stop button while the staff replies, even with a draft", () => {
    expect(sendButtonState({ text: "", working: true })).toBe("stop");
    expect(sendButtonState({ text: "Et demain ?", working: true })).toBe(
      "stop",
    );
  });
});

describe("composer layout", () => {
  it("moves the buttons below from the second line", () => {
    const stacked = nextComposerLayout(inlineLayout, {
      text: "a".repeat(80),
      lines: 2,
    });
    expect(stacked).toEqual({ stacked: true, stackedAt: 80 });
    expect(
      nextComposerLayout(stacked, { text: "a".repeat(85), lines: 1 }),
    ).toBe(stacked);
  });

  it("stacks on a line break and returns inline once the text is shorter", () => {
    const stacked = nextComposerLayout(inlineLayout, {
      text: "Salut\n",
      lines: 2,
    });
    expect(stacked.stacked).toBe(true);
    expect(nextComposerLayout(stacked, { text: "Salut", lines: 1 })).toEqual(
      inlineLayout,
    );
    expect(nextComposerLayout(stacked, { text: "", lines: 1 })).toEqual(
      inlineLayout,
    );
  });

  it("stays inline on a single line", () => {
    expect(nextComposerLayout(inlineLayout, { text: "Salut", lines: 1 })).toBe(
      inlineLayout,
    );
  });
});

describe("mentions", () => {
  it("opens the five-member list on a fresh @", () => {
    expect(mentionQuery("Est-ce que @", 12)).toEqual({
      start: 11,
      end: 12,
      query: "",
    });
    expect(mentionOptions("")).toEqual([
      "coach",
      "medical",
      "director",
      "strategist",
      "nutritionist",
    ]);
  });

  it("filters by name, ignoring case and accents, including later words", () => {
    expect(mentionOptions("sante")).toEqual(["medical"]);
    expect(mentionOptions("spo")).toEqual(["director"]);
    expect(mentionOptions("Stratège de")).toEqual(["strategist"]);
    expect(mentionQuery("@xyz", 4)).toBeNull();
  });

  it("ignores an @ inside a word or once the mention is complete", () => {
    expect(mentionQuery("jules@stride", 12)).toBeNull();
    expect(mentionQuery("@Santé ", 7)).toBeNull();
    expect(mentionQuery("@Santé\nça", 9)).toBeNull();
    expect(mentionQuery("Bonjour", 7)).toBeNull();
  });

  it("wraps arrow-key navigation", () => {
    expect(stepMention(0, 5, -1)).toBe(4);
    expect(stepMention(4, 5, 1)).toBe(0);
    expect(stepMention(1, 5, 1)).toBe(2);
    expect(stepMention(0, 0, 1)).toBe(-1);
  });

  it("replaces the query with the chosen member and places the caret after it", () => {
    const query = mentionQuery("Est-ce que @nu tu peux", 14)!;
    expect(
      insertMention("Est-ce que @nu tu peux", query, "nutritionist"),
    ).toEqual({ text: "Est-ce que @Nutrition tu peux", caret: 22 });
  });

  it("inserts an @ from the button with a separating space", () => {
    expect(openMention("Bonjour", 7)).toEqual({ text: "Bonjour @", caret: 9 });
    expect(openMention("", 0)).toEqual({ text: "@", caret: 1 });
    expect(openMention("Salut ", 6)).toEqual({ text: "Salut @", caret: 7 });
  });

  it("targets the last mentioned specialist and leaves the Coach to dispatch", () => {
    expect(mentionedAgent("@Directeur sportif puis @Santé ?")).toBe("medical");
    expect(consultOf("@Stratège de course, quelle allure ?")).toBe(
      "strategist",
    );
    expect(consultOf("@Coach tu en penses quoi ?")).toBeNull();
    expect(consultOf("Rien à signaler")).toBeNull();
    expect(consultOf("@Santéx")).toBeNull();
  });
});

describe("outbox", () => {
  it("round-trips through storage and drops invalid entries", () => {
    const outbox = [message("a"), message("b", "Et demain ?")];
    expect(parseOutbox(serializeOutbox(outbox))).toEqual(outbox);
    expect(serializeOutbox([])).toBeNull();
    expect(parseOutbox("not json")).toEqual([]);
    expect(parseOutbox('{"id":"a"}')).toEqual([]);
    expect(
      parseOutbox(JSON.stringify([{ id: "x", text: "  " }, message("c")])),
    ).toEqual([message("c")]);
  });

  it("queues in order up to its capacity and removes a sent message", () => {
    let outbox = enqueueMessage([], message("a"));
    outbox = enqueueMessage(outbox, message("b"));
    expect(outbox.map(({ id }) => id)).toEqual(["a", "b"]);
    expect(removeMessage(outbox, "a").map(({ id }) => id)).toEqual(["b"]);
    const full = Array.from({ length: outboxCapacity }, (_, index) =>
      message(String(index)),
    );
    expect(enqueueMessage(full, message("late"))).toBe(full);
  });

  it("sends the oldest message once the staff is done and the network is back", () => {
    const outbox = [message("a"), message("b")];
    expect(outboxStep([], ready)).toEqual({ kind: "idle" });
    expect(outboxStep(outbox, { ...ready, working: true })).toEqual({
      kind: "wait",
    });
    expect(outboxStep(outbox, { ...ready, online: false })).toEqual({
      kind: "wait",
    });
    expect(outboxStep(outbox, { ...ready, sending: true })).toEqual({
      kind: "wait",
    });
    expect(outboxStep(outbox, ready)).toEqual({
      kind: "send",
      message: outbox[0],
    });
  });

  it("gives a queued message back to the field when the staff asks a question", () => {
    expect(
      outboxStep([message("a")], { ...ready, questionPending: true }),
    ).toEqual({ kind: "restore", message: message("a") });
  });

  it("tells the athlete when the messages will leave", () => {
    expect(outboxNotice(0, true)).toBeNull();
    expect(outboxNotice(0, false)).toEqual({
      offline: true,
      text: "Ton message partira au retour du réseau.",
    });
    expect(outboxNotice(1, true)?.text).toBe(
      "Ton message partira après la réponse du staff.",
    );
    expect(outboxNotice(2, true)?.text).toBe(
      "Tes 2 messages partiront après la réponse du staff.",
    );
  });
});
