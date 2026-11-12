import { describe, expect, it } from "vitest";
import { fuelingHours } from "@/features/races/nutrition-view";
import { raceAllocation } from "@/features/races/race-nutrition";
import { model, plan, target, timeline } from "./race-course-fixture";

const allocation = raceAllocation({
  model,
  planned: target,
  plan,
  nutritionPlan: null,
  products: [],
});

describe("fueling hour by hour", () => {
  const hours = fuelingHours(allocation, timeline);

  it("covers every hour from the start clock", () => {
    const finish = timeline.stations.at(-1)!.elapsedSeconds;
    expect(hours).toHaveLength(Math.ceil(finish / 3600));
    expect(hours[0]).toMatchObject({ index: 0, clock: "06:00" });
    expect(hours[1].clock).toBe("07:00");
  });

  it("spreads each section's carbs over its moving time", () => {
    const total = hours.reduce((sum, hour) => sum + hour.carbsG, 0);
    const planned = allocation.segments.reduce(
      (sum, segment) => sum + segment.carbsG,
      0,
    );
    expect(Math.abs(total - planned)).toBeLessThanOrEqual(hours.length);
    expect(hours.every((hour) => hour.carbsG >= 0)).toBe(true);
  });

  it("flags caffeine only where the plan takes some", () => {
    const caffeine = allocation.segments.some(
      (segment) => segment.caffeineMg > 0,
    );
    expect(hours.some((hour) => hour.caffeine)).toBe(caffeine);
  });
});
