import { describe, expect, it } from "vitest";
import {
  afterChart,
  afterKpis,
  afterReading,
  recoveryPhases,
  elapsedAtDistance,
  passageChecks,
  recoveryDays,
} from "@/features/races/after-race";
import type { RecoveryNight } from "@/features/progress/recovery";
import type { TimelineStation } from "@/features/races/timeline";

function station(
  id: string,
  kind: TimelineStation["kind"],
  distanceM: number,
  elapsedSeconds: number,
): TimelineStation {
  return {
    id,
    name: id,
    kind,
    distanceM,
    clockMinutes: 360 + elapsedSeconds / 60,
    elapsedSeconds,
    cutoffMinutes: null,
    marginSeconds: null,
    night: false,
    weather: null,
    refill: null,
    stopSeconds: 0,
  };
}

const stations = [
  station("Départ", "start", 0, 0),
  station("Buc", "aid", 10_000, 3600),
  station("Chaville", "aid", 20_000, 7200),
  station("Arrivée", "finish", 30_000, 10_800),
];

const series = {
  distance_m: [0, 10_000, 20_000, 30_000],
  elapsed_s: [0, 3500, 8000, 11_400],
};

describe("after the race", () => {
  it("interpolates the elapsed time at a distance", () => {
    expect(elapsedAtDistance(series, 15_000)).toBe(5750);
    expect(elapsedAtDistance({}, 15_000)).toBeNull();
  });

  it("compares each passage with the plan", () => {
    const checks = passageChecks({ stations, series, finishSeconds: 11_400 });
    expect(
      checks.map((item) => [item.name, item.planned, item.actual, item.delta]),
    ).toEqual(
      [
        ["Buc", "58:20", "58:20", "−2 min"],
        ["Chaville", "2h00", "2h13", "+13 min"],
        ["Arrivée", "3h00", "3h10", "+10 min"],
      ].map(([name, , actual, delta]) => [
        name,
        expect.any(String),
        actual,
        delta,
      ]),
    );
    expect(checks[1].deltaSeconds).toBe(800);
  });

  it("reads where the gap with the plan grew", () => {
    const passages = passageChecks({ stations, series, finishSeconds: 11_400 });
    expect(
      afterReading({
        result: {
          activityId: "a",
          seconds: 11_400,
          distanceMeters: 30_000,
          deltaSeconds: 600,
        },
        passages,
      }),
    ).toBe(
      "Course terminée en 3h10, 10 min au-dessus de ton objectif. L’écart le plus grand avec le plan s’est creusé entre Buc et Chaville : +15 min.",
    );
  });

  it("lists the result figures from the matched activity", () => {
    expect(
      afterKpis({
        race: { targetSeconds: 10_800 },
        result: {
          activityId: "a",
          seconds: 11_400,
          distanceMeters: 30_000,
          deltaSeconds: 600,
        },
        averageHeartRate: 141.4,
        elevationGainM: null,
      }).map((kpi) => [kpi.key, kpi.value, kpi.label]),
    ).toEqual([
      ["time", "3h10", "Temps · objectif 3h"],
      ["pace", "6:20 /km", "Allure moyenne"],
      ["heart", "141 bpm", "FC moyenne"],
      ["distance", "30,0 km", "Distance"],
    ]);
  });
});

describe("recovery after the race", () => {
  const night = (
    day: string,
    restingHeartRate: number | null,
    hrv: number | null,
  ): RecoveryNight => ({
    day,
    readiness: null,
    sleepSeconds: null,
    sleepScore: null,
    hrv,
    hrvStatus: null,
    restingHeartRate,
  });

  it("compares the nights after the race with the weeks before", () => {
    const { days, baseline } = recoveryDays({
      nights: [
        night("2027-03-10", 45, 60),
        night("2027-03-15", 46, 62),
        night("2027-03-19", 44, 58),
        night("2027-03-21", 52, 41),
        night("2027-03-22", null, null),
        night("2027-03-24", 47, null),
        night("2027-04-15", 45, 60),
      ],
      raceDate: "2027-03-20",
      today: "2027-03-25",
    });
    expect(baseline).toBe(
      "Ta base des 28 jours avant la course : FC repos 45 bpm, VFC 60 ms.",
    );
    expect(
      days.map((day) => [day.label, day.restingHeartRate, day.hrv]),
    ).toEqual([
      [
        "J+1",
        { value: "52 bpm", delta: "+7" },
        { value: "41 ms", delta: "−19" },
      ],
      ["J+4", { value: "47 bpm", delta: "+2" }, null],
    ]);
  });
});

describe("recovery phases", () => {
  const night = (
    day: string,
    restingHeartRate: number | null,
    hrv: number | null,
  ): RecoveryNight => ({
    day,
    readiness: null,
    sleepSeconds: null,
    sleepScore: null,
    hrv,
    hrvStatus: null,
    restingHeartRate,
  });
  const before = [
    [45, 60],
    [46, 62],
    [44, 58],
    [45, 60],
    [46, 61],
    [44, 59],
    [45, 60],
  ].map(([rest, hrv], index) =>
    night(`2027-03-${String(10 + index).padStart(2, "0")}`, rest, hrv),
  );

  it("groups the nights after the race by where they sit in the usual range", () => {
    const phases = recoveryPhases({
      nights: [
        ...before,
        night("2027-03-21", 52, 41),
        night("2027-03-22", 51, 50),
        night("2027-03-23", 46, 52),
        night("2027-03-25", 45, 60),
      ],
      raceDate: "2027-03-20",
      today: "2027-03-26",
    });
    expect(
      phases.map((phase) => [phase.days, phase.title, phase.detail]),
    ).toEqual([
      [
        "J+1 → J+2",
        "FC repos haute, VFC basse",
        "FC repos jusqu’à +7 · VFC jusqu’à −19 ms",
      ],
      ["J+3", "VFC sous ta plage", "VFC jusqu’à −8 ms"],
      ["J+5", "Retour dans ta plage", "FC repos et VFC dans ta plage"],
    ]);
  });

  it("needs a week of nights before the race to set the range", () => {
    expect(
      recoveryPhases({
        nights: [before[0], night("2027-03-21", 52, 41)],
        raceDate: "2027-03-20",
        today: "2027-03-26",
      }),
    ).toEqual([]);
  });
});

describe("the race on its plan", () => {
  const chart = afterChart({
    stations,
    series,
    finishSeconds: 11_400,
    elevation: [
      [0, 100],
      [15_000, 300],
      [30_000, 120],
    ],
    night: [{ fromM: 25_000, toM: 30_000 }],
  })!;

  it("places every station at its actual clock", () => {
    expect(chart.distanceM).toBe(30_000);
    expect(
      chart.stations.map((item) => [item.name, item.distanceM, item.clock]),
    ).toEqual([
      ["Départ", 0, "06:00"],
      ["Buc", 10_000, "06:58"],
      ["Chaville", 20_000, "08:13"],
      ["Arrivée", 30_000, "09:10"],
    ]);
  });

  it("draws the gap to the plan from the start", () => {
    expect(chart.gaps.map((gap) => [gap.distanceM, gap.label])).toEqual([
      [0, null],
      [10_000, "−2 min"],
      [20_000, "+13 min"],
      [30_000, "+10 min"],
    ]);
  });

  it("compares the planned and actual pace of each section", () => {
    expect(
      chart.paces.map((pace) => [
        pace.fromM,
        pace.toM,
        pace.planned,
        pace.actual,
      ]),
    ).toEqual([
      [0, 10_000, "6:00", "5:50"],
      [10_000, 20_000, "6:00", "7:30"],
      [20_000, 30_000, "6:00", "5:40"],
    ]);
  });

  it("needs the activity track to draw the race", () => {
    expect(
      afterChart({
        stations,
        series: null,
        finishSeconds: 11_400,
        elevation: [],
        night: [],
      }),
    ).toBeNull();
  });
});
