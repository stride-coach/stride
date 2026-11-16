import { describe, expect, it } from "vitest";
import {
  buildCoachDecisions,
  decisionOutcome,
  decisionResponse,
  monthCountLabel,
  selectDecision,
} from "../../src/features/coach/decisions";
import type { ProposalRecord } from "../../src/features/plans/review/proposal";

const now = new Date("2026-10-20T10:00:00Z");

function proposal(
  id: string,
  createdAt: string,
  fields: Partial<ProposalRecord> = {},
): ProposalRecord {
  return {
    id,
    title: `Proposition ${id}`,
    summary: null,
    rationale: null,
    scope: "session",
    origin: "training",
    status: "ready",
    operations: [],
    baseVersion: 2,
    appliedVersion: null,
    createdAt,
    updatedAt: createdAt,
    specialistOpinions: [],
    coachSessionId: null,
    decisions: [],
    ...fields,
  };
}

const athlete = (decision: string, createdAt: string) => ({
  decision,
  actor: "athlete",
  note: null,
  resultingVersion: null,
  createdAt,
});

describe("decision response", () => {
  it("maps the athlete's own decision, not the lifecycle status", () => {
    expect(decisionResponse(proposal("a", "2026-10-07T05:00:00Z"))).toEqual({
      kind: "pending",
      label: "En attente",
    });
    expect(
      decisionResponse(
        proposal("b", "2026-10-07T05:00:00Z", {
          status: "stale",
          decisions: [athlete("accepted", "2026-10-07T06:00:00Z")],
        }),
      ).kind,
    ).toBe("accepted");
    expect(
      decisionResponse(
        proposal("c", "2026-10-07T05:00:00Z", { status: "rejected" }),
      ).label,
    ).toBe("Refusée");
  });

  it("never invents a response for proposals nobody answered", () => {
    for (const status of ["expired", "superseded"] as const)
      expect(
        decisionResponse(proposal("d", "2026-10-07T05:00:00Z", { status })),
      ).toEqual({ kind: "unanswered", label: "Sans réponse" });
  });

  it("describes what happened to the plan", () => {
    expect(
      decisionOutcome(
        proposal("e", "2026-10-07T05:00:00Z", {
          status: "applied",
          appliedVersion: 4,
        }),
      ),
    ).toBe("Appliquée à ton plan (v2 → v4)");
    expect(
      decisionOutcome(
        proposal("f", "2026-10-07T05:00:00Z", { status: "stale" }),
      ),
    ).toContain("rien n’a été appliqué");
  });
});

describe("decisions view", () => {
  const proposals = [
    proposal("1", "2026-09-28T08:00:00Z", { status: "applied" }),
    proposal("2", "2026-10-04T08:00:00Z", {
      status: "applied",
      decisions: [athlete("accepted", "2026-10-04T09:30:00Z")],
    }),
    proposal("3", "2026-10-07T08:00:00Z"),
    proposal("4", "2026-10-01T08:00:00Z", {
      status: "rejected",
      decisions: [athlete("rejected", "2026-10-02T09:00:00Z")],
    }),
    proposal("5", "2026-10-05T08:00:00Z", { status: "draft" }),
  ];
  const view = buildCoachDecisions({
    proposals,
    timeZone: "Europe/Paris",
    now,
  });

  it("groups by month, newest first, and leaves drafts out", () => {
    expect(view.months.map((month) => month.label)).toEqual([
      "Octobre 2026",
      "Septembre 2026",
    ]);
    expect(view.months[0].entries.map((entry) => entry.id)).toEqual([
      "3",
      "2",
      "4",
    ]);
    expect(monthCountLabel(view.months[0].count)).toBe("3 propositions");
    expect(monthCountLabel(1)).toBe("1 proposition");
  });

  it("counts the last 30 days from the response", () => {
    expect(view.summary).toEqual({ proposals: 4, accepted: 2, rejected: 1 });
  });

  it("formats the answer time in the athlete's zone", () => {
    const entry = view.months[0].entries[1];
    expect(entry.day).toBe("Dim. 4 oct.");
    expect(entry.answer).toBe("Acceptée à 11:30");
  });

  it("steps within a month", () => {
    expect(selectDecision(view, "2")).toMatchObject({
      position: 2,
      total: 3,
      monthLabel: "octobre 2026",
      previousId: "3",
      nextId: "4",
    });
    expect(selectDecision(view, "unknown")).toBeNull();
  });

  it("links to the exchange and the session only when they exist", () => {
    const linked = buildCoachDecisions({
      proposals: [
        proposal("6", "2026-10-07T08:00:00Z", {
          coachSessionId: "c0c0c0c0-0000-4000-8000-000000000001",
          operations: [{ op: "skip_session", sessionKey: "w1-d2" }],
        }),
      ],
      timeZone: "Europe/Paris",
      now,
    }).months[0].entries[0];
    expect(linked.exchangeHref).toBe(
      "/coach/c0c0c0c0-0000-4000-8000-000000000001",
    );
    expect(linked.sessionHref).toBe("/plan/sessions/w1-d2");
    expect(view.months[0].entries[0].exchangeHref).toBeNull();
    expect(view.months[0].entries[0].sessionHref).toBeNull();
  });
});
