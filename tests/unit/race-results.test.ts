import { describe, expect, it } from "vitest";
import {
  formatResultDelta,
  formatResultTime,
  matchRaceResult,
  type ResultActivity,
} from "@/features/races/results";

const race = {
  date: "2026-09-27",
  distanceKm: 80,
  targetSeconds: 43_200,
};

function activity(values: Partial<ResultActivity>): ResultActivity {
  return {
    id: "run",
    type: "trail_running",
    date: "2026-09-27",
    distanceMeters: 80_200,
    durationSeconds: 42_720,
    ...values,
  };
}

describe("race result matching", () => {
  it("links the closest run on the race day within 15 %", () => {
    expect(
      matchRaceResult(race, [
        activity({ id: "warmup", distanceMeters: 3_000 }),
        activity({ id: "far", distanceMeters: 70_000 }),
        activity({ id: "race" }),
        activity({ id: "ride", type: "road_biking" }),
      ]),
    ).toEqual({
      activityId: "race",
      seconds: 42_720,
      distanceMeters: 80_200,
      deltaSeconds: -480,
    });
  });

  it("finds nothing on another day, another sport or too far off", () => {
    expect(
      matchRaceResult(race, [
        activity({ date: "2026-09-28" }),
        activity({ type: "hiking" }),
        activity({ distanceMeters: 60_000 }),
        activity({ type: null }),
      ]),
    ).toBeNull();
    expect(matchRaceResult({ ...race, distanceKm: null }, [activity({})])).toBe(
      null,
    );
  });

  it("keeps the time without a target", () => {
    expect(
      matchRaceResult({ ...race, targetSeconds: null }, [activity({})])
        ?.deltaSeconds,
    ).toBeNull();
  });

  it("formats race times and deltas", () => {
    expect(formatResultTime(42_720)).toBe("11h52");
    expect(formatResultTime(2_652)).toBe("44:12");
    expect(formatResultDelta(-480)).toBe("−8 min");
    expect(formatResultDelta(660)).toBe("+11 min");
    expect(formatResultDelta(-20)).toBe("−20 s");
    expect(formatResultDelta(3_900)).toBe("+1h05");
  });
});
