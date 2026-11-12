import { describe, expect, test } from "vitest";
import { elevationBetween } from "@/features/races/course";
import { estimatedCourseModel, planModel } from "@/features/races/workspace";
import { plan, race, waypoints } from "./race-course-fixture";

const announced = { ...race, distanceKm: 40, elevationGainM: 2000 };

describe("race estimate without a course", () => {
  test("spreads the announced D+ evenly and never walks", () => {
    const model = estimatedCourseModel(announced, waypoints)!;
    expect(model.course.distanceM).toBe(40_000);
    expect(model.portions).toEqual([]);
    expect(model.grades.every((grade) => grade === 0)).toBe(true);
    expect(elevationBetween(model.course, 0, 10_000).gain).toBeCloseTo(500, -1);
    expect(elevationBetween(model.course, 20_000, 40_000).gain).toBeCloseTo(
      1000,
      -1,
    );
    expect(model.waypoints.map((point) => point.name)).toEqual([
      expect.any(String),
      "Ravito 1 · Trappes",
      expect.any(String),
      expect.any(String),
    ]);
  });

  test("times each station from the announced distance and the target", () => {
    const model = estimatedCourseModel(announced, waypoints)!;
    const planned = planModel({
      model,
      race: { ...announced, date: null },
      plan: { ...plan, aidStopSeconds: 0, waterStopSeconds: 0 },
      scenario: { key: "target", label: "objectif", seconds: 4 * 3600 },
      timeZone: "Europe/Paris",
    });
    expect(planned.simulation.finishSeconds).toBe(4 * 3600);
    expect(planned.night).toBeNull();
    const aid = planned.simulation.passages[1];
    expect(aid.elapsedSeconds).toBeGreaterThan(0.3 * 4 * 3600);
    expect(aid.elapsedSeconds).toBeLessThan(0.375 * 4 * 3600);
  });

  test("needs an announced distance", () => {
    expect(
      estimatedCourseModel({ ...announced, distanceKm: null }, waypoints),
    ).toBeNull();
  });
});
