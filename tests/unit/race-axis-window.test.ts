import { describe, expect, it } from "vitest";
import {
  centerWindow,
  fullWindow,
  isFullWindow,
  panWindow,
  resizeWindow,
  showsOverview,
  windowLabel,
  windowRatio,
  zoomWindow,
} from "@/features/races/axis-window";

const total = 120_000;

describe("race axis window", () => {
  it("zooms around the cursor and keeps the point under it", () => {
    const zoomed = zoomWindow(fullWindow(total), total, 60_000, 2);
    expect(zoomed).toEqual({ fromM: 30_000, toM: 90_000 });
    const again = zoomWindow(zoomed, total, 45_000, 2);
    expect(windowRatio(again, 45_000)).toBeCloseTo(windowRatio(zoomed, 45_000));
  });

  it("never goes below 5 km nor outside the course", () => {
    const start = zoomWindow(fullWindow(total), total, 1_000, 1000);
    expect(start.toM - start.fromM).toBe(5_000);
    expect(windowRatio(start, 1_000)).toBeCloseTo(1_000 / total);
    const end = zoomWindow(fullWindow(total), total, 119_000, 1000);
    expect(windowRatio(end, 119_000)).toBeCloseTo(119_000 / total);
    expect(end.toM).toBeLessThanOrEqual(total);
    expect(
      zoomWindow({ fromM: 110_000, toM: 120_000 }, total, 120_000, 4),
    ).toEqual({ fromM: 115_000, toM: 120_000 });
    expect(zoomWindow({ fromM: 0, toM: 5_000 }, total, 2_000, 0.001)).toEqual(
      fullWindow(total),
    );
    expect(zoomWindow(fullWindow(3_000), 3_000, 1_000, 4)).toEqual(
      fullWindow(3_000),
    );
  });

  it("pans, centres and resizes within the course", () => {
    const window = { fromM: 60_000, toM: 100_000 };
    expect(panWindow(window, total, 50_000)).toEqual({
      fromM: 80_000,
      toM: 120_000,
    });
    expect(centerWindow(window, total, 10_000)).toEqual({
      fromM: 0,
      toM: 40_000,
    });
    expect(resizeWindow(window, total, "from", 98_000)).toEqual({
      fromM: 95_000,
      toM: 100_000,
    });
    expect(resizeWindow(window, total, "to", 200_000)).toEqual({
      fromM: 60_000,
      toM: 120_000,
    });
  });

  it("shows the overview on long or zoomed courses", () => {
    expect(isFullWindow(fullWindow(total), total)).toBe(true);
    expect(showsOverview(fullWindow(total), total)).toBe(true);
    expect(showsOverview(fullWindow(30_000), 30_000)).toBe(false);
    expect(showsOverview({ fromM: 0, toM: 10_000 }, 30_000)).toBe(true);
    expect(windowLabel({ fromM: 60_000, toM: 100_000 })).toBe("km 60 à 100");
  });
});
