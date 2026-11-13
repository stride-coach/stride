import { describe, expect, it } from "vitest";
import {
  compareEditions,
  editionChanges,
  editionConditions,
  editionKey,
  nextEditionDate,
  raceEditions,
} from "@/features/races/editions";
import type { RaceSummary } from "@/features/races/race";

function race(
  id: string,
  name: string,
  date: string | null,
  overrides: Partial<RaceSummary> = {},
): RaceSummary {
  return {
    id,
    name,
    kind: "trail",
    date,
    distanceKm: 80,
    elevationGainM: 1500,
    priority: "B",
    targetSeconds: null,
    revision: 1,
    ...overrides,
  };
}

describe("race editions", () => {
  it("matches names across years and accents", () => {
    expect(editionKey("Ultra des Côteaux 80K 2025")).toBe(
      editionKey("ultra des coteaux 80k"),
    );
  });

  it("lists the past editions of the same race", () => {
    const current = race("now", "Ultra des Coteaux 80K", "2026-06-13");
    const races = [
      current,
      race("2025", "Ultra des Coteaux 80K 2025", "2025-06-14"),
      race("2024", "Ultra des Côteaux 80K", "2024-06-15"),
      race("short", "Ultra des Coteaux 80K", "2023-06-10", { distanceKm: 40 }),
      race("road", "Ultra des Coteaux 80K", "2022-06-11", { kind: "road" }),
      race("other", "Trail de Chevreuse", "2025-01-24"),
      race("future", "Ultra des Coteaux 80K", "2027-06-12"),
    ];
    expect(
      raceEditions(races, current, "2026-11-12").map((item) => item.id),
    ).toEqual(["2025", "2024"]);
  });

  it("estimates the next edition on the same weekday", () => {
    expect(nextEditionDate("2027-03-20", "2027-04-01")).toBe("2028-03-18");
    expect(nextEditionDate("2024-06-15", "2026-11-12")).toBe("2027-06-12");
  });
});

describe("edition comparison", () => {
  const previous = {
    year: "2025",
    seconds: 41_700,
    distanceMeters: 80_000,
    averageHeartRate: 149,
    series: {
      distance_m: [0, 40_000, 80_000],
      elapsed_s: [0, 18_000, 41_700],
    },
  };
  const current = {
    year: "2026",
    seconds: 38_880,
    distanceMeters: 80_000,
    averageHeartRate: 142,
    series: {
      distance_m: [0, 40_000, 80_000],
      elapsed_s: [0, 17_500, 38_880],
    },
  };

  it("compares time, pace and heart rate", () => {
    const comparison = compareEditions({ current, previous });
    expect(
      comparison.figures.map((item) => [
        item.key,
        item.current,
        item.previous,
        item.delta,
      ]),
    ).toEqual([
      ["time", "10h48", "11h35", "−47 min"],
      ["pace", "8:06 /km", "8:41 /km", "−35 s"],
      ["heart", "142 bpm", "149 bpm", "−7 bpm"],
      ["distance", "80,0 km", "80,0 km", null],
    ]);
    expect(comparison.reading).toMatch(/^47 min gagnées depuis 2025\./);
  });

  it("splits the course at the stations and finds the biggest gap", () => {
    const comparison = compareEditions({
      current,
      previous,
      stations: [{ name: "Mi-course", distanceM: 40_000 }],
    });
    expect(
      comparison.sections.map((section) => [section.label, section.delta]),
    ).toEqual([
      ["Départ → Mi-course", "−8 min"],
      ["Mi-course → Arrivée", "−39 min"],
    ]);
    expect(comparison.reading).toContain(
      "entre Mi-course et Arrivée : −39 min",
    );
  });

  it("cuts five equal sections without stations", () => {
    expect(compareEditions({ current, previous }).sections).toHaveLength(5);
  });
});

describe("what changed between two editions", () => {
  const run = (year: string, seconds: number, heart: number[]) => ({
    year,
    seconds,
    distanceMeters: 80_000,
    averageHeartRate: 145,
    series: {
      distance_m: [0, 8_000, 16_000, 40_000, 80_000],
      elapsed_s: [0, 2_800, 5_600, 17_500, seconds],
      heart_rate: heart,
    },
  });
  const previous = run("2025", 41_700, [140, 152, 150, 148, 150]);
  const current = run("2026", 38_880, [134, 144, 142, 146, 148]);

  it("reads the time strip", () => {
    const comparison = compareEditions({
      current,
      previous,
      stations: [{ name: "km 16", distanceM: 16_000 }],
    });
    expect(comparison.kpis.map((kpi) => [kpi.value, kpi.label])).toEqual([
      ["10h48", "2026 · 11h35 en 2025"],
      ["−47 min", "Sur le même parcours"],
      ["8:06 /km", "Allure moyenne · 8:41 /km en 2025"],
      ["145 bpm", "FC moyenne · 145 bpm en 2025"],
    ]);
    expect(comparison.startM).toBe(16_000);
  });

  it("lists the start heart rate, fueling, walking and training volume", () => {
    expect(
      editionChanges({
        current,
        previous,
        startM: 16_000,
        settings: {
          current: {
            walkGradePercent: 10,
            carbsPerHourG: 62,
            runSeconds: 118_000,
          },
          previous: {
            walkGradePercent: 12,
            carbsPerHourG: 48,
            runSeconds: 100_000,
          },
        },
      }).map((row) => [row.label, row.value, row.detail]),
    ).toEqual([
      ["Départ", "−7 bpm", "sur 16 km"],
      ["Glucides prévus", "+14 g/h", "48 g/h en 2025"],
      ["Marche", "dès 10 %", "12 % en 2025"],
      ["Volume", "+18 %", "sur 16 semaines"],
    ]);
  });

  it("leaves out what was not measured both times", () => {
    expect(
      editionChanges({
        current: { ...current, series: null },
        previous,
        startM: 16_000,
        settings: {
          current: {
            walkGradePercent: null,
            carbsPerHourG: 62,
            runSeconds: null,
          },
          previous: {
            walkGradePercent: 12,
            carbsPerHourG: null,
            runSeconds: 0,
          },
        },
      }),
    ).toEqual([]);
  });

  it("reads the conditions of both race days", () => {
    expect(
      editionConditions([
        { year: "2025", temperatureC: 24.2, dry: true },
        { year: "2026", temperatureC: 17.1, dry: false },
      ]),
    ).toEqual({
      rows: [
        { year: "2025", temperature: "24 °C", sky: "sec" },
        { year: "2026", temperature: "17 °C", sky: "pluie" },
      ],
      reading: "Il faisait 7 degrés de moins en 2026.",
    });
    expect(
      editionConditions([
        { year: "2025", temperatureC: 18, dry: true },
        { year: "2026", temperatureC: 19, dry: true },
      ]).reading,
    ).toBeNull();
  });
});
