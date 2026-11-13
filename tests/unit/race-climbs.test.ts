import { describe, expect, it } from "vitest";
import {
  climbRows,
  climbStats,
  thresholdComparison,
  thresholdOptions,
} from "@/features/races/climbs";
import { formatClock } from "@/features/races/format";
import { model, plan, race, target, timeline } from "./race-course-fixture";

const settings = {
  targetSeconds: 5 * 3600,
  walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
  aidStopSeconds: plan.aidStopSeconds,
  waterStopSeconds: plan.waterStopSeconds,
  startMinutes: 6 * 60,
};

function pace(value: string | null) {
  if (!value) return Number.POSITIVE_INFINITY;
  const [minutes, seconds] = value.replace(" /km", "").split(":").map(Number);
  return minutes * 60 + seconds;
}

describe("climb thresholds", () => {
  it("offers the board's thresholds and keeps the current one", () => {
    expect(thresholdOptions(10)).toEqual([6, 8, 10, 12, 15]);
    expect(thresholdOptions(5)).toEqual([5, 6, 8, 10, 12, 15]);
  });
});

describe("climbs to walk", () => {
  const rows = climbRows({ model, planned: target, timeline });

  it("lists every walked climb with its section, grade and passage", () => {
    expect(rows).toHaveLength(model.portions.length);
    expect(rows.length).toBeGreaterThan(0);
    const [first] = rows;
    expect(first).toMatchObject({ number: 1 });
    expect(first.section).toMatch(/ → /);
    expect(first.gain).toMatch(/^\+\d+ m$/);
    expect(Number(first.average.replace(" %", ""))).toBeGreaterThan(0);
    expect(Number(first.max.replace(" %", ""))).toBeGreaterThanOrEqual(
      plan.walkGradePercent,
    );
    expect(first.passage >= formatClock(6 * 60)).toBe(true);
  });

  it("sums the climbs, the distance walked and the running pace", () => {
    const stats = climbStats({
      model,
      planned: target,
      walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
    });
    expect(stats.count).toBe(rows.length);
    expect(stats.runPace).toMatch(/^\d+:\d{2} \/km$/);
  });
});

describe("what the threshold changes", () => {
  const rows = thresholdComparison({
    model,
    kind: race.kind,
    settings,
    current: plan.walkGradePercent,
  });

  it("walks less and runs slower as the threshold rises", () => {
    expect(rows.map((row) => row.threshold)).toEqual([5, 6, 8, 10, 12, 15]);
    expect(rows.find((row) => row.current)?.threshold).toBe(5);
    for (let index = 1; index < rows.length; index += 1) {
      expect(rows[index].count).toBeLessThanOrEqual(rows[index - 1].count);
      expect(pace(rows[index].runPace)).toBeGreaterThanOrEqual(
        pace(rows[index - 1].runPace),
      );
    }
    expect(rows[0].count).toBeGreaterThan(rows.at(-1)!.count);
    for (let index = 1; index < rows.length; index += 1)
      expect(rows[index].share).toBeLessThanOrEqual(rows[index - 1].share);
    expect(rows[0].share).toBeGreaterThan(0);
    expect(rows[0].share).toBeLessThanOrEqual(1);
    expect(rows[0].shareLabel).toMatch(/^\d+ %$/);
  });
});
