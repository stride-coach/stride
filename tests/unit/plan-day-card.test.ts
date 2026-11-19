import { describe, expect, it } from "vitest";
import { dayCardMetrics } from "../../src/features/plans/view/day-card";

const session = {
  family: "easy" as const,
  duration: "45’",
  durationSeconds: 2700,
  distance: "7,5 km",
  distanceMeters: 7500,
  distanceEstimated: false,
  elevation: null,
};

describe("plan day card metrics", () => {
  it("leaves rest days empty", () => {
    expect(dayCardMetrics([])).toBeNull();
  });

  it("joins duration, distance and climb of a single session", () => {
    expect(dayCardMetrics([{ ...session, elevation: "320 m D+" }])).toBe(
      "45’ · 7,5 km · +320 m",
    );
  });

  it("shows only the distance of a race", () => {
    expect(
      dayCardMetrics([
        {
          ...session,
          family: "race",
          duration: null,
          durationSeconds: null,
          distance: "10 km",
          distanceMeters: 10000,
        },
      ]),
    ).toBe("10 km");
  });

  it("adds up the sessions of a double day", () => {
    expect(
      dayCardMetrics([
        {
          ...session,
          family: "strength_specific",
          duration: "30’",
          durationSeconds: 1800,
          distance: null,
          distanceMeters: null,
        },
        {
          ...session,
          duration: "30’",
          durationSeconds: 1800,
          distance: "≈ 5,2 km",
          distanceMeters: 5200,
          distanceEstimated: true,
        },
      ]),
    ).toBe("1h · ≈ 5,2 km");
  });
});
