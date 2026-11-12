import { describe, expect, it } from "vitest";
import { formatClock } from "@/features/races/format";
import { raceAllocation } from "@/features/races/race-nutrition";
import {
  settingValue,
  simulationSummary,
  stepSetting,
} from "@/features/races/simulation-settings";
import { raceTimeline, timelineFueling } from "@/features/races/timeline";
import { courseModel, planModel } from "@/features/races/workspace";
import type { RacePlan } from "@/features/races/race";
import { course, plan, race, stored, waypoints } from "./race-course-fixture";

function simulate(overrides: Partial<RacePlan> = {}) {
  const settings = { ...plan, ...overrides };
  const model = courseModel(stored, waypoints, settings, race.kind);
  const planned = planModel({
    model,
    race,
    plan: settings,
    scenario: { key: "target", label: "objectif", seconds: 5 * 3600 },
    timeZone: stored.timeZone,
  })!;
  const timeline = raceTimeline({
    model,
    planned,
    weather: null,
    strategy: null,
    fueling: timelineFueling(
      raceAllocation({
        model,
        planned,
        plan: settings,
        nutritionPlan: null,
        products: [],
      }),
    ),
    stops: settings,
    walkPaceSecondsPerKm: settings.walkPaceSecondsPerKm,
  });
  return {
    timeline,
    summary: simulationSummary({
      planned,
      timeline,
      distanceM: course.distanceM,
      raceDate: race.date,
      startMinutes: 6 * 60,
    }),
  };
}

describe("simulation steps", () => {
  it("moves each setting by its step within its bounds", () => {
    expect(stepSetting("target", 66_600, 1)).toBe(66_900);
    expect(stepSetting("target", 600, -1)).toBe(600);
    expect(stepSetting("walkGrade", 10, -1)).toBe(9);
    expect(stepSetting("walkGrade", 20, 1)).toBe(20);
    expect(stepSetting("aidStop", 300, 1)).toBe(360);
    expect(stepSetting("aidStop", 0, -1)).toBe(0);
  });

  it("formats each setting", () => {
    expect(settingValue("target", 66_600)).toBe("18h30");
    expect(settingValue("walkGrade", 10)).toBe("10 %");
    expect(settingValue("aidStop", 300)).toBe("5 min");
  });
});

describe("simulation summary", () => {
  it("sums the finish, walking, night, cutoff margin and stops", () => {
    const { timeline, summary } = simulate();
    expect(summary.finish).toEqual({
      value: formatClock(timeline.totals.finishClockMinutes),
      detail: null,
    });
    expect(summary.walk.detail).toMatch(/^\d+ % du parcours$/);
    expect(summary.night?.detail).toBe("dès le départ");
    expect(summary.margin).toMatchObject({
      detail: "barrière de Ravito 1 · Trappes",
      tight: false,
    });
    expect(summary.stops.count).toBe(2);
  });

  it("names the finish cutoff", () => {
    const { summary } = simulate({ aidStopSeconds: 0 });
    expect(summary.margin?.detail).toMatch(/^barrière (de |à l’arrivée)/);
  });

  it("recalculates passages, walking and stops when a setting changes", () => {
    const base = simulate();
    const longer = simulate({ aidStopSeconds: 900 });
    expect(longer.summary.stops.total).not.toBe(base.summary.stops.total);
    expect(longer.timeline.stations[1].marginSeconds).not.toBe(
      base.timeline.stations[1].marginSeconds,
    );
    const steeper = simulate({ walkGradePercent: 8 });
    const walked = (result: ReturnType<typeof simulate>) =>
      result.timeline.segments.reduce((sum, segment) => sum + segment.walkM, 0);
    expect(walked(steeper)).toBeLessThan(walked(base));
  });
});
