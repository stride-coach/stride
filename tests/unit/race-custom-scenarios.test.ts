import { describe, expect, it } from "vitest";
import {
  customScenarioInputSchema,
  customScenarioRowSchema,
} from "@/features/races/custom-scenarios";

const raceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("custom scenario input", () => {
  it("trims the name and keeps unset settings empty", () => {
    expect(
      customScenarioInputSchema.parse({
        raceId,
        name: "  Sans bâtons ",
        targetSeconds: 19800,
        walkGradePercent: null,
        aidStopSeconds: null,
        carbsPerHourG: 80,
      }),
    ).toMatchObject({ name: "Sans bâtons", walkGradePercent: null });
  });

  it("refuses an empty name and settings out of range", () => {
    const base = {
      raceId,
      name: "Test",
      targetSeconds: 19800,
      walkGradePercent: null,
      aidStopSeconds: null,
      carbsPerHourG: null,
    };
    expect(
      customScenarioInputSchema.safeParse({ ...base, name: " " }).success,
    ).toBe(false);
    expect(
      customScenarioInputSchema.safeParse({ ...base, walkGradePercent: 30 })
        .success,
    ).toBe(false);
    expect(
      customScenarioInputSchema.safeParse({ ...base, carbsPerHourG: 10 })
        .success,
    ).toBe(false);
  });
});

describe("custom scenario row", () => {
  it("reads a stored row", () => {
    expect(
      customScenarioRowSchema.parse({
        id: "11111111-1111-4111-8111-111111111111",
        name: "Sans bâtons",
        target_seconds: 19800,
        walk_grade_percent: 12,
        aid_stop_seconds: null,
        carbs_per_hour_g: 90,
        position: 1,
      }),
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Sans bâtons",
      targetSeconds: 19800,
      walkGradePercent: 12,
      aidStopSeconds: null,
      carbsPerHourG: 90,
      position: 1,
    });
  });
});
