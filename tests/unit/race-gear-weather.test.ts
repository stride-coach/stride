import { describe, expect, it } from "vitest";
import { weatherGear } from "@/features/races/gear-weather";
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
