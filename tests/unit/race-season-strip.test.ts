import { describe, expect, it } from "vitest";
import { weekTicks } from "@/features/races/season-strip";

describe("programme week ticks", () => {
  it("labels the first, every fifth, the current and the last week", () => {
    expect(weekTicks(25, 1)).toEqual([0, 1, 4, 9, 14, 19, 24]);
    expect(weekTicks(25, 12)).toEqual([0, 4, 9, 12, 14, 19, 24]);
  });

  it("drops a fifth week that would touch the current one", () => {
    expect(weekTicks(25, 5)).toEqual([0, 5, 9, 14, 19, 24]);
  });

  it("handles short and empty programmes", () => {
    expect(weekTicks(3, -1)).toEqual([0, 2]);
    expect(weekTicks(0, -1)).toEqual([]);
  });
});
