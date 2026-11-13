import { describe, expect, it } from "vitest";
import {
  frozenReference,
  previousSnapshot,
  weatherChange,
  weatherChangeNotice,
  type WeatherSnapshot,
} from "@/features/races/weather-watch";
import type { RaceWeather, WeatherSlot } from "@/features/races/weather";

function slot(
  hour: number,
  temperature: number,
  precipitationProbability = 10,
): WeatherSlot {
  return {
    elapsedSeconds: (hour - 8) * 3600,
    epochMs: 0,
    clockMinutes: hour * 60,
    distanceM: (hour - 8) * 6000,
    lat: 48.8,
    lon: 2.3,
    night: false,
    temperature,
    precipitationProbability,
    code: 1,
    apparentTemperature: null,
    windKmh: null,
    windDirection: null,
    gustsKmh: null,
  };
}

function weather(slots: WeatherSlot[]): RaceWeather {
  return {
    mode: "forecast",
    slots,
    title: "",
    detail: "",
    facts: [],
    source: "",
    rainyDayShare: null,
    forecastFrom: "2027-03-05",
  };
}

const before = weather([slot(8, 10), slot(11, 14), slot(14, 17)]);

function snapshot(
  observedOn: string,
  adopted = false,
  value = before,
): WeatherSnapshot {
  return { observedOn, weather: value, adopted };
}

describe("weather change", () => {
  it("finds a change of 5 °C or more at the same passage", () => {
    const after = weather([slot(8, 9), slot(11, 13), slot(14, 11)]);
    expect(weatherChange(after, before)).toEqual({
      temperature: { delta: -6, clockMinutes: 840, distanceM: 36_000 },
      rain: false,
    });
  });

  it("finds rain that goes above 50 %", () => {
    const after = weather([slot(8, 10), slot(11, 14, 70), slot(14, 16)]);
    expect(weatherChange(after, before)).toEqual({
      temperature: null,
      rain: true,
    });
  });

  it("stays quiet under the thresholds", () => {
    const after = weather([slot(8, 12), slot(11, 17), slot(14, 13, 50)]);
    expect(weatherChange(after, before)).toBeNull();
  });

  it("says what changed since yesterday or since the freeze", () => {
    const change = {
      temperature: { delta: -6, clockMinutes: 840, distanceM: 36_000 },
      rain: true,
    };
    expect(weatherChangeNotice(change, "yesterday")).toEqual({
      key: "weather",
      title: "La météo a changé depuis hier",
      text: "Jusqu’à 6 °C de moins vers 14:00, au km 36. La pluie passe au-dessus de 50 %. Vérifie ta tenue.",
    });
    expect(weatherChangeNotice(change, "freeze").title).toBe(
      "La météo a changé depuis le gel du plan",
    );
  });
});

describe("race week freeze", () => {
  const raceDate = "2027-03-20";

  it("keeps the first forecast from J-2 unless a newer one was adopted", () => {
    const snapshots = [
      snapshot("2027-03-17"),
      snapshot("2027-03-18"),
      snapshot("2027-03-19"),
    ];
    expect(frozenReference(snapshots, raceDate, "2027-03-19")?.observedOn).toBe(
      "2027-03-18",
    );
    expect(
      frozenReference(
        [...snapshots.slice(0, 2), snapshot("2027-03-19", true)],
        raceDate,
        "2027-03-19",
      )?.observedOn,
    ).toBe("2027-03-19");
  });

  it("does not freeze before J-2 or after the race", () => {
    expect(
      frozenReference([snapshot("2027-03-17")], raceDate, "2027-03-17"),
    ).toBeNull();
    expect(
      frozenReference([snapshot("2027-03-18")], raceDate, "2027-03-21"),
    ).toBeNull();
  });

  it("finds the forecast kept the day before", () => {
    expect(
      previousSnapshot(
        [
          snapshot("2027-03-15"),
          snapshot("2027-03-16"),
          snapshot("2027-03-17"),
        ],
        "2027-03-17",
      )?.observedOn,
    ).toBe("2027-03-16");
  });
});
