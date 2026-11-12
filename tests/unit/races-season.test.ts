import { describe, expect, it } from "vitest";
import type { RaceSummary } from "@/features/races/race";
import {
  bestWeeklyRunSeconds,
  currentValues,
  raceDemands,
  raceOutcome,
  seasonRole,
  targetPace,
} from "@/features/races/season";
import type { GarminPrediction } from "@/features/progress/garmin-predictions";

function race(overrides: Partial<RaceSummary> = {}): RaceSummary {
  return {
    id: "a",
    name: "EcoTrail Paris 120K",
    kind: "trail",
    date: "2027-03-20",
    distanceKm: 120,
    elevationGainM: 2100,
    priority: "A",
    targetSeconds: 66_600,
    revision: 1,
    ...overrides,
  };
}

describe("season role", () => {
  const goal = race();
  const rehearsal = race({ id: "b", priority: "B", date: "2027-01-24" });
  const pace = race({
    id: "c",
    priority: "C",
    kind: "road",
    date: "2026-11-22",
  });

  it("names the objective, the rehearsal and the pace test", () => {
    const races = [pace, rehearsal, goal];
    expect(seasonRole(goal, races)).toBe("Objectif de la saison");
    expect(seasonRole(rehearsal, races)).toBe("Répétition générale");
    expect(seasonRole(pace, races)).toBe("Test d’allure");
  });

  it("keeps a B race after the objective and a trail C race generic", () => {
    const late = race({ id: "b2", priority: "B", date: "2027-06-13" });
    const trail = race({ id: "c2", priority: "C", date: "2026-12-13" });
    expect(seasonRole(late, [goal, late])).toBe("Course importante");
    expect(seasonRole(trail, [trail, goal])).toBe("Course de préparation");
  });
});

describe("race outcome", () => {
  const result = (deltaSeconds: number | null) => ({
    activityId: "x",
    seconds: 38_880,
    distanceMeters: 80_000,
    deltaSeconds,
  });

  it("says whether the target was held", () => {
    expect(raceOutcome(race(), result(-120))).toEqual({
      label: "Objectif tenu",
      tone: "success",
    });
    expect(raceOutcome(race(), result(1140))).toEqual({
      label: "+19 min sur l’objectif",
      tone: "warning",
    });
  });

  it("stays neutral without a target or a result", () => {
    expect(raceOutcome(race({ targetSeconds: null }), result(null))).toEqual({
      label: "Terminé",
      tone: "muted",
    });
    expect(raceOutcome(race(), undefined)).toEqual({
      label: "Résultat non trouvé",
      tone: "muted",
    });
  });
});

describe("weekly running volume", () => {
  it("keeps the biggest Monday-to-Sunday week of running", () => {
    const activity = (day: string, type: string, duration: number) => ({
      id: day + type,
      day,
      type,
      name: null,
      distance: 10_000,
      duration,
      gain: null,
    });
    expect(
      bestWeeklyRunSeconds([
        activity("2026-10-05", "running", 3600),
        activity("2026-10-11", "trail_running", 7200),
        activity("2026-10-12", "running", 9000),
        activity("2026-10-10", "cycling", 20_000),
      ]),
    ).toBe(10_800);
    expect(bestWeeklyRunSeconds([])).toBeNull();
  });
});

describe("race demands", () => {
  it("compares the athlete's best marks with what the race demands", () => {
    expect(
      raceDemands(race(), {
        longestRunMeters: 22_000,
        maxWeeklyGainMeters: 1190,
        maxWeeklyRunSeconds: 20_820,
      }),
    ).toEqual([
      {
        key: "longest",
        label: "Sortie la plus longue",
        current: "22 km",
        target: "60 km",
        ratio: 22 / 60,
      },
      {
        key: "gain",
        label: "Dénivelé / semaine",
        current: "+1\u202f190 m",
        target: "+2\u202f100 m",
        ratio: 1190 / 2100,
      },
      {
        key: "volume",
        label: "Volume / semaine",
        current: "5h47",
        target: "8h00",
        ratio: 20_820 / 28_800,
      },
    ]);
  });

  it("hides what a road race or missing data does not demand", () => {
    expect(
      raceDemands(
        race({ kind: "road", distanceKm: 10, elevationGainM: null }),
        {
          longestRunMeters: null,
          maxWeeklyGainMeters: 400,
          maxWeeklyRunSeconds: 36_000,
        },
      ).map((row) => [row.key, row.current, row.ratio]),
    ).toEqual([
      ["longest", "—", 0],
      ["volume", "10h00", 1],
    ]);
    expect(
      raceDemands(race({ distanceKm: null }), {
        longestRunMeters: 1,
        maxWeeklyGainMeters: 1,
        maxWeeklyRunSeconds: 1,
      }).map((row) => row.key),
    ).toEqual(["gain"]);
  });
});

describe("current values", () => {
  const prediction = (
    key: GarminPrediction["key"],
    seconds: number,
    previous: number | null,
  ): GarminPrediction => ({
    key,
    label: key,
    meters: 0,
    seconds,
    asOf: "2026-10-07",
    previous:
      previous === null ? null : { seconds: previous, asOf: "2026-09-09" },
  });

  it("lists 10 km, half and marathon with their change", () => {
    expect(
      currentValues([
        prediction("5k", 1260, 1270),
        prediction("marathon", 12_660, 12_780),
        prediction("10k", 2680, 2705),
        prediction("half_marathon", 5930, null),
      ]),
    ).toEqual([
      {
        key: "10k",
        label: "10 km",
        time: "44:40",
        change: "−25 s",
        tone: "success",
      },
      {
        key: "half_marathon",
        label: "Semi",
        time: "1:38:50",
        change: null,
        tone: "muted",
      },
      {
        key: "marathon",
        label: "Marathon",
        time: "3:31:00",
        change: "−2 min",
        tone: "success",
      },
    ]);
  });
});

describe("target pace", () => {
  it("divides the target by the distance", () => {
    expect(targetPace(race())).toBe("9:15 /km");
    expect(targetPace(race({ targetSeconds: null }))).toBeNull();
  });
});
