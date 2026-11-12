import { describe, expect, it } from "vitest";
import { distanceAtElapsed } from "@/features/races/simulation";
import type { RaceWeather, WeatherSlot } from "@/features/races/weather";
import { weatherView } from "@/features/races/weather-view";
import { planModel } from "@/features/races/workspace";
import {
  course,
  model,
  plan,
  race,
  stored,
  target,
  timeline,
} from "./race-course-fixture";

const finish = target.simulation.finishSeconds;
const hours = [0, 3600, 7200, 10_800, 14_400, finish];
const temperatures = [3, 6, 9, 12, 10, 6];

function slot(index: number): WeatherSlot {
  const elapsedSeconds = hours[index];
  return {
    elapsedSeconds,
    epochMs: 0,
    clockMinutes: 360 + elapsedSeconds / 60,
    distanceM: distanceAtElapsed(course, target.simulation, elapsedSeconds),
    lat: 0,
    lon: 0,
    night: false,
    temperature: temperatures[index],
    precipitationProbability: index === 2 ? 80 : 0,
    code: index === 2 ? 61 : 1,
    apparentTemperature: null,
    windKmh: index === 3 ? 35 : 12,
    windDirection: 225,
    gustsKmh: null,
  };
}

function weather(mode: RaceWeather["mode"] = "forecast"): RaceWeather {
  return {
    mode,
    slots: hours.map((_, index) => slot(index)),
    title: "",
    detail: "",
    facts: [],
    source: "Open-Meteo · mis à jour 12 nov. 08:00",
    rainyDayShare: null,
    forecastFrom: "2027-03-05",
  };
}

const cautious = {
  key: "cautious" as const,
  label: "prudent",
  seconds: 6 * 3600,
};

function view(mode: RaceWeather["mode"] = "forecast") {
  return weatherView({
    weather: weather(mode),
    course,
    planned: target,
    timeline,
    startMinutes: 360,
    alternatives: [
      { scenario: target.scenario, planned: target },
      {
        scenario: cautious,
        planned: planModel({
          model,
          race,
          plan,
          scenario: cautious,
          timeZone: stored.timeZone,
        }),
      },
    ],
  });
}

describe("weather along the race", () => {
  it("sums temperature, rain, wind, night and the finish", () => {
    const { kpis } = view();
    expect(Object.fromEntries(kpis.map((kpi) => [kpi.key, kpi]))).toMatchObject(
      {
        temperature: { value: "3 → 12 °C", label: "Température" },
        rain: { label: "Averses" },
        wet: { label: "Sous la pluie" },
        wind: { value: "35 km/h", label: "Vent · SO" },
        night: { value: "Départ", label: "Nuit dès le départ" },
        finish: { value: "6 °C", label: "À l’arrivée" },
      },
    );
  });

  it("reads the rain window and the finish", () => {
    expect(view().reading).toMatch(
      /^Tu traverses la pluie entre le km [\d,]+ et le km [\d,]+, de 08:00 à 09:00\. Il fera 6 °C à l’arrivée\.$/,
    );
  });

  it("derives the adjustments from the weather met", () => {
    expect(view().adjustments.map((item) => [item.topic, item.where])).toEqual([
      ["Équipement", expect.stringMatching(/^km /)],
      ["Couches", "dès le départ"],
      ["Lumière", "dès le départ"],
      ["Vent", expect.stringMatching(/^km /)],
    ]);
  });

  it("shows how much rain an earlier or later passage meets", () => {
    const { alternatives } = view();
    expect(alternatives.map((item) => [item.label, item.current])).toEqual([
      ["Objectif", true],
      ["Prudent", false],
    ]);
    expect(alternatives[0].rain).not.toBe(alternatives[1].rain);
    expect(alternatives[1].finish).toBe("12:00");
  });

  it("says when the weather is season averages", () => {
    const normals = view("normals");
    expect(normals.kpis[0].label).toBe("Température · normales");
    expect(normals.reading).toMatch(/^Les normales annoncent de la pluie/);
  });
});
