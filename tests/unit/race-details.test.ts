import { describe, expect, it } from "vitest";
import {
  raceDetailsOf,
  targetEstimate,
  type ReferenceRace,
} from "@/features/races/race-details";

describe("race details", () => {
  it("reads stored details and ignores unknown values", () => {
    expect(
      raceDetailsOf({
        location: "Chevreuse (78)",
        poles: "forbidden",
        expectation: "rehearsal",
        test_items: ["Départ de nuit"],
      }),
    ).toEqual({
      location: "Chevreuse (78)",
      poles: "forbidden",
      expectation: "rehearsal",
      testItems: ["Départ de nuit"],
    });
    expect(raceDetailsOf({ poles: "sometimes" })).toEqual({
      location: null,
      poles: null,
      expectation: null,
      testItems: [],
    });
  });
});

describe("target estimate", () => {
  const ultra: ReferenceRace = {
    name: "Ultra des Coteaux 80K",
    date: "2026-06-13",
    kind: "trail",
    distanceKm: 80,
    elevationGainM: 1500,
    seconds: 38_880,
  };
  const tenK: ReferenceRace = {
    name: "10K Vincennes",
    date: "2026-11-22",
    kind: "road",
    distanceKm: 10,
    elevationGainM: null,
    seconds: 2670,
  };

  it("scales the closest comparable race with a range", () => {
    const estimate = targetEstimate([tenK, ultra], {
      kind: "trail",
      distanceKm: 45,
      elevationGainM: 1150,
    });
    expect(estimate?.text).toMatch(
      /^Stride estime \d+h\d{2} – \d+h\d{2} d’après ton Ultra des Coteaux 80K de juin\.$/,
    );
    expect(estimate!.low).toBeLessThan(estimate!.high);
    expect(estimate!.low % 300).toBe(0);
  });

  it("estimates nothing without a comparable race or a distance", () => {
    expect(
      targetEstimate([tenK], {
        kind: "trail",
        distanceKm: 120,
        elevationGainM: 2100,
      }),
    ).toBeNull();
    expect(
      targetEstimate([ultra], {
        kind: "trail",
        distanceKm: null,
        elevationGainM: null,
      }),
    ).toBeNull();
  });
});
