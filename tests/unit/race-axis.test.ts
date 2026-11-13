import { describe, expect, it } from "vitest";
import {
  axisLanes,
  axisReadings,
  axisTicks,
  axisTicksBetween,
  clockAtDistance,
  elevationTicks,
  nightLabel,
  rainLabel,
  roadbookRows,
  roadbookTotals,
} from "@/features/races/axis";
import { fitLabels, placeLabel } from "@/features/races/axis-layout";
import { formatClock } from "@/features/races/format";
import { profileData } from "@/features/races/profile";
import { planProfile } from "@/features/races/timeline";
import type { RaceWeather, WeatherSlot } from "@/features/races/weather";
import {
  course,
  ids,
  model,
  plan,
  target,
  timeline,
} from "./race-course-fixture";

function slot(distanceM: number, temperature: number, code = 0): WeatherSlot {
  return {
    elapsedSeconds: 0,
    epochMs: 0,
    clockMinutes: 0,
    distanceM,
    lat: 0,
    lon: 0,
    night: false,
    temperature,
    precipitationProbability: 0,
    code,
    apparentTemperature: null,
    windKmh: 16,
    windDirection: null,
    gustsKmh: null,
  };
}

const weather: RaceWeather = {
  mode: "forecast",
  slots: [
    slot(0, 3.4),
    slot(10_000, 8),
    slot(20_000, 12.2, 61),
    slot(40_000, 6),
  ],
  title: "",
  detail: "",
  facts: [],
  source: "",
  rainyDayShare: null,
  forecastFrom: "",
};

function readings(withWeather: RaceWeather | null = null) {
  return axisReadings({
    model,
    planned: target,
    timeline,
    weather: withWeather,
    walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
  });
}

describe("readings along the race", () => {
  it("samples the course every 500 m from the start time", () => {
    const all = readings();
    expect(all).toHaveLength(81);
    expect(all[0]).toMatchObject({ distanceM: 0, clock: "06:00" });
    expect(all.at(-1)?.distanceM).toBe(course.distanceM);
    expect(all.find((item) => item.distanceM === 20_000)?.section).toBe(
      timeline.segments[1].index,
    );
  });

  it("walks the climbs over the threshold and runs elsewhere", () => {
    const all = readings();
    const portion = model.portions[0];
    expect(portion).toBeDefined();
    const inside = all.find(
      (item) =>
        item.distanceM >= portion.fromM && item.distanceM <= portion.toM,
    )!;
    expect(inside.instruction.value).toBe("Marche");
    expect(inside.terrain.value).toMatch(/^Côte à \d+ %$/);
    const outside = all.find(
      (item) =>
        !model.portions.some(
          (range) =>
            item.distanceM >= range.fromM && item.distanceM <= range.toM,
        ),
    )!;
    expect(outside.instruction).toMatchObject({ value: "Course" });
    expect(outside.instruction.detail).toMatch(/ \/km$/);
  });

  it("reads the nearest weather and invents none without it", () => {
    expect(readings()[0].weather).toBeNull();
    const rainy = readings(weather).find((item) => item.distanceM === 20_000);
    expect(rainy?.weather).toEqual({
      value: "12 °C, pluie",
      detail: "vent 16 km/h",
    });
  });

  it("tells when the night ends before dawn", () => {
    expect(readings()[0].light).toMatchObject({ value: "Nuit" });
    expect(readings()[0].light?.detail).toMatch(/^jour dans /);
  });
});

describe("roadbook", () => {
  it("lists one row per section with its passage and cutoff", () => {
    const rows = roadbookRows(timeline, weather);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({
      section: `${ids.start} → Ravito 1 · Trappes`,
      distance: "15 km",
      cutoff: "BH 11:00",
      tight: false,
      passage: formatClock(timeline.stations[1].clockMinutes),
    });
    expect(rows[0].weather).toBe("3–8 °C · nuit");
    expect(rows[1].weather).toBe("12 °C · pluie");
    expect(roadbookRows(timeline, null)[0].weather).toBe("nuit");
    expect(roadbookRows(timeline, null)[1].weather).toBeNull();
  });

  it("totals the race", () => {
    expect(roadbookTotals(timeline, course.distanceM)).toMatchObject({
      distance: "40 km",
      finish: formatClock(timeline.totals.finishClockMinutes),
    });
  });
});

describe("lanes", () => {
  it("shares the axis between profile, pace, weather and fueling", () => {
    const profile = planProfile(
      profileData({
        course: model.course,
        waypoints: model.waypoints,
        marks: model.marks,
        portions: model.portions,
        planned: target,
        weather,
      }),
      timeline,
    );
    const lanes = axisLanes({ profile, model, timeline, weather });
    expect(lanes.distanceM).toBe(course.distanceM);
    expect(lanes.pace).toHaveLength(3);
    expect(lanes.fueling).toHaveLength(3);
    expect(lanes.stations.map((station) => station.cutoff)).toEqual([
      null,
      "barrière 11:00",
      null,
      null,
    ]);
    expect(lanes.stations[0]!.clock).toBe(
      formatClock(timeline.stations[0]!.clockMinutes),
    );
    expect(lanes.temperature.map((item) => item.label)).toEqual([
      "3°",
      "8°",
      "12°",
      "6°",
    ]);
    expect(
      lanes.pace.every(
        (item) => item.label === null || /^\d+:\d\d$/.test(item.label),
      ),
    ).toBe(true);
    expect(lanes.ticks.map((tick) => tick.label)).toEqual([
      "0 km",
      "10 km",
      "20 km",
      "30 km",
      "40 km",
    ]);
    expect(lanes.elevationTicks.length).toBeGreaterThan(0);
    expect(lanes.temperature).toHaveLength(4);
    expect(lanes.walk.length).toBe(model.portions.length);
  });
});

describe("lane labels", () => {
  const stations = [
    { distanceM: 0, clockMinutes: 420, stopSeconds: 0 },
    { distanceM: 10_000, clockMinutes: 480, stopSeconds: 600 },
    { distanceM: 20_000, clockMinutes: 560, stopSeconds: 0 },
  ];

  it("reads the passage clock between stations, after the stop", () => {
    expect(clockAtDistance(stations, 0)).toBe(420);
    expect(clockAtDistance(stations, 5_000)).toBe(450);
    expect(clockAtDistance(stations, 15_000)).toBe(525);
    expect(clockAtDistance(stations, 30_000)).toBe(560);
    expect(clockAtDistance([], 1_000)).toBe(0);
  });

  it("names rain windows by the hour and night by its start", () => {
    expect(rainLabel(14 * 60 + 10, 16 * 60 + 40)).toBe("Averses 14h–17h");
    expect(rainLabel(23 * 60 + 30, 25 * 60)).toBe("Averses 23h–1h");
    expect(rainLabel(14 * 60, 14 * 60)).toBe("Averses vers 14h");
    expect(nightLabel(19 * 60 + 5)).toBe("Nuit dès 19:05");
  });

  it("picks a round kilometre step and elevation scale", () => {
    expect(axisTicks(121_300).map((tick) => tick.label)).toEqual([
      "0 km",
      "20 km",
      "40 km",
      "60 km",
      "80 km",
      "100 km",
      "120 km",
    ]);
    expect(axisTicks(10_000).at(-1)!.label).toBe("10 km");
    expect(axisTicksBetween(61_000, 66_000).map((tick) => tick.label)).toEqual([
      "61 km",
      "62 km",
      "63 km",
      "64 km",
      "65 km",
      "66 km",
    ]);
    expect(elevationTicks([42, 180, 95]).map((tick) => tick.label)).toEqual([
      "50 m",
      "100 m",
      "150 m",
    ]);
    expect(elevationTicks([])).toEqual([]);
  });

  it("keeps labels apart, the important ones first", () => {
    expect(
      fitLabels(
        [
          { at: 0, width: 40 },
          { at: 0.05, width: 40 },
          { at: 0.5, width: 40 },
          { at: 0.52, width: 40, priority: 1 },
        ],
        400,
      ),
    ).toEqual([true, false, false, true]);
    expect(placeLabel(0, 40, 400)).toBe(0);
    expect(placeLabel(1, 40, 400)).toBe(360);
    expect(placeLabel(0.5, 40, 400)).toBe(180);
  });
});
