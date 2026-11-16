import { describe, expect, it } from "vitest";
import {
  applyStreamEvent,
  beginExchange,
  emptyExchange,
  endSend,
  hasExchange,
  opensQuickAsk,
  quickAskHeading,
  quickAskNote,
  quickAskScreen,
  quickAskSuggestions,
  reopenedExchange,
} from "../../src/features/coach/quick-ask";
import type { ThreadItem } from "../../src/features/coach/items";

const thread = "c0c0c0c0-0000-4000-8000-000000000004";

function item(kind: "athlete" | "coach" | "answer", text: string) {
  return {
    kind,
    at: "2026-11-16T08:00:00.000Z",
    ...(kind === "athlete"
      ? { text, consult: null, attachments: [] }
      : kind === "answer"
        ? { toolUseId: "toolu_1", text }
        : { text }),
  } as unknown as ThreadItem;
}

describe("quick ask suggestions", () => {
  it("offers three French questions per context kind", () => {
    for (const kind of ["session", "activity", "race", null] as const) {
      const questions = quickAskSuggestions(kind);
      expect(questions).toHaveLength(3);
      expect(new Set(questions).size).toBe(3);
    }
    expect(quickAskHeading("session")).toBe("Souvent demandé sur cette séance");
    expect(quickAskHeading(null)).toBe("Souvent demandé");
  });

  it("names what is attached and where the exchange is kept", () => {
    expect(quickAskNote("race")).toBe(
      "La course affichée est jointe d’office. L’échange est gardé dans le fil principal.",
    );
    expect(quickAskNote(null)).toBe(
      "L’échange est gardé dans le fil principal.",
    );
  });
});

describe("quick ask screen", () => {
  it("labels the screen the athlete asks from", () => {
    expect(quickAskScreen("/today")).toBe("Aujourd’hui");
    expect(quickAskScreen("/plan/sessions/s-1")).toBe("Plan");
    expect(quickAskScreen("/health/fitness")).toBe("Santé");
    expect(quickAskScreen("/elsewhere")).toBe("cet écran");
  });

  it("does not open over the Coach itself", () => {
    expect(opensQuickAsk("/coach")).toBe(false);
    expect(opensQuickAsk("/coach/abc")).toBe(false);
    expect(opensQuickAsk("/coaching")).toBe(true);
    expect(opensQuickAsk("/today")).toBe(true);
  });
});

describe("quick ask exchange", () => {
  it("shows the sent message until the stream confirms it, then the reply", () => {
    let exchange = beginExchange(emptyExchange, {
      text: "Je peux la faire sur tapis ?",
      attachments: [],
    });
    expect(hasExchange(exchange)).toBe(true);
    exchange = applyStreamEvent(exchange, {
      type: "session",
      sessionId: "sesn_1",
      threadId: thread,
    });
    expect(exchange.threadId).toBe(thread);
    expect(exchange.pending).not.toBeNull();
    exchange = applyStreamEvent(exchange, {
      type: "item",
      item: item("athlete", "Je peux la faire sur tapis ?"),
    });
    expect(exchange.pending).toBeNull();
    exchange = applyStreamEvent(exchange, {
      type: "item",
      item: item("coach", "Oui."),
    });
    exchange = applyStreamEvent(exchange, { type: "done", status: "idle" });
    expect(exchange.items.map((entry) => entry.kind)).toEqual([
      "athlete",
      "coach",
    ]);
    expect(exchange.finished).toBe(true);
  });

  it("keeps a question pending until it is answered", () => {
    let exchange = applyStreamEvent(emptyExchange, {
      type: "question",
      toolUseId: "toolu_1",
    });
    exchange = applyStreamEvent(exchange, {
      type: "done",
      status: "awaiting_athlete",
    });
    expect(exchange.pendingQuestion).toBe("toolu_1");
    exchange = applyStreamEvent(exchange, {
      type: "item",
      item: item("answer", "Oui"),
    });
    expect(exchange.pendingQuestion).toBeNull();
  });

  it("drops the pending bubble when a send fails", () => {
    const exchange = endSend(
      beginExchange(emptyExchange, { text: "Bonjour", attachments: [] }),
    );
    expect(hasExchange(exchange)).toBe(false);
  });

  it("keeps a running exchange when the dialog reopens and starts fresh otherwise", () => {
    const running = applyStreamEvent(emptyExchange, {
      type: "item",
      item: item("coach", "En cours"),
    });
    expect(reopenedExchange(running, true)).toBe(running);
    expect(reopenedExchange(running, false)).toBe(emptyExchange);
  });
});
