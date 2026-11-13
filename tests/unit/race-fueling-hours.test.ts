import { describe, expect, it } from "vitest";
import {
  fuelingChart,
  fuelingHours,
  listItems,
  sectionTips,
} from "@/features/races/nutrition-view";
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

describe("fueling chart", () => {
  const chart = fuelingChart(allocation, timeline, 20);

  it("places the stations, the drink per section and an intake per alarm", () => {
    expect(chart.stations.map((station) => station.at)).toEqual(
      [...chart.stations.map((station) => station.at)].sort((a, b) => a - b),
    );
    expect(chart.stations[0]!.at).toBe(0);
    expect(chart.stations.at(-1)!.at).toBe(1);
    expect(chart.drink).toHaveLength(allocation.segments.length);
    expect(chart.drink[0]!.label).toMatch(/^\d+ ml\/h/);
    const expected = Math.ceil(chart.finishSeconds / 1200) - 1;
    expect(chart.intakes.length).toBe(expected);
    expect(
      chart.intakes.every((intake) => intake.at > 0 && intake.at < 1),
    ).toBe(true);
  });

  it("marks one caffeinated intake per caffeinated hour", () => {
    const hours = fuelingHours(allocation, timeline).filter(
      (hour) => hour.caffeine,
    ).length;
    expect(
      chart.intakes.filter((intake) => intake.caffeine).length,
    ).toBeLessThanOrEqual(hours);
  });

  it("reads the section tips", () => {
    const tips = sectionTips(allocation, timeline);
    expect(tips).toHaveLength(allocation.segments.length);
    expect(tips.at(-1)).toBe("Dernière section : tu finis au ressenti.");
    expect(listItems("2 gels · 1 compote ·  · 1 flasque")).toEqual([
      "2 gels",
      "1 compote",
      "1 flasque",
    ]);
  });
});
