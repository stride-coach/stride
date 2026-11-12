import { describe, expect, it } from "vitest";
import {
  axisLanes,
  axisReadings,
  roadbookRows,
  roadbookTotals,
} from "@/features/races/axis";
import { buildCourse, type RawPoint } from "@/features/races/course";
import { formatClock } from "@/features/races/format";
import { profileData } from "@/features/races/profile";
import {
  defaultPlan,
  type RaceSummary,
  type StoredCourse,
} from "@/features/races/race";
import { raceAllocation } from "@/features/races/race-nutrition";
import {
  planProfile,
  raceTimeline,
  timelineFueling,
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
const plan = { ...defaultPlan, startMinutes: 6 * 60, walkGradePercent: 5 };
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

const target = planned()!;
const timeline = raceTimeline({
  model,
  planned: target,
  weather: null,
  strategy: null,
  fueling: timelineFueling(
    raceAllocation({
      model,
      planned: target,
      plan,
      nutritionPlan: null,
      products: [],
    }),
  ),
  stops: plan,
  walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
});

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
      false,
      true,
      false,
      false,
    ]);
    expect(lanes.temperature).toHaveLength(4);
    expect(lanes.walk.length).toBe(model.portions.length);
  });
});
