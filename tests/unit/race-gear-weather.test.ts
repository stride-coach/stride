import { describe, expect, it } from "vitest";
import {
  gearReading,
  gearTimeline,
  weatherGear,
  type WeatherGear,
} from "@/features/races/gear-weather";
import { distanceAtElapsed } from "@/features/races/simulation";
import type { RaceWeather, WeatherSlot } from "@/features/races/weather";
import { course, target } from "./race-course-fixture";

const finish = target.simulation.finishSeconds;
const hours = [0, 3600, 7200, 10_800, 14_400, finish];

function weather(
  temperatures: number[],
  rainy: number[] = [],
  mode: RaceWeather["mode"] = "forecast",
): RaceWeather {
  return {
    mode,
    slots: hours.map((elapsedSeconds, index): WeatherSlot => ({
      elapsedSeconds,
      epochMs: 0,
      clockMinutes: 360 + elapsedSeconds / 60,
      distanceM: distanceAtElapsed(course, target.simulation, elapsedSeconds),
      lat: 0,
      lon: 0,
      night: false,
      temperature: temperatures[index],
      precipitationProbability: rainy.includes(index) ? 80 : 0,
      code: rainy.includes(index) ? 61 : 1,
      apparentTemperature: null,
      windKmh: null,
      windDirection: null,
      gustsKmh: null,
    })),
    title: "",
    detail: "",
    facts: [],
    source: "",
    rainyDayShare: null,
    forecastFrom: "",
  };
}

describe("gear decided by the weather", () => {
  it("places the jacket, warm layers and head torch on the course", () => {
    const items = weatherGear({
      weather: weather([3, 6, 9, 12, 10, 6], [2]),
      planned: target,
      distanceM: course.distanceM,
    });
    expect(items.map((item) => [item.key, item.reason])).toEqual([
      ["jacket", "averses"],
      ["warm", "3 °C"],
      ["torch", "nuit"],
    ]);
    expect(items[0].where).toMatch(/^km [\d,]+ à [\d,]+$/);
    expect(items[1].where).toMatch(/^jusqu’au km /);
    expect(items[2].ranges[0].fromM).toBe(0);
  });

  it("asks for sun protection in the heat and nothing else when mild", () => {
    const items = weatherGear({
      weather: weather([18, 20, 23, 25, 24, 21]),
      planned: { ...target, nightKm: [] },
      distanceM: course.distanceM,
    });
    expect(items.map((item) => item.key)).toEqual(["sun"]);
  });

  it("keeps only the night without weather", () => {
    expect(
      weatherGear({
        weather: null,
        planned: target,
        distanceM: course.distanceM,
      }).map((item) => item.key),
    ).toEqual(["torch"]);
  });
});

describe("what you wear along the race", () => {
  const stations = [
    { name: "Départ", kind: "start", distanceM: 0 },
    { name: "Buc", kind: "aid", distanceM: 24_000 },
    { name: "Chaville", kind: "aid", distanceM: 47_000 },
    { name: "Meudon", kind: "aid", distanceM: 68_000 },
    { name: "Saint-Cloud", kind: "base", distanceM: 89_000 },
    { name: "Arrivée", kind: "finish", distanceM: 120_000 },
  ];
  const items: WeatherGear[] = [
    {
      key: "jacket",
      label: "Veste imperméable",
      reason: "averses",
      where: "km 50 à 69",
      ranges: [{ fromM: 50_000, toM: 69_000 }],
    },
    {
      key: "warm",
      label: "Gants et couche chaude",
      reason: "6 °C",
      where: "dès le km 92",
      ranges: [{ fromM: 92_000, toM: 120_000 }],
    },
    {
      key: "torch",
      label: "Frontale",
      reason: "nuit",
      where: "dès le km 78",
      ranges: [{ fromM: 78_000, toM: 120_000 }],
    },
  ];

  it("splits each item into worn and carried spans with its changes", () => {
    const rows = gearTimeline({
      items,
      distanceM: 120_000,
      stations,
      mandatory: ["Couverture de survie", "Sifflet", "Gobelet"],
    });
    expect(rows.map((row) => row.key)).toEqual([
      "jacket",
      "warm",
      "torch",
      "socks",
      "mandatory",
    ]);
    expect(rows[0]!.spans).toEqual([
      { fromM: 0, toM: 50_000, state: "bag" },
      { fromM: 50_000, toM: 69_000, state: "on" },
      { fromM: 69_000, toM: 120_000, state: "bag" },
    ]);
    expect(rows[0]!.changes).toEqual([50_000, 69_000]);
    expect(rows[3]).toMatchObject({
      label: "Chaussettes de rechange",
      changes: [89_000],
    });
    expect(rows[4]).toMatchObject({
      label: "Couverture de survie, sifflet",
      spans: [{ fromM: 0, toM: 120_000, state: "bag" }],
      changes: [],
    });
  });

  it("says when the jacket, the torch and the gloves matter", () => {
    expect(gearReading(items, stations)).toBe(
      "Deux moments comptent : la veste sur toi avant le km 50, et la frontale sur la tête à Meudon. Les gants t’attendent à Saint-Cloud, il fera 6 °C.",
    );
    expect(gearReading([], stations)).toBeNull();
    expect(
      gearTimeline({ items: [], distanceM: 10_000, stations, mandatory: [] }),
    ).toEqual([]);
  });
});
