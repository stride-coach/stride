import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
  itemBody,
  parseThreadItem,
  type ItemOf,
  type ThreadItem,
} from "../../src/features/coach/items";
import { staff } from "../../src/features/coach/staff";
import { buildThread } from "../../src/features/coach/thread";
import {
  decisionsLabel,
  mainSessionReusable,
  summaryCard,
  topicCompanions,
  topicContext,
  topicDecisions,
  topicLead,
  topicMessageCount,
  topicRowDate,
  topicRowMeta,
  topicSections,
  type TopicSummary,
} from "../../src/features/coach/topics";
import {
  summarizeTopic,
  topicTranscript,
} from "../../src/server/ai/skills/topic-summary";

const tz = "Europe/Paris";
const now = new Date("2026-10-16T14:00:00Z");
const at = (minute: number) =>
  `2026-10-16T12:${String(minute).padStart(2, "0")}:00Z`;
const proposalA = "d0000000-0000-4000-8000-00000000000a";
const proposalB = "d0000000-0000-4000-8000-00000000000b";
const topicId = "c0000000-0000-4000-8000-0000000000c1";

const topic: ThreadItem[] = [
  {
    kind: "athlete",
    at: at(0),
    text: "Mon tendon tire en descente",
    consult: null,
    attachments: [],
  },
  { kind: "coach", at: at(1), text: "@Santé, tu regardes ?" },
  {
    kind: "consult_request",
    at: at(1),
    thread: "sthr_m",
    agent: "medical",
    text: "Brief",
  },
  {
    kind: "staff_message",
    at: at(2),
    thread: "sthr_m",
    agent: "medical",
    text: "Deux semaines sans descentes rapides.",
  },
  {
    kind: "consult_reply",
    at: at(2),
    thread: "sthr_m",
    agent: "medical",
    text: "Rapport au Coach",
  },
  {
    kind: "consult_request",
    at: at(3),
    thread: "sthr_d",
    agent: "director",
    text: "Brief",
  },
  {
    kind: "consult_reply",
    at: at(4),
    thread: "sthr_d",
    agent: "director",
    text: "On décale le bloc.",
  },
  {
    kind: "proposal",
    at: at(5),
    proposalId: proposalA,
    scope: "session",
    title: "Alléger deux semaines",
    summary: null,
    opinions: [],
  },
  {
    kind: "proposal",
    at: at(6),
    proposalId: proposalB,
    scope: "session",
    title: "Remplacer la sortie longue",
    summary: null,
    opinions: [],
  },
];

describe("main thread rotation", () => {
  const row = (
    status: Parameters<typeof mainSessionReusable>[0]["status"],
    lastTurnAt: string | null,
  ) => ({
    status,
    lastTurnAt,
    createdAt: "2026-10-15T07:00:00Z",
  });

  it("keeps today's session", () => {
    expect(
      mainSessionReusable(row("idle", "2026-10-16T06:00:00Z"), now, tz),
    ).toBe(true);
    expect(
      mainSessionReusable(row("failed", "2026-10-16T06:00:00Z"), now, tz),
    ).toBe(true);
  });

  it("starts a new session after a budget or a termination", () => {
    for (const status of ["budget_reached", "terminated"] as const)
      expect(
        mainSessionReusable(row(status, "2026-10-16T13:00:00Z"), now, tz),
      ).toBe(false);
  });

  it("starts a new session on a new local day", () => {
    expect(
      mainSessionReusable(row("idle", "2026-10-15T22:30:00Z"), now, tz),
    ).toBe(true);
    expect(
      mainSessionReusable(row("idle", "2026-10-15T21:30:00Z"), now, tz),
    ).toBe(false);
    expect(mainSessionReusable(row("timed_out", null), now, tz)).toBe(false);
  });

  it("keeps a session that waits on the athlete or is still working", () => {
    expect(
      mainSessionReusable(
        row("awaiting_athlete", "2026-10-14T08:00:00Z"),
        now,
        tz,
      ),
    ).toBe(true);
    expect(
      mainSessionReusable(row("running", "2026-10-15T08:00:00Z"), now, tz),
    ).toBe(true);
  });
});

describe("topic participants and counts", () => {
  it("is led by the Coach until a specialist speaks", () => {
    expect(topicLead(topic.slice(0, 3))).toBe("coach");
    expect(topicCompanions(topic.slice(0, 3))).toEqual([]);
  });

  it("is led by the first specialist who spoke, with the others alongside", () => {
    expect(topicLead(topic)).toBe("medical");
    expect(topicCompanions(topic)).toEqual(["coach", "director"]);
  });

  it("counts the messages the athlete sees", () => {
    expect(topicMessageCount(topic)).toBe(4);
  });

  it("counts accepted and applied proposals as decisions", () => {
    expect(
      topicDecisions(topic, { [proposalA]: "applied", [proposalB]: "ready" }),
    ).toEqual([{ proposalId: proposalA, title: "Alléger deux semaines" }]);
    expect(
      topicDecisions(topic, {
        [proposalA]: "accepted",
        [proposalB]: "rejected",
      }),
    ).toHaveLength(1);
    expect(decisionsLabel(0)).toBe("Aucune décision");
    expect(decisionsLabel(1)).toBe("1 décision");
    expect(decisionsLabel(2)).toBe("2 décisions");
  });
});

describe("topic list", () => {
  const summary = (overrides: Partial<TopicSummary>): TopicSummary => ({
    id: "a",
    title: "Sujet",
    lead: "coach",
    messages: 3,
    decisions: 0,
    lastActivityAt: "2026-10-16T12:00:00Z",
    closedAt: null,
    unread: false,
    ...overrides,
  });

  it("splits open and closed topics, most recent first", () => {
    const sections = topicSections([
      summary({ id: "old", lastActivityAt: "2026-10-10T08:00:00Z" }),
      summary({ id: "closed", closedAt: "2026-09-18T08:00:00Z" }),
      summary({ id: "new" }),
    ]);
    expect(sections.open.map((item) => item.id)).toEqual(["new", "old"]);
    expect(sections.closed.map((item) => item.id)).toEqual(["closed"]);
  });

  it("describes each row in French", () => {
    const closed = summary({
      lead: "medical",
      messages: 11,
      decisions: 2,
      closedAt: "2026-09-18T08:00:00Z",
    });
    expect(topicRowMeta(staff, closed)).toBe(
      "Santé · 11 messages · 2 décisions",
    );
    expect(topicRowDate(closed, now, tz)).toBe("clos le 18 sept.");
    expect(
      topicRowMeta(staff, summary({ lead: "strategist", messages: 14 })),
    ).toBe("Stratège de course · 14 messages");
    expect(topicRowDate(summary({}), now, tz)).toBe("14:00");
  });
});

describe("topic context and summary card", () => {
  it("tells the coach the topic and its race", () => {
    expect(
      topicContext("Préparer l’EcoTrail", {
        title: "EcoTrail 120K",
        date: "2027-03-20",
      }),
    ).toBe(
      "L’athlète a ouvert un sujet à part : « Préparer l’EcoTrail ». Course liée : EcoTrail 120K, le 2027-03-20. Reste sur ce sujet. La séance du jour, les alertes et le reste du quotidien se traitent dans le fil principal.",
    );
    expect(topicContext("Ma nutrition", null)).not.toContain("Course liée");
  });

  const card: ItemOf<"topic_summary"> = {
    kind: "topic_summary",
    at: "2026-09-30T16:40:00Z",
    topicId,
    title: "Tendon d’Achille en descente",
    openedAt: "2026-09-18T08:00:00Z",
    closedAt: "2026-09-30T16:40:00Z",
    lead: "medical",
    messages: 11,
    decisions: [{ proposalId: proposalA, title: "Alléger deux semaines" }],
    summary: "Gêne en descente après le 80K.",
  };

  it("stores and reads back the summary card", () => {
    const row = {
      kind: "topic_summary",
      body: itemBody(card),
      created_at: card.at,
    };
    expect(parseThreadItem(row)).toEqual(card);
    expect(
      parseThreadItem({ ...row, body: { ...itemBody(card), summary: 3 } }),
    ).toMatchObject({ summary: null });
  });

  it("shows the dates, decisions and message count", () => {
    expect(summaryCard(card, tz)).toEqual({
      topicId,
      heading: "Sujet clos · Tendon d’Achille en descente",
      range: "18 sept. → 30 sept.",
      lead: "medical",
      summary: "Gêne en descente après le 80K.",
      chips: ["1 décision", "11 messages"],
      href: `/coach/${topicId}`,
    });
    expect(summaryCard({ ...card, summary: null }, tz).summary).toBeNull();
  });

  it("places the card in the main timeline as its own entry", () => {
    const entries = buildThread({
      items: [{ kind: "coach", at: at(0), text: "Bonjour" }, card],
      live: false,
      pendingToolUseId: null,
    });
    expect(entries.map((entry) => entry.type)).toEqual([
      "staff",
      "topic_summary",
    ]);
  });
});

describe("topic summary skill", () => {
  it("summarizes what the athlete saw", async () => {
    const complete = vi.fn().mockResolvedValue({
      ok: true,
      output: { summary: "  Deux semaines sans descentes rapides.  " },
      usage: { promptTokens: 10, completionTokens: 5 },
    });
    expect(
      await summarizeTopic({ title: "Tendon", items: topic, complete }),
    ).toBe("Deux semaines sans descentes rapides.");
    const user = complete.mock.calls[0][0].user as string;
    expect(user).toContain("Sujet : Tendon");
    expect(user).toContain("Santé : Deux semaines sans descentes rapides.");
    expect(user).toContain("Directeur sportif : On décale le bloc.");
    expect(user).not.toContain("Rapport au Coach");
    expect(user).not.toContain("Brief");
  });

  it("returns no text when the model fails or the topic is empty", async () => {
    const failed = vi.fn().mockResolvedValue({ ok: false, status: 529 });
    expect(
      await summarizeTopic({ title: "Tendon", items: topic, complete: failed }),
    ).toBeNull();
    const empty = vi.fn();
    expect(
      await summarizeTopic({ title: "Vide", items: [], complete: empty }),
    ).toBeNull();
    expect(empty).not.toHaveBeenCalled();
    expect(topicTranscript([])).toBe("");
  });
});
