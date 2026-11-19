import { describe, expect, it } from "vitest";
import {
  chartMonths,
  chartRange,
  chartTicks,
} from "@/features/plans/view/program-chart";

const weeks = ["2026-09-28", "2026-10-05", "2026-10-12", "2026-11-02"].map(
  (weekStart) => ({ weekStart }),
);

describe("program chart", () => {
  it("groups weeks under the month they start in", () => {
    expect(chartMonths(weeks)).toEqual([
      { label: "sept.", start: 0, span: 1 },
      { label: "oct.", start: 1, span: 2 },
      { label: "nov.", start: 3, span: 1 },
    ]);
  });

  it("spans from the first Monday to the last Sunday", () => {
    expect(chartRange(weeks)).toBe("28 sept. → 8 nov.");
    expect(chartRange([])).toBeNull();
  });

  it("labels the first week, the selected week and every fifth week", () => {
    expect([...chartTicks(12, 1)].sort((a, b) => a - b)).toEqual([0, 1, 4, 9]);
  });
});
