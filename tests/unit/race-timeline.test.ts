import { describe, expect, it } from "vitest";
import { buildCourse, type RawPoint } from "@/features/races/course";
import { gradesOf, walkPortions } from "@/features/races/grade";
import {
  defaultPlan,
  type RaceSummary,
  type StoredCourse,
} from "@/features/races/race";
import { simulate } from "@/features/races/simulation";
import {
  genericFueling,
  raceTimeline,
  stationWeather,
} from "@/features/races/timeline";
import type { Waypoint } from "@/features/races/waypoints";
import type { RaceWeather, WeatherSlot } from "@/features/races/weather";
import { courseModel, planModel } from "@/features/races/workspace";

const metersPerDegree = 111_195;
const ids = {
  start: "00000000-0000-4000-8000-000000000001",
  aid: "00000000-0000-4000-8000-000000000002",
  water: "00000000-0000-4000-8000-000000000003",
  finish: "00000000-0000-4000-8000-000000000004",
};

function rolling(lengthM: number): RawPoint[] {
  return Array.from({ length: lengthM / 10 + 1 }, (_, index) => ({
    lat: 48.8 + (index * 10) / metersPerDegree,
    lon: 2.3,
    ele: 100 + 60 * Math.sin((index * 10) / 900),
  }));
}

function waypoint(
  id: string,
  kind: Waypoint["kind"],
  distanceM: number,
  extra: Partial<Waypoint> = {},
): Waypoint {
  return {
    id,
    kind,
    name: kind === "aid" ? "Ravito 1 · Trappes" : id,
    distanceM,
    cutoffMinutes: null,
    services: [],
    watchLabel: null,
    alertDistanceM: 500,
    voiceNote: null,
    todo: null,
    nutritionNote: null,
    source: "athlete",
    needsReview: false,
    revision: 1,
    ...extra,
  };
}

const course = buildCourse(rolling(40_000))!;
const stored: StoredCourse = {
  ...course,
  source: "gpx",
  fileName: "trail.gpx",
  sourceActivityId: null,
  timeZone: "Europe/Paris",
  importedAt: "2026-10-11T00:00:00Z",
};
const waypoints = [
  waypoint(ids.start, "start", 0),
  waypoint(ids.aid, "aid", 15_000, {
    cutoffMinutes: 11 * 60,
    todo: "Recharge la frontale",
  }),
  waypoint(ids.water, "water", 25_000),
  waypoint(ids.finish, "finish", course.distanceM),
];
const race: RaceSummary = {
  id: "race",
  name: "Trail",
  kind: "trail",
  date: "2027-03-20",
  distanceKm: 40,
  elevationGainM: null,
  priority: "A",
  targetSeconds: 5 * 3600,
  revision: 1,
};
const plan = { ...defaultPlan, startMinutes: 6 * 60 };
const model = courseModel(stored, waypoints, plan, race.kind);
const scenario = {
  key: "target" as const,
  label: "objectif",
  seconds: 5 * 3600,
};

function planned(paceFactors?: Record<string, number>) {
  return planModel({
    model,
    race,
    plan,
    scenario,
    timeZone: stored.timeZone,
    paceFactors,
  });
}

describe("pace factors", () => {
  const settings = {
    targetSeconds: 5 * 3600,
    walkPaceSecondsPerKm: 690,
    aidStopSeconds: 300,
    waterStopSeconds: 120,
    startMinutes: 6 * 60,
  };
  const grades = gradesOf(course);
  const portions = walkPortions(course, 10, grades);

  it("slows one segment and keeps the target finish time", () => {
    const base = simulate(course, grades, portions, model.waypoints, settings);
    const slower = simulate(course, grades, portions, model.waypoints, {
      ...settings,
      paceFactors: { [ids.aid]: 1.1 },
    });
    expect(Math.abs(slower.finishSeconds - base.finishSeconds)).toBeLessThan(2);
    expect(slower.segments[0].movingSeconds).toBeGreaterThan(
      base.segments[0].movingSeconds + 60,
    );
    expect(slower.segments[1].movingSeconds).toBeLessThan(
      base.segments[1].movingSeconds,
    );
  });

  it("leaves the simulation unchanged without factors", () => {
    const base = simulate(course, grades, portions, model.waypoints, settings);
    const neutral = simulate(course, grades, portions, model.waypoints, {
      ...settings,
      paceFactors: { [ids.water]: 1 },
    });
    expect(neutral.segments.map((segment) => segment.movingSeconds)).toEqual(
      base.segments.map((segment) => segment.movingSeconds),
    );
  });
});

describe("race timeline", () => {
  const model5h = planned();
  const timeline = raceTimeline({
    model,
    planned: model5h,
    weather: null,
    strategy: {
      consignes: ["Pars lentement."],
      segments: { [ids.aid]: { note: "Reste sous 150 bpm." } },
    },
    fueling: genericFueling(model, model5h),
    stops: plan,
    walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
  });

  it("alternates stations and segments with their numbers", () => {
    expect(timeline.stations.map((station) => station.kind)).toEqual([
      "start",
      "aid",
      "water",
      "finish",
    ]);
    expect(timeline.segments.map((segment) => segment.index)).toEqual([
      1, 2, 3,
    ]);
    expect(timeline.segments[0]).toMatchObject({
      fromName: ids.start,
      toName: "Ravito 1 · Trappes",
      note: "Reste sous 150 bpm.",
    });
    expect(timeline.segments[1].note).toBeNull();
  });

  it("computes the run pace without the walking time", () => {
    const segment = timeline.segments[0];
    const walkSeconds = (segment.walkM / 1000) * plan.walkPaceSecondsPerKm;
    const runKm = (segment.toM - segment.fromM - segment.walkM) / 1000;
    expect(segment.runPaceSecondsPerKm).toBeCloseTo(
      (segment.movingSeconds - walkSeconds) / runKm,
      3,
    );
  });

  it("shows the cutoff margin, the station refill and the stop time", () => {
    const aid = timeline.stations[1];
    expect(aid.cutoffMinutes).toBe(11 * 60);
    expect(aid.marginSeconds).toBe(5 * 3600 - aid.elapsedSeconds);
    expect(aid.refill).toMatch(/^Reprends .* · Recharge la frontale$/);
    expect(aid.stopSeconds).toBe(300);
    expect(timeline.stations[2].refill).toBe("Remplis les flasques d’eau");
    expect(timeline.stations[0].refill).toMatch(/en poche$/);
  });

  it("adds run, walk and stop time up to the finish", () => {
    const { totals } = timeline;
    expect(
      Math.abs(
        totals.runSeconds +
          totals.walkSeconds +
          totals.stopSeconds -
          model5h.simulation.finishSeconds,
      ),
    ).toBeLessThan(2);
    expect(totals.stopSeconds).toBe(420);
    expect(totals.finishClockMinutes).toBeCloseTo(6 * 60 + 300, 0);
  });

  it("follows the accepted pace factors", () => {
    const slower = planned({ [ids.aid]: 1.1 });
    expect(slower.simulation.segments[0].movingSeconds).toBeGreaterThan(
      model5h.simulation.segments[0].movingSeconds,
    );
  });
});

describe("station weather", () => {
  function slot(elapsedSeconds: number, code: number, rain = 0): WeatherSlot {
    return {
      elapsedSeconds,
      epochMs: 0,
      clockMinutes: 0,
      distanceM: 0,
      lat: 0,
      lon: 0,
      night: false,
      temperature: 12.6,
      precipitationProbability: rain,
      code,
      apparentTemperature: null,
      windKmh: null,
      windDirection: null,
      gustsKmh: null,
    };
  }
  const weather = (slots: WeatherSlot[]): RaceWeather => ({
    mode: "forecast",
    slots,
    title: "",
    detail: "",
    facts: [],
    source: "",
    rainyDayShare: null,
    forecastFrom: "",
  });

  it("uses the nearest slot", () => {
    expect(
      stationWeather(weather([slot(0, 3), slot(7200, 80, 40)]), 6000, false),
    ).toEqual({ temperature: 13, sky: "averses 40 %", glyph: "rain" });
    expect(stationWeather(weather([slot(0, 0)]), 0, true)).toMatchObject({
      sky: "nuit",
      glyph: "moon",
    });
  });

  it("invents nothing without weather", () => {
    expect(stationWeather(null, 0, false)).toBeNull();
  });
});
