import { describe, expect, it } from "vitest";
import {
  changeCountLabel,
  nutritionChanges,
  nutritionProposalSchema,
  paceFactorsOf,
  raceProposalRowSchema,
  raceStrategySchema,
  strategyChanges,
  type ReviewSegment,
} from "@/features/races/proposals";

const first = "11111111-1111-4111-8111-111111111111";
const second = "22222222-2222-4222-8222-222222222222";
const gel = "33333333-3333-4333-8333-333333333333";

const segments: ReviewSegment[] = [
  {
    id: first,
    label: "T1 · Départ → Ravito 1",
    currentSeconds: 7200,
    proposedSeconds: 7560,
    currentPace: 425,
    proposedPace: 446,
  },
  {
    id: second,
    label: "T2 · Ravito 1 → Arrivée",
    currentSeconds: 3600,
    proposedSeconds: 3240,
    currentPace: 400,
    proposedPace: 360,
  },
];

describe("race strategy proposals", () => {
  it("bounds the instructions and pace factors", () => {
    expect(
      raceStrategySchema.safeParse({
        consignes: Array.from({ length: 7 }, (_, index) => `Consigne ${index}`),
        segments: {},
      }).success,
    ).toBe(false);
    expect(
      raceStrategySchema.safeParse({
        consignes: [],
        segments: { [first]: { paceFactor: 1.3 } },
      }).success,
    ).toBe(false);
    expect(
      raceStrategySchema.safeParse({
        consignes: ["Pars lentement."],
        segments: {
          [first]: { note: "Reste sous 150 bpm.", paceFactor: 1.05 },
        },
      }).success,
    ).toBe(true);
  });

  it("keeps only the pace factors that change the simulation", () => {
    expect(
      paceFactorsOf({
        consignes: [],
        segments: {
          [first]: { paceFactor: 1.05 },
          [second]: { paceFactor: 1, note: "Relance." },
        },
      }),
    ).toEqual({ [first]: 1.05 });
  });

  it("lists every changed instruction, note and pace with its effect", () => {
    const changes = strategyChanges(
      { consignes: ["Pars lentement."], segments: {} },
      {
        consignes: ["Pars lentement.", "Base de vie en 15 min."],
        segments: {
          [first]: { note: "Reste sous 150 bpm.", paceFactor: 1.05 },
        },
      },
      segments,
    );
    expect(changes.map((change) => change.label)).toEqual([
      "Consignes du stratège",
      "T1 · Départ → Ravito 1 · consigne",
      "T1 · Départ → Ravito 1 · allure",
    ]);
    expect(changes[2].before).toEqual([
      "Allure de la simulation",
      "2h · 7:05 /km en courant",
    ]);
    expect(changes[2].after).toEqual([
      "5 % plus prudent",
      "2h06 · 7:26 /km en courant",
    ]);
    expect(changeCountLabel(changes.length)).toBe("3 changements proposés");
    expect(changeCountLabel(1)).toBe("1 changement proposé");
  });

  it("finds no change when the proposal repeats the strategy", () => {
    const strategy = {
      consignes: ["Pars lentement."],
      segments: { [second]: { note: "Relance." } },
    };
    expect(strategyChanges(strategy, strategy, segments)).toEqual([]);
  });
});

describe("race nutrition proposals", () => {
  const targets = {
    carbsPerHourG: 60,
    waterMlPerHour: 450,
    sodiumMgPerHour: 500,
    caffeineMaxMg: 200,
    nightCaffeine: true,
    flaskMl: 500,
    flaskCount: 2,
    bladderMl: null,
  };

  it("needs targets or a plan", () => {
    expect(nutritionProposalSchema.safeParse({}).success).toBe(false);
    expect(
      nutritionProposalSchema.safeParse({ targets: { carbsPerHourG: 75 } })
        .success,
    ).toBe(true);
    expect(
      nutritionProposalSchema.safeParse({ targets: { carbsPerHourG: 150 } })
        .success,
    ).toBe(false);
  });

  it("lists target and per-segment changes with product names", () => {
    const changes = nutritionChanges(
      { targets, plan: { products: {}, segments: {} } },
      {
        targets: { carbsPerHourG: 75, waterMlPerHour: 450 },
        plan: {
          products: { gel },
          segments: { [first]: { items: [{ productId: gel, count: 3 }] } },
        },
      },
      segments,
      new Map([[gel, "Gel 100 Maurten"]]),
    );
    expect(changes).toEqual([
      {
        key: "target-carbsPerHourG",
        label: "Glucides par heure",
        before: ["60 g/h"],
        after: ["75 g/h"],
      },
      {
        key: "product-gel",
        label: "Produit · gel",
        before: ["Choix de Stride"],
        after: ["Gel 100 Maurten"],
      },
      {
        key: `segment-${first}`,
        label: "T1 · Départ → Ravito 1",
        before: [],
        after: ["3 × Gel 100 Maurten"],
      },
    ]);
  });

  it("lists the start flasks", () => {
    const changes = nutritionChanges(
      {
        targets,
        plan: { products: {}, segments: {}, start: { flasks: ["water"] } },
      },
      {
        plan: {
          products: {},
          segments: {},
          start: { flasks: ["drink", "water"] },
        },
      },
      [],
      new Map(),
    );
    expect(changes).toEqual([
      {
        key: "start-flasks",
        label: "Flasques au départ",
        before: ["Flasque 1 : eau"],
        after: ["Flasque 1 : iso", "Flasque 2 : eau"],
      },
    ]);
  });
});

describe("race proposal rows", () => {
  const row = {
    id: "44444444-4444-4444-8444-444444444444",
    race_id: "55555555-5555-4555-8555-555555555555",
    kind: "strategy",
    base_revision: 0,
    title: "Stratégie",
    summary: null,
    payload: { consignes: ["Pars lentement."], segments: {} },
    status: "ready",
    coach_session_id: null,
    decided_at: null,
    created_at: "2026-10-24T08:00:00Z",
  };

  it("parses a stored proposal by kind", () => {
    expect(raceProposalRowSchema.parse(row)).toMatchObject({
      kind: "strategy",
      payload: { consignes: ["Pars lentement."] },
    });
  });

  it("drops a proposal whose payload no longer parses", () => {
    expect(
      raceProposalRowSchema.parse({ ...row, payload: { consignes: "x" } }),
    ).toBeNull();
  });
});
