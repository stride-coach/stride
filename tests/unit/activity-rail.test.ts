import { describe, expect, it } from "vitest";
import { activityRail, railWindowStart } from "@/features/activities/rail";

const run = (
  date: string,
  durationSeconds: number,
  distanceMeters = 10000,
) => ({
  date,
  durationSeconds,
  distanceMeters,
  elevationGainMeters: null,
});

describe("activityRail", () => {
  const today = "2026-11-19";

  it("sums the hours of the last seven weeks, current week last", () => {
    const rail = activityRail(
      [
        run("2026-11-18", 3600),
        run("2026-11-17", 1800),
        run("2026-11-05", 7200),
      ],
      today,
    );
    expect(rail.weeks).toHaveLength(7);
    expect(rail.weeks.at(-1)).toMatchObject({
      label: "S0",
      hours: 1.5,
      current: true,
    });
    expect(rail.weeks.at(-3)).toMatchObject({ label: "S-2", hours: 2 });
    expect(rail.weeks[0].weekStart).toBe(railWindowStart(today));
  });

  it("summarizes the last 28 days in French formats", () => {
    const rail = activityRail(
      [
        run("2026-11-18", 3600, 10500),
        { ...run("2026-10-25", 2700, 8000), elevationGainMeters: 1200 },
        run("2026-10-20", 3600),
      ],
      today,
    );
    expect(rail.recent).toEqual({
      duration: "1h45",
      count: "2 activités",
      distance: "18,5 km",
      elevation: "+1\u202f200 m",
    });
  });

  it("has no recent summary without activity in the window", () => {
    expect(activityRail([run("2026-09-01", 3600)], today).recent).toBeNull();
  });
});
