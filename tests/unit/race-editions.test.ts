import { describe, expect, it } from "vitest";
import {
  compareEditions,
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
