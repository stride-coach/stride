import { describe, expect, it } from "vitest";
import { reliefContours } from "../../src/components/stride/relief-contours";

describe("relief contours", () => {
  const contours = reliefContours({
    cx: 100,
    cy: 100,
    count: 8,
    base: 20,
    step: 10,
    phase: 1,
  });

  it("draws one closed outline per ring and marks every fourth one", () => {
    expect(contours).toHaveLength(8);
    expect(contours.map((contour) => contour.strong)).toEqual([
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
    ]);
  });

  it("is deterministic and grows outwards", () => {
    const again = reliefContours({
      cx: 100,
      cy: 100,
      count: 8,
      base: 20,
      step: 10,
      phase: 1,
    });
    expect(again).toEqual(contours);
    const firstX = (index: number) =>
      Number(contours[index].points.split(" ")[0].split(",")[0]);
    expect(firstX(7)).toBeGreaterThan(firstX(0));
  });
});
