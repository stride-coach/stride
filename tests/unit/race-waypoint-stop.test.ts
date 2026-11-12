import { describe, expect, test } from "vitest";
import { stopTotalSeconds } from "@/features/races/simulation";
import { courseModel, planModel } from "@/features/races/workspace";
import { ids, plan, race, stored, waypoints } from "./race-course-fixture";

describe("planned stop per waypoint", () => {
  const own = waypoints.map((point) =>
    point.id === ids.aid ? { ...point, stopSeconds: 720 } : point,
  );

  test("overrides the common aid-station stop for that station only", () => {
    const model = courseModel(stored, own, plan, race.kind);
    const planned = planModel({
      model,
      race,
      plan,
      scenario: { key: "target", label: "objectif", seconds: 5 * 3600 },
      timeZone: stored.timeZone,
    });
    expect(planned.simulation.stops).toEqual([
      { distanceM: 15_000, seconds: 720 },
      { distanceM: 25_000, seconds: plan.waterStopSeconds },
    ]);
    expect(stopTotalSeconds(own, stored.distanceM, plan)).toBe(
      720 + plan.waterStopSeconds,
    );
  });

  test("keeps the common stop when the station has none of its own", () => {
    expect(stopTotalSeconds(waypoints, stored.distanceM, plan)).toBe(
      plan.aidStopSeconds + plan.waterStopSeconds,
    );
  });
});
