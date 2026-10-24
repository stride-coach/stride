import { describe, expect, it } from "vitest";
import {
  fuelingBase,
  fuelingRehearsals,
  fuelsDuring,
  nextFuelingRace,
  raceNutritionHref,
  type FuelingRace,
} from "@/features/fueling/base";
import { defaultPlan } from "@/features/races/race";

const trail: FuelingRace = {
  id: "trail",
  name: "EcoTrail Paris 120K",
  kind: "trail",
  date: "2027-03-20",
  targets: { carbsPerHourG: 70, waterMlPerHour: 500, sodiumMgPerHour: 400 },
};

const road: FuelingRace = {
  id: "road",
  name: "10K Vincennes",
  kind: "road",
  date: "2026-11-22",
  targets: { carbsPerHourG: 60, waterMlPerHour: 450, sodiumMgPerHour: 500 },
};

const session = (date: string, minutes: number, key = date) => ({
  sessionKey: key,
  date,
  title: "Sortie longue",
  durationSeconds: minutes * 60,
});

describe("fueling base", () => {
  it("takes the race plan rates when a race is coming", () => {
    expect(fuelingBase(trail, false)).toEqual({
      source: "race",
      race: trail,
      carbsPerHourG: { min: 70, max: 70 },
      waterMlPerHour: 500,
      sodiumMgPerHour: 400,
    });
  });

  it("falls back to Stride ranges without a race", () => {
    expect(fuelingBase(null, false).carbsPerHourG).toEqual({
      min: 30,
      max: 60,
    });
    expect(fuelingBase(null, true).carbsPerHourG).toEqual({ min: 60, max: 90 });
    expect(fuelingBase(null, false)).toMatchObject({
      source: "stride",
      waterMlPerHour: defaultPlan.waterMlPerHour,
      sodiumMgPerHour: defaultPlan.sodiumMgPerHour,
    });
  });

  it("picks the nearest race on or after the day", () => {
    expect(nextFuelingRace([trail, road], "2026-10-24")).toBe(road);
    expect(nextFuelingRace([trail, road], "2026-11-22")).toBe(road);
    expect(nextFuelingRace([trail, road], "2026-11-23")).toBe(trail);
    expect(nextFuelingRace([trail, road], "2027-03-21")).toBeNull();
  });

  it("fuels from 90 minutes", () => {
    expect(fuelsDuring(89 * 60)).toBe(false);
    expect(fuelsDuring(90 * 60)).toBe(true);
  });

  it("links trail races to their nutrition tab and road races to the race", () => {
    expect(raceNutritionHref(trail)).toBe("/races/trail/nutrition");
    expect(raceNutritionHref(road)).toBe("/races/road");
  });
});

describe("fueling rehearsals", () => {
  it("lists the next long sessions before the race at the race rate", () => {
    const rehearsals = fuelingRehearsals({
      sessions: [
        session("2027-03-27", 150),
        session("2026-11-07", 150),
        session("2026-10-24", 110),
        session("2026-10-25", 45),
        session("2026-10-31", 130),
        session("2026-11-14", 120),
      ],
      from: "2026-10-24",
      race: trail,
    });
    expect(
      rehearsals.map((item) => [item.date, item.carbsG.min, item.carbsG.max]),
    ).toEqual([
      ["2026-10-24", 128, 128],
      ["2026-10-31", 152, 152],
      ["2026-11-07", 175, 175],
    ]);
  });

  it("uses Stride ranges and keeps sessions after past races out", () => {
    const rehearsals = fuelingRehearsals({
      sessions: [session("2026-10-20", 120), session("2026-10-26", 120)],
      from: "2026-10-24",
      race: null,
    });
    expect(rehearsals).toEqual([
      { ...session("2026-10-26", 120), carbsG: { min: 60, max: 120 } },
    ]);
  });
});
