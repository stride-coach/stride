import { describe, expect, it } from "vitest";
import { allocateRaceNutrition } from "@/features/fueling/allocation";
import { emptyNutritionPlan } from "@/features/fueling/race-plan";
import type { ShoeInput } from "@/features/gear/view";
import {
  type ChecklistItem,
  type ChecklistList,
  checklistTemplateFor,
  itemChip,
  prepLists,
  raceReadiness,
  readinessDetail,
  trailChecklistLists,
} from "@/features/races/checklists";
import { dropBagView, racePairView } from "@/features/races/gear-view";
import type { Waypoint } from "@/features/races/waypoints";

let next = 0;
function item(
  list: ChecklistList,
  values: Partial<ChecklistItem> = {},
): ChecklistItem {
  next += 1;
  return {
    id: `item-${next}`,
    list,
    label: `Élément ${next}`,
    detail: null,
    status: null,
    checked: false,
    startDate: null,
    endDate: null,
    position: next,
    revision: 1,
    shoeId: null,
    ...values,
  };
}

function waypoint(
  id: string,
  kind: Waypoint["kind"],
  distanceM: number,
): Waypoint {
  return {
    id,
    kind,
    name: id,
    distanceM,
    cutoffMinutes: null,
    services: ["water"],
    watchLabel: null,
    alertDistanceM: 0,
    voiceNote: null,
    todo: null,
    nutritionNote: null,
    source: "course",
    needsReview: false,
    revision: 1,
  };
}

function shoe(totalKm: number, runs: number[] = []): ShoeInput {
  return {
    id: "speedgoat",
    spec: {
      brand: "Hoka",
      model: "Speedgoat",
      version: "6",
      category: "daily",
      terrain: "mixed",
      description: null,
      sizeEu: null,
      lifespanKm: 800,
    },
    suggested: [],
    startingDistanceM: totalKm * 1000,
    firstUseDate: "2026-06-01",
    retiredOn: null,
    garmin: null,
    activities: runs.map((km, index) => ({
      activityId: `run-${index}`,
      name: null,
      day: `2026-10-${String(20 - index).padStart(2, "0")}`,
      distanceM: km * 1000,
    })),
  };
}

describe("race checklist readiness", () => {
  const items = [
    item("gear_mandatory", { status: "ready", checked: true }),
    item("gear_mandatory", { status: "check" }),
    item("gear_night", { status: "buy" }),
    item("gear_kit", { status: "test" }),
    item("gear_weather", { status: "weather" }),
    item("gear_forbidden"),
    item("prep_week"),
    item("prep_eve", { status: "ready", checked: true }),
    item("prep_race_day", { status: "buy" }),
  ];

  it("counts gear and preparation items, never forbidden ones", () => {
    expect(raceReadiness(items, trailChecklistLists)).toEqual({
      ready: 2,
      total: 8,
      buy: 2,
      test: 1,
    });
    expect(raceReadiness(items, prepLists)).toEqual({
      ready: 1,
      total: 3,
      buy: 1,
      test: 0,
    });
  });

  it("shows À faire for unchecked preparation items and À vérifier for gear", () => {
    expect(itemChip(item("prep_week"))).toBe("todo");
    expect(itemChip(item("gear_night"))).toBe("check");
    expect(itemChip(item("gear_weather", { status: "weather" }))).toBe("check");
    expect(itemChip(item("prep_eve", { status: "test" }))).toBe("test");
    expect(itemChip(item("gear_night", { status: "buy", checked: true }))).toBe(
      "ready",
    );
  });

  it("summarises what is left to buy and test", () => {
    const readiness = raceReadiness(items, trailChecklistLists);
    expect(readinessDetail(readiness)).toBe(
      "éléments prêts · 2 à acheter · 1 à tester",
    );
    expect(readinessDetail(readiness, { short: true })).toBe(
      "prêts · 2 à acheter",
    );
    expect(readinessDetail({ ready: 3, total: 3, buy: 0, test: 0 })).toBe(
      "éléments prêts",
    );
  });

  it("offers the template matching the race kind", () => {
    expect(checklistTemplateFor("road", "gear_mandatory")).toBeUndefined();
    expect(checklistTemplateFor("road", "prep_week")).toBeDefined();
    expect(checklistTemplateFor("trail", "gear_mandatory")).toBeDefined();
  });
});

describe("drop bag", () => {
  const waypoints = [
    waypoint("start", "start", 0),
    waypoint("aid", "aid", 20_000),
    waypoint("base", "base", 56_000),
    waypoint("finish", "finish", 80_000),
  ];

  it("lists the nutrition eaten after the base", () => {
    const allocation = allocateRaceNutrition({
      stations: waypoints.map(({ id, kind, services }) => ({
        id,
        kind,
        services,
      })),
      segments: [
        {
          id: "aid",
          movingSeconds: 7200,
          startElapsedSeconds: 0,
          night: false,
        },
        {
          id: "base",
          movingSeconds: 14_400,
          startElapsedSeconds: 7200,
          night: false,
        },
        {
          id: "finish",
          movingSeconds: 10_800,
          startElapsedSeconds: 21_600,
          night: false,
        },
      ],
      products: [],
      targets: {
        carbsPerHourG: 60,
        waterMlPerHour: 500,
        sodiumMgPerHour: 400,
        caffeineMaxMg: 200,
        nightCaffeine: false,
        flaskMl: 500,
        flaskCount: 2,
        bladderMl: null,
      },
      plan: emptyNutritionPlan,
      dropBagExtras: ["Veste chaude"],
    });
    const view = dropBagView(waypoints, allocation);
    expect(view?.km).toBe("56,0");
    expect(view?.nutrition).toMatch(/^\d+ gels?/);
  });

  it("keeps the base without a nutrition plan and hides it without a base", () => {
    expect(dropBagView(waypoints, null)).toEqual({
      km: "56,0",
      nutrition: null,
    });
    expect(dropBagView(waypoints.slice(0, 2), null)).toBeNull();
  });
});

describe("race pair card", () => {
  it("describes a broken-in pair with its margin", () => {
    const view = racePairView({
      shoe: shoe(312, [30]),
      source: "reserved",
      raceDate: "2027-03-20",
      today: "2026-10-24",
      dropBag: true,
    });
    expect(view).toMatchObject({
      name: "Hoka Speedgoat 6",
      facts: "312 km · rodées",
      terrain: "terrain mixte",
      badge: "Recommandée",
    });
    expect(view.advice).toBe(
      "Change-les après 800 km : il te reste la marge jusqu’à la course. Une paire de rechange dans le sac d’allègement est conseillée.",
    );
  });

  it("asks to break in a new pair and warns before its lifespan", () => {
    expect(
      racePairView({
        shoe: shoe(12),
        source: "checklist",
        raceDate: "2027-03-20",
        today: "2026-10-24",
        dropBag: false,
      }),
    ).toMatchObject({
      facts: "12 km · neuves",
      badge: "Choisie",
      advice:
        "Rode-les avant la course : encore 38 km pour atteindre 30 à 50 km.",
    });
    expect(
      racePairView({
        shoe: shoe(820, [40]),
        source: "reserved",
        raceDate: "2027-03-20",
        today: "2026-10-24",
        dropBag: false,
      }).advice,
    ).toBe(
      "Elles atteindront 800 km avant la course : prévois une paire neuve et rodée.",
    );
  });
});
