import { describe, expect, it } from "vitest";
import type { ThreadItem } from "@/features/coach/items";
import {
  answerRevisionText,
  buildThread,
  revisableQuestion,
} from "@/features/coach/thread";

const at = (minute: number) =>
  `2026-10-16T12:${String(minute).padStart(2, "0")}:00Z`;

const question: ThreadItem = {
  kind: "question",
  at: at(1),
  toolUseId: "sevt_knee",
  question: "Comment réagit ton genou en descente ?",
  options: ["Aucune gêne", "Douloureux"],
  askedFor: "medical",
};
const answer = (text: string, minute: number): ThreadItem => ({
  kind: "answer",
  at: at(minute),
  toolUseId: "sevt_knee",
  text,
});
const reply: ThreadItem = {
  kind: "staff_message",
  at: at(3),
  thread: "sthr_knee",
  agent: "medical",
  text: "Tu peux courir.",
};

describe("revisableQuestion", () => {
  it("lets the athlete change the last answer until the staff concludes", () => {
    expect(revisableQuestion([question, answer("Aucune gêne", 2), reply])).toBe(
      "sevt_knee",
    );
  });

  it("locks an answer once the staff proposes or summarizes", () => {
    const proposal: ThreadItem = {
      kind: "proposal",
      at: at(4),
      proposalId: "d0000000-0000-4000-8000-00000000000d",
      scope: "session",
      title: "Descentes faciles",
      summary: null,
      opinions: [],
    };
    expect(
      revisableQuestion([question, answer("Aucune gêne", 2), proposal]),
    ).toBeNull();
  });

  it("only offers the latest question and never an unanswered one", () => {
    const next: ThreadItem = {
      ...question,
      at: at(5),
      toolUseId: "sevt_next",
      question: "Et ton sommeil ?",
    };
    expect(
      revisableQuestion([question, answer("Aucune gêne", 2), next]),
    ).toBeNull();
    expect(revisableQuestion([question])).toBeNull();
    expect(revisableQuestion([])).toBeNull();
  });
});

describe("answer revision", () => {
  it("shows the latest answer on the question for the staff and the athlete", () => {
    const entries = buildThread({
      items: [
        question,
        answer("Aucune gêne", 2),
        reply,
        answer("Douloureux", 4),
      ],
      live: false,
      pendingToolUseId: null,
    });
    const block = entries
      .flatMap((entry) => (entry.type === "staff" ? entry.blocks : []))
      .find((item) => item.type === "question");
    expect(block).toMatchObject({
      state: "answered",
      answer: "Douloureux",
      answeredAt: at(4),
    });
  });

  it("tells the staff that the new answer replaces the previous one", () => {
    expect(
      answerRevisionText(
        [question, answer("Aucune gêne", 2), reply],
        "sevt_knee",
        "Douloureux",
      ),
    ).toBe(
      "L’athlète change sa réponse à la question « Comment réagit ton genou en descente ? ». Sa nouvelle réponse, « Douloureux », remplace la précédente, « Aucune gêne ». Reprends ton avis avec cette réponse.",
    );
    expect(
      answerRevisionText([question], "sevt_knee", "Douloureux"),
    ).toBeNull();
  });
});
