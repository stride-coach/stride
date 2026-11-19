import { describe, expect, it } from "vitest";
import {
  chartMonths,
  chartRange,
  chartTicks,
  chartToday,
} from "@/features/plans/view/program-chart";

const weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-11-02"].map(
  (weekStart) => ({ weekStart, totals: { durationSeconds: 3600 } }),
);

describe("program chart", () => {
  it("groups weeks under the month they start in", () => {
    expect(chartMonths(weeks)).toEqual([
      { label: "sept.", start: 0, span: 1, seconds: 3600 },
      { label: "oct.", start: 1, span: 2, seconds: 7200 },
      { label: "nov.", start: 3, span: 1, seconds: 3600 },
    ]);
  });

  it("spans from the first Monday to the last Sunday", () => {
    expect(chartRange(weeks)).toBe("28 sept. → 8 nov.");
    expect(chartRange([])).toBeNull();
  });

  it("labels the first week, the selected week and every fifth week", () => {
    expect([...chartTicks(12, 1)].sort((a, b) => a - b)).toEqual([0, 1, 4, 9]);
  });

  it("places today inside its week and month", () => {
    expect(chartToday(weeks, "2026-10-07")).toMatchObject({
      label: "7 oct.",
      month: 2,
      months: 3,
    });
    expect(chartToday(weeks, "2026-10-07")?.fraction).toBeCloseTo(9.5 / 28, 5);
  });

  it("has no position outside the program", () => {
    expect(chartToday(weeks, "2026-09-01")).toBeNull();
    expect(chartToday(weeks, "2027-01-01")).toBeNull();
    expect(chartToday(weeks, null)).toBeNull();
  });
});
