import { describe, expect, it } from "vitest";
import { planEffect, planEffectRequest } from "@/features/races/plan-effect";

const proposal = (status: string) => ({
  id: "p1",
  status,
  title: "Intégrer le Trail de Chevreuse",
  summary: "Allège les trois jours d’avant.",
});

describe("plan effect of a new race", () => {
  it("waits while the coach works", () => {
    expect(planEffect({ sessionStatus: null, proposal: null })).toEqual({
      state: "working",
    });
    expect(planEffect({ sessionStatus: "running", proposal: null })).toEqual({
      state: "working",
    });
  });

  it("shows the proposal once it is ready, even if the session runs on", () => {
    expect(
      planEffect({ sessionStatus: "running", proposal: proposal("ready") }),
    ).toEqual({
      state: "ready",
      proposal: {
        id: "p1",
        title: "Intégrer le Trail de Chevreuse",
        summary: "Allège les trois jours d’avant.",
      },
    });
  });

  it("reports a decision, a question, no change or a failure", () => {
    expect(
      planEffect({ sessionStatus: "idle", proposal: proposal("applied") }),
    ).toEqual({ state: "decided", applied: true });
    expect(
      planEffect({ sessionStatus: "idle", proposal: proposal("rejected") }),
    ).toEqual({ state: "decided", applied: false });
    expect(
      planEffect({ sessionStatus: "awaiting_athlete", proposal: null }),
    ).toEqual({ state: "question" });
    expect(planEffect({ sessionStatus: "idle", proposal: null })).toEqual({
      state: "unchanged",
    });
    expect(planEffect({ sessionStatus: "timed_out", proposal: null })).toEqual({
      state: "failed",
    });
  });

  it("asks the coach for a proposal to review", () => {
    expect(
      planEffectRequest({
        name: "Trail de Chevreuse 45K",
        priority: "B",
        date: "24 janvier 2027",
      }),
    ).toBe(
      "J’ajoute Trail de Chevreuse 45K, course B, le 24 janvier 2027. Regarde où elle tombe dans mon plan et propose-moi les changements à relire avant de les appliquer.",
    );
  });
});
