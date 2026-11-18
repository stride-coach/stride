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
    expect(view.summary).toEqual({
      proposals: 4,
      accepted: 2,
      modified: 0,
      rejected: 1,
    });
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

describe("modified proposals", () => {
  const build = (successorStatus: ProposalRecord["status"]) =>
    buildCoachDecisions({
      proposals: [
        proposal("1", "2026-10-07T08:00:00Z", {
          status: "superseded",
          successorStatus,
        }),
      ],
      timeZone: "Europe/Paris",
      now,
    });

  it("reads Modifiée when the proposal that replaced it was applied", () => {
    const view = build("applied");
    expect(view.months[0].entries[0].response).toEqual({
      kind: "modified",
      label: "Modifiée",
    });
    expect(view.months[0].entries[0].outcome).toBe(
      "Modifiée ensuite : la version retenue a été appliquée",
    );
    expect(view.summary).toMatchObject({ modified: 1, accepted: 0 });
  });

  it("keeps a replaced proposal unanswered when its successor was not applied", () => {
    expect(build("rejected").months[0].entries[0].response.kind).toBe(
      "unanswered",
    );
  });
});

describe("race proposals", () => {
  const race = (
    id: string,
    kind: "strategy" | "nutrition",
    status: "ready" | "accepted" | "rejected" | "superseded" | "stale",
    fields = {},
  ) => ({
    id,
    raceId: "r0r0r0r0-0000-4000-8000-000000000001",
    kind,
    title: `Course ${id}`,
    summary: "Tu commences à 50 g, on monte par paliers",
    status,
    createdAt: "2026-10-05T08:00:00Z",
    decidedAt: null,
    coachSessionId: null,
    ...fields,
  });

  const view = buildCoachDecisions({
    proposals: [proposal("p", "2026-10-07T08:00:00Z")],
    raceProposals: [
      race("n", "nutrition", "accepted", { decidedAt: "2026-10-05T09:15:00Z" }),
      race("s", "strategy", "rejected", {
        createdAt: "2026-10-01T08:00:00Z",
        decidedAt: "2026-10-03T10:00:00Z",
      }),
    ],
    timeZone: "Europe/Paris",
    now,
  });

  it("sits among the plan proposals by date, with the role its kind stores", () => {
    const entries = view.months[0].entries;
    expect(entries.map((entry) => entry.id)).toEqual(["p", "n", "s"]);
    expect(entries[1]).toMatchObject({
      role: "Nutrition",
      agent: "nutritionist",
      response: { kind: "accepted", label: "Acceptée" },
      answer: "Acceptée à 11:15",
      outcome: "Appliquée à ta course",
      proposedBy: "Nutrition",
      reason: "Tu commences à 50 g, on monte par paliers",
      sessionHref: null,
    });
    expect(entries[2]).toMatchObject({
      role: "Stratège de course",
      agent: "strategist",
      answer: "Refusée le 03/10/2026 à 12:00",
      outcome: "Rien n’a changé dans ta course",
    });
    expect(entries[0].agent).toBe("coach");
  });

  it("counts toward the summary and links the discussion to the race", () => {
    expect(view.summary).toMatchObject({
      proposals: 3,
      accepted: 1,
      rejected: 1,
    });
    expect(view.months[0].entries[1].discussHref).toContain(
      "race=r0r0r0r0-0000-4000-8000-000000000001",
    );
  });

  it("never invents a response for replaced or outdated proposals", () => {
    const stale = buildCoachDecisions({
      proposals: [],
      raceProposals: [
        race("a", "strategy", "superseded"),
        race("b", "strategy", "stale"),
      ],
      timeZone: "Europe/Paris",
      now,
    });
    expect(stale.months[0].entries.map((entry) => entry.response.kind)).toEqual(
      ["unanswered", "unanswered"],
    );
  });
});

describe("decision outcomes", () => {
  const baseline = Array.from({ length: 28 }, (_, index) => ({
    day: new Date(Date.parse("2026-09-01T00:00:00Z") + index * 86_400_000)
      .toISOString()
      .slice(0, 10),
    hrv: index % 2 === 0 ? 58 : 62,
    restingHeartRate: null,
  }));
  const wellness = [
    ...baseline,
    { day: "2026-09-29", hrv: 47, restingHeartRate: null },
    { day: "2026-09-30", hrv: 60, restingHeartRate: null },
    { day: "2026-10-04", hrv: 45, restingHeartRate: null },
    { day: "2026-10-05", hrv: 44, restingHeartRate: null },
    { day: "2026-10-06", hrv: 59, restingHeartRate: null },
  ];
  const matches = [
    {
      sessionKey: "s-2026-10-01-1",
      status: "completed",
      compliance: { duration: 0.96, distance: 0.92, intensity: null },
    },
  ];
  const view = buildCoachDecisions({
    proposals: [
      proposal("followed", "2026-09-29T05:20:00Z", {
        planId: "plan-active",
        origin: "recovery",
        status: "applied",
        decisions: [athlete("accepted", "2026-09-29T06:00:00Z")],
        operations: [{ op: "skip_session", sessionKey: "s-2026-10-01-1" }],
      }),
      proposal("refused", "2026-10-04T05:20:00Z", {
        origin: "recovery",
        status: "rejected",
      }),
      proposal("plain", "2026-10-02T05:20:00Z", {
        status: "applied",
        decisions: [athlete("accepted", "2026-10-02T06:00:00Z")],
      }),
    ],
    signals: { planId: "plan-active", wellness, matches },
    timeZone: "Europe/Paris",
    now,
  });
  const outcome = (id: string) =>
    view.months
      .flatMap((month) => month.entries)
      .find((entry) => entry.id === id)?.outcome;

  it("says what the session and the metric did, from stored data only", () => {
    expect(outcome("followed")).toBe(
      "Séance conforme à 94\u00a0% · VFC revenue dans ta plage le lendemain",
    );
    expect(outcome("refused")).toBe("VFC revenue dans ta plage après 2 jours");
  });

  it("ignores the matches of another plan than the one the proposal changed", () => {
    const other = buildCoachDecisions({
      proposals: [
        proposal("old", "2026-09-29T05:20:00Z", {
          planId: "plan-replaced",
          status: "applied",
          operations: [{ op: "skip_session", sessionKey: "s-2026-10-01-1" }],
        }),
      ],
      signals: { planId: "plan-active", wellness: [], matches },
      timeZone: "Europe/Paris",
      now,
    });
    expect(other.months[0].entries[0].outcome).not.toContain("conforme");
  });

  it("falls back on the status sentence without any stored signal", () => {
    expect(outcome("plain")).toBe("Appliquée à ton plan (Sur v2)");
  });

  it("summarizes how fast the metric came back by response", () => {
    expect(view.recovery).toEqual({
      groups: [
        {
          kind: "accepted",
          label: "Suivie",
          cases: 1,
          away: 0,
          days: "1 jour",
        },
        {
          kind: "rejected",
          label: "Refusée",
          cases: 1,
          away: 0,
          days: "2 jours",
        },
      ],
      caution:
        "Deux cas seulement : une tendance à surveiller, pas une preuve.",
    });
  });

  it("has no range summary without signals", () => {
    expect(
      buildCoachDecisions({
        proposals: [proposal("x", "2026-10-07T08:00:00Z")],
        timeZone: "Europe/Paris",
        now,
      }).recovery,
    ).toBeNull();
  });
});

describe("authorship", () => {
  const accepted = {
    status: "applied" as const,
    decisions: [athlete("accepted", "2026-10-04T09:30:00Z")],
  };
  const entry = (fields: Partial<ProposalRecord>) =>
    buildCoachDecisions({
      proposals: [proposal("1", "2026-10-04T08:00:00Z", fields)],
      timeZone: "Europe/Paris",
      now,
    }).months[0].entries[0];

  it("shows the role that led the proposal, Coach when nobody declared one", () => {
    expect(entry({ ledBy: "medical" })).toMatchObject({
      role: "Santé",
      agent: "medical",
    });
    expect(entry({ ledBy: null })).toMatchObject({
      role: "Coach",
      agent: "coach",
    });
    expect(entry({})).toMatchObject({ role: "Coach", agent: "coach" });
  });

  it("keeps the Coach as the author of the proposal even when a specialist led it", () => {
    expect(
      entry({
        ledBy: "nutritionist",
        specialistOpinions: [
          { specialist: "nutritionist", verdict: "ok", summary: "ok" },
        ],
      }).proposedBy,
    ).toBe("Coach, avec l’avis de Nutrition");
  });

  it("reads À ta demande only for an accepted proposal the athlete asked for", () => {
    const asked = entry({ ...accepted, initiatedBy: "athlete" });
    expect(asked.response).toEqual({
      kind: "accepted",
      label: "À ta demande",
    });
    expect(asked.answer).toBe("Acceptée à 11:30");
    expect(entry({ ...accepted, initiatedBy: "staff" }).response.label).toBe(
      "Acceptée",
    );
    expect(entry({ ...accepted }).response.label).toBe("Acceptée");
    expect(entry({ initiatedBy: "athlete" }).response).toEqual({
      kind: "pending",
      label: "En attente",
    });
    expect(
      entry({ status: "rejected", initiatedBy: "athlete" }).response.label,
    ).toBe("Refusée");
  });

  it("counts an asked proposal among the accepted ones, and only once it is accepted", () => {
    const view = buildCoachDecisions({
      proposals: [
        proposal("1", "2026-10-04T08:00:00Z", {
          ...accepted,
          initiatedBy: "athlete",
        }),
        proposal("2", "2026-10-05T08:00:00Z", { initiatedBy: "athlete" }),
        proposal("3", "2026-10-06T08:00:00Z", {
          status: "rejected",
          initiatedBy: "athlete",
        }),
      ],
      timeZone: "Europe/Paris",
      now,
    });
    expect(view.summary).toMatchObject({ accepted: 1, rejected: 1 });
  });
});
