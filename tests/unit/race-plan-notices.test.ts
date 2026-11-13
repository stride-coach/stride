import { describe, expect, it } from "vitest";
import { fuelingNotice, rainNotice } from "@/features/races/plan-notices";
import type { RaceWeather, WeatherSlot } from "@/features/races/weather";

function slot(
  clockMinutes: number,
  distanceM: number,
  precipitationProbability: number,
): WeatherSlot {
  return {
    elapsedSeconds: 0,
    epochMs: 0,
    clockMinutes,
    distanceM,
    lat: 48.8,
    lon: 2.3,
    night: false,
    temperature: 12,
    precipitationProbability,
    code: 61,
    apparentTemperature: null,
    windKmh: null,
    windDirection: null,
    gustsKmh: null,
  };
}

function weather(
  slots: WeatherSlot[],
  mode: RaceWeather["mode"] = "forecast",
): RaceWeather {
  return {
    mode,
    slots,
    title: "",
    detail: "",
    facts: [],
    source: "",
    rainyDayShare: null,
    forecastFrom: "2027-03-05",
  };
}

describe("rain notice", () => {
  it("names the window where the rain risk goes above 50 %", () => {
    expect(
      rainNotice(
        weather([
          slot(8 * 60, 0, 20),
          slot(14 * 60, 18_000, 55),
          slot(16 * 60, 26_500, 80),
          slot(18 * 60, 32_000, 40),
        ]),
      ),
    ).toEqual({
      key: "rain",
      title: "Risque de pluie au-dessus de 50 %",
      text: "Jusqu’à 80 % de 14:00 à 16:00, du km 18 au km 27. Le plan prévoit la veste avant la première averse.",
    });
  });

  it("stays quiet under 50 % or before the forecast", () => {
    expect(rainNotice(weather([slot(600, 0, 50)]))).toBeNull();
    expect(rainNotice(weather([slot(600, 0, 90)], "normals"))).toBeNull();
    expect(rainNotice(null)).toBeNull();
  });
});

describe("fueling notice", () => {
  it("says the target is capped to what was validated", () => {
    expect(fuelingNotice(90, 70)).toEqual({
      key: "fueling",
      title: "Ravitaillement plafonné à 70 g/h",
      text: "Ta cible de 90 g/h dépasse ce que tu as validé à l’entraînement : le plan s’arrête à 70 g/h. Teste plus haut en sortie longue pour le relever.",
    });
  });

  it("stays quiet when the target is covered or untested", () => {
    expect(fuelingNotice(60, 70)).toBeNull();
    expect(fuelingNotice(90, null)).toBeNull();
  });
});
