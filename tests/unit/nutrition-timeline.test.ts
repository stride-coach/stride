import { describe, expect, it } from "vitest";
import type { FuelingRace } from "@/features/fueling/base";
import type { NutritionProduct } from "@/features/fueling/products";
import {
  nutritionForDay,
  type NutritionDayInput,
  type NutritionDayResult,
  type NutritionResult,
} from "@/features/nutrition/calculator";
import { fuelingItems, nutritionTimeline } from "@/features/nutrition/timeline";
import { nutritionView } from "@/features/nutrition/view";

const profile = {
  birthDate: "1992-03-02",
  sex: "male",
  heightCm: 178,
  weightKg: 72,
};

const race: FuelingRace = {
  id: "0b6f6d2e-5c1a-4b7e-9c3d-2a1f0e9d8c7b",
  name: "EcoTrail Paris 120K",
  kind: "trail",
  date: "2027-03-20",
  targets: { carbsPerHourG: 70, waterMlPerHour: 500, sodiumMgPerHour: 400 },
};

function product(patch: Partial<NutritionProduct>): NutritionProduct {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    catalogueKey: null,
    name: "Gel 100",
    brand: "Maurten",
    kind: "gel",
    carbsG: 25,
    sodiumMg: 0,
    caffeineMg: 0,
    servingLabel: null,
    servingMl: null,
    tested: true,
    testedNote: null,
    revision: 1,
    ...patch,
  };
}

const gel = product({});
const caffeineGel = product({
  id: "00000000-0000-4000-8000-000000000002",
  name: "Gel 100 Caf 100",
  caffeineMg: 100,
});
const iso = product({
  id: "00000000-0000-4000-8000-000000000003",
  name: "Ultra Energy",
  brand: "Näak",
  kind: "drink",
  carbsG: 40,
  sodiumMg: 500,
});

const longRun = {
  sport: "run",
  kind: "long",
  distanceKm: 18,
  durationSeconds: 6_600,
};

function day(patch: Partial<NutritionDayInput> = {}): NutritionDayResult {
  const result: NutritionResult = nutritionForDay({
    date: "2026-10-24",
    profile,
    sessions: [],
    fuelingRaces: [race],
    ...patch,
  });
  if (!result.ok) throw new Error("incomplete profile");
  return result;
}

describe("nutrition timeline", () => {
  it("plans before, during and after a long session", () => {
    const timeline = nutritionTimeline(day({ sessions: [longRun] }), [
      caffeineGel,
      gel,
      iso,
    ]);
    expect(timeline.steps.map((step) => step.kind)).toEqual([
      "pre_meal",
      "snack",
      "during",
      "recovery",
      "rest_of_day",
    ]);
    expect(timeline.steps[0]).toEqual({
      kind: "pre_meal",
      hours: { min: 3, max: 4 },
      carbsG: 110,
    });
    expect(timeline.steps[3]).toEqual({
      kind: "recovery",
      withinHours: 2,
      proteinG: { min: 22, max: 29 },
      carbsG: 70,
    });
    expect(timeline.steps[4]).toEqual({
      kind: "rest_of_day",
      intakes: { min: 2, max: 3 },
    });
    const during = timeline.steps[2];
    expect(during.kind).toBe("during");
    if (during.kind !== "during") return;
    expect(during.fueling).toMatchObject({
      source: "race",
      gramsPerHour: { min: 70, max: 70 },
      totalGrams: { min: 128, max: 128 },
    });
    expect(during.items).toEqual({
      drink: { product: iso, count: 1 },
      gels: {
        product: gel,
        carbsG: 25,
        count: 4,
        atSeconds: [1_200, 2_700, 3_900, 5_400],
      },
    });
  });

  it("drops the in-session steps below 90 minutes", () => {
    const timeline = nutritionTimeline(
      day({
        sessions: [{ sport: "run", kind: "threshold", durationSeconds: 3_600 }],
      }),
      [gel],
    );
    expect(timeline.steps.map((step) => step.kind)).toEqual([
      "pre_meal",
      "recovery",
      "rest_of_day",
    ]);
  });

  it("keeps an easy session without a recovery window", () => {
    const timeline = nutritionTimeline(
      day({
        sessions: [{ sport: "run", kind: "easy", durationSeconds: 2_700 }],
      }),
      [],
    );
    expect(timeline.steps.map((step) => step.kind)).toEqual([
      "pre_meal",
      "rest_of_day",
    ]);
  });

  it("spreads meals on a rest day", () => {
    expect(nutritionTimeline(day(), [gel])).toEqual({
      mainEffort: null,
      steps: [{ kind: "meals", intakes: { min: 4, max: 5 } }],
    });
  });

  it("falls back to generic gels without products", () => {
    const result = day({ sessions: [longRun], fuelingRaces: [] });
    const items = fuelingItems(result.fueling[0], []);
    expect(items).toEqual({
      drink: null,
      gels: {
        product: null,
        carbsG: 25,
        count: 3,
        atSeconds: [1_800, 3_300, 5_100],
      },
    });
  });
});

describe("nutrition day view", () => {
  const sessions = [
    {
      sessionKey: "w1-sat",
      date: "2026-10-24",
      title: "Sortie longue",
      durationSeconds: 6_600,
    },
    {
      sessionKey: "w2-sat",
      date: "2026-10-31",
      title: "Sortie longue",
      durationSeconds: 7_800,
    },
  ];

  it("links the day to its session, its race and a prefilled coach request", () => {
    const view = nutritionView({
      results: [day({ sessions: [longRun] })],
      sessions,
      today: "2026-10-24",
      products: [gel, iso],
      fuelingRaces: [race],
      startedAt: "2026-10-24T07:42:00",
    });
    if (view.status !== "ready") throw new Error("not ready");
    const { today } = view;
    expect(today.session).toEqual({
      label: "Sortie longue · 1 h 50",
      href: "/plan/sessions/w1-sat",
    });
    expect(today.race).toEqual({
      label: "EcoTrail Paris 120K · J-147",
      href: `/races/${race.id}/nutrition`,
    });
    const coach = new URL(today.coachHref, "https://stride.test");
    expect(coach.pathname).toBe("/coach");
    expect(coach.searchParams.get("session")).toBe("w1-sat");
    expect(coach.searchParams.get("race")).toBe(race.id);
    expect(coach.searchParams.get("text")).toContain("Ravito 70 g/h.");
    expect(today.timeline.caption).toContain("séance faite à 07:42");
    expect(
      today.timeline.steps.find((step) => step.key === "during"),
    ).toMatchObject({
      highlighted: true,
      amount: { value: "70", unit: "g/h · soit 128 g" },
      detail:
        "1 flasque Näak Ultra Energy et 4 gels Maurten Gel 100 à 0:20, 0:45, 1:05 et 1:30. Sodium 400 mg/h · eau 500 ml/h.",
    });
    expect(today.base).toMatchObject({ source: "race", carbs: "70 g/h" });
    expect(today.rehearsals.map((item) => [item.label, item.carbs])).toEqual([
      ["sam. 24/10 · Sortie longue · 1 h 50", "128 g"],
      ["sam. 31/10 · Sortie longue · 2 h 10", "152 g"],
    ]);
  });

  it("labels the weight source and estimated values", () => {
    const view = nutritionView({
      results: [
        day({
          profile: { ...profile, weightSource: "garmin" },
          fuelingRaces: [],
        }),
      ],
      sessions: [],
      today: "2026-10-24",
    });
    if (view.status !== "ready") throw new Error("not ready");
    expect(view.today.sources).toEqual([
      { tag: "garmin", text: "Poids 72 kg · Garmin" },
      { tag: "estimation", text: "Activité hors entraînement" },
    ]);
    expect(view.today.method.map((row) => row.tag)).toEqual([
      "garmin",
      null,
      "estimation",
      null,
    ]);
    expect(view.today.base).toMatchObject({
      source: "stride",
      carbs: "30–60 g/h",
      race: null,
    });
  });
});
