import { describe, expect, it } from "vitest";
import {
  proposalDecision,
  proposalStatusLine,
  type ProposalFacts,
} from "@/features/coach/proposal-card";
import { proposalPreview } from "@/features/coach/proposal-preview";
import { planState, thresholdSession } from "./plan-fixture";

const today = "2026-10-14";
const tz = "Europe/Paris";

const facts = (overrides: Partial<ProposalFacts> = {}): ProposalFacts => ({
  status: "ready",
  scope: "session",
  decisions: [],
  appliedVersion: null,
  activeVersion: 3,
  sessionDate: "2026-10-15",
  sessionMatched: false,
  successor: null,
  ...overrides,
});

const applied = (overrides: Partial<ProposalFacts> = {}) =>
  facts({
    status: "applied",
    appliedVersion: 4,
    activeVersion: 4,
    decisions: [
      { decision: "accepted", createdAt: "2026-10-14T05:05:00Z" },
      { decision: "applied", createdAt: "2026-10-14T05:05:02Z" },
    ],
    ...overrides,
  });

describe("proposalDecision", () => {
  it("keeps a ready proposal open until its session day", () => {
    expect(proposalDecision(facts(), today)).toEqual({
      state: "pending",
      decidedAt: null,
      canDecide: true,
      canUndo: false,
    });
    expect(proposalDecision(facts({ sessionDate: today }), today).state).toBe(
      "pending",
    );
  });

  it("expires a ready proposal once its session has passed", () => {
    expect(
      proposalDecision(facts({ sessionDate: "2026-10-13" }), today),
    ).toEqual({
      state: "expired",
      decidedAt: null,
      canDecide: false,
      canUndo: false,
    });
    expect(proposalDecision(facts({ status: "expired" }), today).state).toBe(
      "expired",
    );
  });

  it("shows an applied proposal as accepted at the athlete decision time", () => {
    expect(proposalDecision(applied(), today)).toEqual({
      state: "accepted",
      decidedAt: "2026-10-14T05:05:00Z",
      canDecide: false,
      canUndo: true,
    });
  });

  it("allows undo only while the plan and the session are untouched", () => {
    expect(proposalDecision(applied({ activeVersion: 5 }), today).canUndo).toBe(
      false,
    );
    expect(
      proposalDecision(applied({ sessionDate: "2026-10-13" }), today).canUndo,
    ).toBe(false);
    expect(
      proposalDecision(applied({ sessionMatched: true }), today).canUndo,
    ).toBe(false);
    expect(proposalDecision(applied({ scope: "plan" }), today).canUndo).toBe(
      false,
    );
    expect(
      proposalDecision(applied({ sessionDate: null }), today).canUndo,
    ).toBe(true);
  });

  it("waits while an accepted proposal is applied", () => {
    expect(proposalDecision(facts({ status: "accepted" }), today).state).toBe(
      "applying",
    );
  });

  it("records refusals and undos with their time", () => {
    expect(
      proposalDecision(
        facts({
          status: "rejected",
          decisions: [
            { decision: "rejected", createdAt: "2026-10-14T05:06:00Z" },
          ],
        }),
        today,
      ),
    ).toMatchObject({ state: "rejected", decidedAt: "2026-10-14T05:06:00Z" });
    expect(
      proposalDecision(
        applied({
          status: "reverted",
          decisions: [
            { decision: "accepted", createdAt: "2026-10-14T05:05:00Z" },
            { decision: "reverted", createdAt: "2026-10-14T05:09:00Z" },
          ],
        }),
        today,
      ),
    ).toMatchObject({
      state: "reverted",
      decidedAt: "2026-10-14T05:09:00Z",
      canUndo: false,
    });
  });

  it("shows a proposal replaced by an applied variant as modified", () => {
    expect(
      proposalDecision(
        facts({
          status: "superseded",
          successor: {
            status: "applied",
            title: "Décalée à jeudi, en 4 × 6’",
            decidedAt: "2026-10-14T05:06:00Z",
          },
        }),
        today,
      ),
    ).toMatchObject({ state: "modified", decidedAt: "2026-10-14T05:06:00Z" });
    expect(
      proposalDecision(
        facts({
          status: "superseded",
          successor: { status: "ready", title: "Variante", decidedAt: null },
        }),
        today,
      ).state,
    ).toBe("closed");
  });

  it("closes stale and invalid proposals", () => {
    expect(proposalDecision(facts({ status: "stale" }), today).state).toBe(
      "closed",
    );
  });
});

describe("proposalStatusLine", () => {
  const preview = { keep: "Seuil 5 × 6’" };

  it("names each decided state with its time and outcome", () => {
    const decided = (
      state: Parameters<typeof proposalStatusLine>[0]["state"],
    ) =>
      proposalStatusLine(
        { state, decidedAt: "2026-10-14T05:05:00Z" },
        { scope: "session", preview, successorTitle: "Décalée à jeudi" },
        tz,
      );
    expect(decided("accepted")).toEqual({
      label: "Acceptée · 07:05",
      tone: "ok",
      outcome: "Ta séance est mise à jour.",
    });
    expect(decided("rejected")).toEqual({
      label: "Refusée · 07:05",
      tone: "muted",
      outcome: "Tu gardes Seuil 5 × 6’.",
    });
    expect(decided("modified")).toEqual({
      label: "Modifiée · 07:05",
      tone: "ok",
      outcome: "Décalée à jeudi.",
    });
    expect(decided("expired")).toEqual({
      label: "Expirée",
      tone: "muted",
      outcome: "La séance est passée sans réponse.",
    });
    expect(decided("reverted")).toEqual({
      label: "Annulée · 07:05",
      tone: "muted",
      outcome: "Ta séance revient comme avant.",
    });
  });

  it("speaks about the plan when no single session is changed", () => {
    expect(
      proposalStatusLine(
        { state: "rejected", decidedAt: null },
        { scope: "plan", preview: null, successorTitle: null },
        tz,
      ),
    ).toEqual({
      label: "Refusée",
      tone: "muted",
      outcome: "Ton plan ne change pas.",
    });
  });
});

describe("proposalPreview", () => {
  const shorter = {
    ...thresholdSession(),
    title: "Seuil · 3 × 6'",
    targets: { ...thresholdSession().targets, durationSeconds: 2_850 },
    structure: thresholdSession().structure.map((step) =>
      step.type === "repeat" ? { ...step, count: 3 } : step,
    ),
  };
  const replace = [
    { op: "replace_session", sessionKey: "s-2026-10-15-1", content: shorter },
  ];

  it("describes the changed session of a pending proposal", () => {
    const preview = proposalPreview(replace, {
      state: planState(),
      applied: false,
      today,
    });
    expect(preview).toMatchObject({
      heading: "Seuil · 4 × 6'",
      meta: "48’",
      keep: "Seuil · 4 × 6'",
      sessionDate: "2026-10-15",
    });
    expect(preview?.blocks.filter((block) => block.zone >= 3)).toHaveLength(3);
  });

  it("reads the session from the plan once the proposal is applied", () => {
    const state = planState();
    state.sessions = state.sessions.map((session) =>
      session.sessionKey === "s-2026-10-15-1"
        ? {
            ...shorter,
            sessionKey: session.sessionKey,
            scheduledOn: session.scheduledOn,
          }
        : session,
    );
    expect(
      proposalPreview(replace, { state, applied: true, today }),
    ).toMatchObject({
      heading: "Seuil · 3 × 6'",
      meta: "48’",
      keep: null,
      sessionDate: "2026-10-15",
    });
  });

  it("gives no preview for changes spanning several sessions or none", () => {
    expect(
      proposalPreview(
        [
          { op: "skip_session", sessionKey: "s-2026-10-13-1" },
          { op: "skip_session", sessionKey: "s-2026-10-15-1" },
        ],
        { state: planState(), applied: false, today },
      ),
    ).toBeNull();
    expect(
      proposalPreview(replace, { state: null, applied: false, today }),
    ).toBeNull();
    expect(
      proposalPreview("nope", { state: planState(), applied: false, today }),
    ).toBeNull();
  });
});
