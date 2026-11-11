import { describe, expect, it } from "vitest";
import {
  reliefBusySpeed,
  reliefContours,
  reliefRestSpeed,
  reliefSpeed,
} from "../../src/components/stride/relief-contours";

const firstPoint = (points: string) =>
  points.split(" ")[0].split(",").map(Number);

describe("relief contours", () => {
  const contours = reliefContours({
    cx: 1040,
    cy: -45.6,
    count: 8,
    step: 2000 / 39,
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

  it("reproduces the board geometry at rest", () => {
    expect(firstPoint(contours[0].points)).toEqual([1092.6, -45.6]);
    expect(contours[0].points.split(" ")).toHaveLength(96);
  });

  it("is deterministic and grows outwards", () => {
    const again = reliefContours({
      cx: 1040,
      cy: -45.6,
      count: 8,
      step: 2000 / 39,
    });
    expect(again).toEqual(contours);
    expect(firstPoint(contours[7].points)[0]).toBeGreaterThan(
      firstPoint(contours[0].points)[0],
    );
  });
});

describe("relief speed", () => {
  it("eases towards the busy speed and back to rest without jumping", () => {
    let speed = reliefRestSpeed;
    const first = reliefSpeed(speed, true, 1 / 30);
    expect(first).toBeGreaterThan(reliefRestSpeed);
    expect(first).toBeLessThan(reliefRestSpeed + 0.05);
    for (let frame = 0; frame < 300; frame++)
      speed = reliefSpeed(speed, true, 1 / 30);
    expect(speed).toBeCloseTo(reliefBusySpeed, 3);
    for (let frame = 0; frame < 300; frame++)
      speed = reliefSpeed(speed, false, 1 / 30);
    expect(speed).toBeCloseTo(reliefRestSpeed, 3);
  });
});
