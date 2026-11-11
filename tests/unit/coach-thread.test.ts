import { describe, expect, it } from "vitest";
import {
  dayLabel,
  listDateLabel,
  staffReads,
  suiviParticipants,
  suiviTimeline,
  threadParticipants,
  threadStatus,
} from "../../src/features/coach/conversations";
import {
  itemBody,
  parseThreadItem,
  type ThreadItem,
} from "../../src/features/coach/items";
import { readLabel } from "../../src/features/coach/reads";
import {
  agentOfManagedName,
  groupLine,
  staff as defaultStaff,
} from "../../src/features/coach/staff";
import {
  buildThread,
  questionAttribution,
  replyToLabel,
  retryableMessage,
  splitMentions,
  typingLabel,
} from "../../src/features/coach/thread";

const at = (minute: number) =>
  `2026-10-16T12:${String(minute).padStart(2, "0")}:00Z`;
const tz = "Europe/Paris";
const proposalId = "d0000000-0000-4000-8000-00000000000d";

const consultTurn: ThreadItem[] = [
  {
    kind: "athlete",
    at: at(0),
    text: "J’ai mal au genou",
    consult: "medical",
    attachments: [],
  },
  { kind: "coach", at: at(1), text: "Je demande à Santé." },
  {
    kind: "consult_request",
    at: at(1),
    thread: "sthr_m",
    agent: "medical",
    text: "Knee pain?",
  },
  {
    kind: "read",
    at: at(2),
    thread: "sthr_m",
    agent: "medical",
    tool: "read_health_reports",
    label: "Signalements · 14 jours",
  },
  {
    kind: "read",
    at: at(2),
    thread: "primary",
    agent: "coach",
    tool: "read_athlete_context",
    label: "Profil et contexte",
  },
];

const options = ["Aucune gêne", "Gêne légère", "Douleur qui m’arrête"];

const consultDone: ThreadItem[] = [
  ...consultTurn,
  {
    kind: "question",
    at: at(3),
    toolUseId: "sevt_ask",
    question: "Comment réagit ton genou en descente ?",
    options,
    askedFor: "medical",
  },
];

const answered: ThreadItem[] = [
  ...consultDone,
  { kind: "answer", at: at(5), toolUseId: "sevt_ask", text: "Aucune gêne" },
  {
    kind: "read",
    at: at(5),
    thread: "sthr_m",
    agent: "medical",
    tool: "read_athlete_context",
    label: "Profil et contexte",
  },
  {
    kind: "consult_reply",
    at: at(6),
    thread: "sthr_m",
    agent: "medical",
    text: "@Jules Alors c’est compatible.",
  },
  { kind: "consult_end", at: at(6), thread: "sthr_m", agent: "medical" },
  { kind: "coach", at: at(7), text: "On garde le plan." },
];

function view(
  items: ThreadItem[],
  live = false,
  pending: string | null = null,
) {
  return buildThread({ items, live, pendingToolUseId: pending });
}

describe("thread items", () => {
  it("round-trips a stored row and rejects unknown kinds", () => {
    const item = consultDone[2];
    expect(
      parseThreadItem({
        kind: item.kind,
        body: itemBody(item),
        created_at: item.at,
      }),
    ).toEqual(item);
    expect(
      parseThreadItem({ kind: "tool", body: {}, created_at: at(0) }),
    ).toBeNull();
    expect(
      parseThreadItem({ kind: "coach", body: { nope: 1 }, created_at: at(0) }),
    ).toBeNull();
  });
});

describe("thread view model", () => {
  it("shows the Coach hand-off and the specialist typing while it works", () => {
    const entries = view(consultTurn, true);
    expect(entries.map((entry) => entry.type)).toEqual([
      "athlete",
      "staff",
      "typing",
    ]);
    expect(entries[1]).toMatchObject({
      agent: "coach",
      blocks: [{ type: "text", text: "Je demande à Santé." }],
    });
    expect(entries[2]).toMatchObject({
      agent: "medical",
      read: "Signalements · 14 jours",
    });
    expect(typingLabel(defaultStaff.medical, "Signalements · 14 jours")).toBe(
      "Santé lit signalements · 14 jours…",
    );
    expect(typingLabel(defaultStaff.medical, null)).toBe("Santé écrit…");
  });

  it("never shows the brief between agents or a typing entry once reloaded", () => {
    const entries = view(consultTurn);
    expect(entries.map((entry) => entry.type)).toEqual(["athlete", "staff"]);
    expect(JSON.stringify(entries)).not.toContain("Knee pain?");
  });

  it("shows a specialist question with its options under the specialist’s name", () => {
    const entries = view(consultDone, true, "sevt_ask");
    expect(entries.map((entry) => entry.type)).toEqual([
      "athlete",
      "staff",
      "staff",
    ]);
    expect(entries[2]).toMatchObject({
      agent: "medical",
      reads: ["Signalements · 14 jours"],
      blocks: [
        {
          type: "question",
          options,
          askedFor: "medical",
          state: "pending",
          answer: null,
        },
      ],
    });
    expect(questionAttribution(defaultStaff.medical)).toBe("Question de Santé");
    expect(questionAttribution(defaultStaff.coach)).toBe("Question du Coach");
  });

  it("routes the answer to the specialist and shows its reply as its own message", () => {
    const entries = view(answered);
    expect(entries.map((entry) => entry.type)).toEqual([
      "athlete",
      "staff",
      "staff",
      "athlete",
      "staff",
      "staff",
    ]);
    expect(entries[0]).toMatchObject({ consult: "medical", replyTo: null });
    expect(entries[2]).toMatchObject({
      blocks: [{ state: "answered", answer: "Aucune gêne", answeredAt: at(5) }],
    });
    expect(entries[3]).toMatchObject({
      replyTo: "medical",
      text: "Aucune gêne",
    });
    expect(replyToLabel(defaultStaff.medical)).toBe("En réponse à Santé");
    expect(entries[4]).toMatchObject({
      agent: "medical",
      reads: ["Profil et contexte"],
      blocks: [{ type: "text", text: "@Jules Alors c’est compatible." }],
    });
    expect(entries[5]).toMatchObject({
      agent: "coach",
      blocks: [{ type: "text", text: "On garde le plan." }],
    });
  });

  it("shows a specialist's message to the athlete and hides its report to the coach", () => {
    const items: ThreadItem[] = [
      ...answered.slice(0, -3),
      {
        kind: "staff_message",
        at: at(6),
        thread: "sthr_m",
        agent: "medical",
        text: "@Jules Tu peux courir à plat.",
      },
      {
        kind: "consult_reply",
        at: at(6),
        thread: "sthr_m",
        agent: "medical",
        text: "Limites : pas de descente jusqu’au 31/10.",
      },
      { kind: "consult_end", at: at(6), thread: "sthr_m", agent: "medical" },
    ];
    const entries = view(items, true);
    expect(entries.at(-1)).toMatchObject({
      type: "staff",
      agent: "medical",
      blocks: [{ type: "text", text: "@Jules Tu peux courir à plat." }],
    });
    expect(JSON.stringify(entries)).not.toContain("Limites");
    expect(suiviParticipants(defaultStaff, items)[1]).toMatchObject({
      messages: 2,
    });
    expect(
      suiviTimeline({
        staff: defaultStaff,
        items,
        status: null,
        pendingToolUseId: null,
        proposalStatuses: {},
        timeZone: tz,
      }).filter((step) => step.label === "Réponse de Santé"),
    ).toHaveLength(1);
  });

  it("reads old athlete rows without attachments and keeps sent ones", () => {
    expect(
      parseThreadItem({
        kind: "athlete",
        body: { text: "Salut", consult: null },
        created_at: at(0),
      }),
    ).toMatchObject({ attachments: [] });
    const attachments = [
      {
        kind: "race" as const,
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        title: "Trail des Lacs",
        date: "2027-06-27",
      },
    ];
    const parsed = parseThreadItem({
      kind: "athlete",
      body: { text: "Analyse ça", consult: null, attachments },
      created_at: at(0),
    });
    expect(parsed).toMatchObject({ attachments });
    expect(view([parsed!])[0]).toMatchObject({
      type: "athlete",
      attachments,
    });
  });

  it("keeps old stored questions without options readable", () => {
    const parsed = parseThreadItem({
      kind: "question",
      body: {
        toolUseId: "sevt_old",
        question: "Tu as mal ?",
        askedFor: "coach",
      },
      created_at: at(0),
    });
    expect(parsed).toMatchObject({ options: [] });
  });

  it("does not answer for the Coach when the Coach asked", () => {
    const entries = view([
      {
        kind: "athlete",
        at: at(0),
        text: "Plan ?",
        consult: null,
        attachments: [],
      },
      {
        kind: "question",
        at: at(1),
        toolUseId: "sevt_c",
        question: "Combien de séances ?",
        options: [],
        askedFor: "coach",
      },
      { kind: "answer", at: at(2), toolUseId: "sevt_c", text: "Quatre" },
    ]);
    expect(entries[2]).toMatchObject({ type: "athlete", replyTo: null });
  });

  it("closes an unanswered question that is no longer pending", () => {
    expect(view(consultDone).at(-1)).toMatchObject({
      blocks: [{ state: "closed" }],
    });
  });

  it("offers to resend the athlete message behind a failed turn", () => {
    const failed: ThreadItem = {
      kind: "error",
      at: at(5),
      code: "failed",
      text: "Le coach a rencontré un problème.",
    };
    expect(retryableMessage([...consultTurn.slice(0, 2), failed])).toEqual({
      text: "J’ai mal au genou",
      consult: true,
      attachments: [],
    });
    expect(
      retryableMessage([consultTurn[0], { ...failed, code: "budget_reached" }]),
    ).toBeNull();
    expect(retryableMessage(consultTurn.slice(0, 2))).toBeNull();
    expect(
      retryableMessage([
        consultTurn[0],
        { kind: "answer", at: at(4), toolUseId: "sevt_1", text: "Oui" },
        failed,
      ]),
    ).toBeNull();
  });

  it("splits mentions out of message text", () => {
    expect(splitMentions("@Santé, tu vois avec @Jules ?")).toEqual([
      "",
      "@Santé",
      ", tu vois avec ",
      "@Jules",
      " ?",
    ]);
    expect(splitMentions("@Stratège de course, regarde le profil")).toEqual([
      "",
      "@Stratège de course",
      ", regarde le profil",
    ]);
  });

  it("shows a proposal card with its stored status", () => {
    const items: ThreadItem[] = [
      {
        kind: "athlete",
        at: at(0),
        text: "Fais-moi un plan",
        consult: null,
        attachments: [],
      },
      {
        kind: "proposal",
        at: at(9),
        proposalId,
        scope: "new_plan",
        title: "Marathon",
        summary: null,
        opinions: [],
      },
    ];
    const card = (status?: string) =>
      buildThread({
        items,
        live: false,
        pendingToolUseId: null,
        proposalStatuses: status ? { [proposalId]: status } : {},
      })[1];
    expect(card()).toMatchObject({ blocks: [{ status: "pending" }] });
    expect(card("applied")).toMatchObject({ blocks: [{ status: "applied" }] });
    expect(card("rejected")).toMatchObject({
      blocks: [{ status: "rejected" }],
    });
    expect(card("stale")).toMatchObject({ blocks: [{ status: "closed" }] });
  });

  it("shows a race strategy proposal under the strategist", () => {
    const raceId = "e0000000-0000-4000-8000-00000000000e";
    const entries = buildThread({
      items: [
        {
          kind: "proposal",
          at: at(9),
          proposalId,
          scope: "race_strategy",
          raceId,
          agent: "strategist",
          title: "Stratégie de course",
          summary: null,
          opinions: [],
        },
      ],
      live: false,
      pendingToolUseId: null,
      proposalStatuses: { [proposalId]: "applied" },
    });
    expect(entries[0]).toMatchObject({
      agent: "strategist",
      blocks: [{ scope: "race_strategy", raceId, status: "applied" }],
    });
    expect(
      parseThreadItem({
        kind: "proposal",
        body: {
          proposalId,
          scope: "race_strategy",
          raceId,
          title: "S",
          summary: null,
        },
        created_at: at(0),
      }),
    ).toMatchObject({ scope: "race_strategy", raceId });
  });

  it("shows a turn error inside a Coach message", () => {
    const entries = view([
      {
        kind: "athlete",
        at: at(0),
        text: "Salut",
        consult: null,
        attachments: [],
      },
      { kind: "error", at: at(1), code: "timeout", text: "Trop long" },
    ]);
    expect(entries[1]).toMatchObject({
      agent: "coach",
      blocks: [{ type: "error", text: "Trop long" }],
    });
  });
});

describe("conversations", () => {
  const now = new Date("2026-10-16T14:00:00Z");

  it("derives the status shown in the list", () => {
    const base = { lastTurnAt: now.toISOString(), now, proposalStatuses: [] };
    expect(threadStatus({ ...base, state: "running" })).toBe("working");
    expect(
      threadStatus({
        ...base,
        state: "running",
        lastTurnAt: "2026-10-16T13:00:00Z",
      }),
    ).toBeNull();
    expect(threadStatus({ ...base, state: "awaiting_athlete" })).toBe(
      "question",
    );
    expect(
      threadStatus({ ...base, state: "idle", proposalStatuses: ["ready"] }),
    ).toBe("proposal");
    expect(
      threadStatus({ ...base, state: "idle", proposalStatuses: ["applied"] }),
    ).toBe("applied");
    expect(threadStatus({ ...base, state: "budget_reached" })).toBe("closed");
  });

  it("formats French dates", () => {
    expect(listDateLabel("2026-10-12T08:00:00Z", now, tz)).toBe("lun.");
    expect(dayLabel("2026-10-16T08:00:00Z", now, tz)).toBe(
      "Aujourd’hui · ven. 16 oct.",
    );
  });

  it("summarizes participants, reads, preview and timeline for Suivi", () => {
    expect(threadParticipants(consultDone)).toEqual(["coach", "medical"]);
    expect(staffReads(consultDone)).toEqual([
      "Signalements · 14 jours",
      "Profil et contexte",
    ]);
    expect(suiviParticipants(defaultStaff, answered)).toEqual([
      { agent: "coach", role: "Mène", messages: 0 },
      { agent: "medical", role: "Consulté", messages: 2 },
    ]);
    const steps = suiviTimeline({
      staff: defaultStaff,
      items: consultDone,
      status: "question",
      pendingToolUseId: "sevt_ask",
      proposalStatuses: {},
      timeZone: tz,
    });
    expect(steps.map((step) => [step.label, step.state])).toEqual([
      ["Ta demande", "done"],
      ["Réponse du Coach", "done"],
      ["Le Coach passe la main à Santé", "done"],
      ["Question de Santé", "current"],
      ["Réponse de Santé", "upcoming"],
    ]);
  });

  it("follows every turn of the thread in Déroulé", () => {
    const items: ThreadItem[] = [
      ...consultDone,
      { kind: "answer", at: at(5), toolUseId: "sevt_ask", text: "Non" },
      { kind: "coach", at: at(6), text: "Je relance Inès." },
      {
        kind: "consult_request",
        at: at(6),
        thread: "sthr_m",
        agent: "medical",
        text: "No downhill pain.",
      },
      {
        kind: "consult_reply",
        at: at(7),
        thread: "sthr_m",
        agent: "medical",
        text: "Fine.",
      },
      { kind: "coach", at: at(8), text: "**Verdict** : on continue." },
      {
        kind: "proposal",
        at: at(9),
        proposalId,
        scope: "session",
        title: "Séance allégée",
        summary: null,
        opinions: [],
      },
    ];
    const timeline = (
      status: "working" | "proposal" | null,
      decided?: string,
    ) =>
      suiviTimeline({
        staff: defaultStaff,
        items,
        status,
        pendingToolUseId: null,
        proposalStatuses: decided ? { [proposalId]: decided } : {},
        timeZone: tz,
      }).map((step) => [step.label, step.state]);
    expect(timeline("proposal")).toEqual([
      ["Ta demande", "done"],
      ["Réponse du Coach", "done"],
      ["Le Coach passe la main à Santé", "done"],
      ["Question de Santé", "done"],
      ["Ta réponse à Santé", "done"],
      ["Le Coach passe la main à Santé", "done"],
      ["Réponse de Santé", "done"],
      ["Réponse du Coach", "done"],
      ["Proposition du staff", "done"],
      ["À toi de décider", "current"],
    ]);
    expect(timeline(null, "applied").at(-1)).toEqual([
      "Ta décision",
      "current",
    ]);
    const last = suiviTimeline({
      staff: defaultStaff,
      items,
      status: null,
      pendingToolUseId: null,
      proposalStatuses: { [proposalId]: "applied" },
      timeZone: tz,
    }).at(-1);
    expect(last).toMatchObject({ tone: "neutral", hint: "Dernière étape" });
    const working = timeline("working", "applied");
    expect(working.slice(-3)).toEqual([
      ["Ta décision", "done"],
      ["Le staff travaille", "current"],
      ["Réponse du Coach", "upcoming"],
    ]);
    expect(working.filter(([, state]) => state === "current")).toHaveLength(1);
  });
});

describe("staff and reads", () => {
  it("maps Managed Agents names to staff", () => {
    expect(agentOfManagedName("Stride Medical")).toBe("medical");
    expect(agentOfManagedName("Other")).toBeNull();
  });

  it("labels the data the staff read", () => {
    expect(readLabel("custom", "read_health_reports", { days: 7 })).toBe(
      "Signalements · 7 jours",
    );
    expect(readLabel("custom", "ask_athlete", {})).toBeNull();
    expect(readLabel("garmin", "get_sleep_data", {})).toBe("Garmin · Sommeil");
  });
});

describe("staff roles", () => {
  it("names each role without a first name and in French grammar", () => {
    expect(defaultStaff.medical).toMatchObject({
      name: "Santé",
      subject: "Santé",
      of: "de Santé",
      to: "à Santé",
    });
    expect(defaultStaff.coach).toMatchObject({
      name: "Coach",
      subject: "Le Coach",
      of: "du Coach",
      to: "au Coach",
    });
    expect(questionAttribution(defaultStaff.strategist)).toBe(
      "Question du Stratège de course",
    );
  });

  it("tells the model the roles, never first names", () => {
    expect(groupLine(defaultStaff, "Jules")).toBe(
      "Rôles dans ce groupe, sans prénom : Coach, Santé, Directeur sportif, Stratège de course, Nutrition. Athlète : Jules.",
    );
  });
});
