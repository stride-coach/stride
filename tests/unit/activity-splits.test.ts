import { describe, expect, it } from "vitest";
import { climb, kmSplits } from "../../src/features/activities/splits";
import type {
  ActivityTrack,
  Series,
} from "../../src/features/activities/track";

function track(series: Series): ActivityTrack {
  return {
    route: null,
    bounds: null,
    series,
    length: series.distance_m?.length ?? 0,
    histogram: [],
  };
}

describe("km splits", () => {
  it("interpolates each km boundary and keeps the final partial km", () => {
    const splits = kmSplits(
      track({
        distance_m: [0, 600, 1400, 2000, 2300],
        elapsed_s: [0, 180, 420, 600, 720],
        heart_rate: [120, 130, 150, 160, 140],
      }),
    );
    expect(splits?.rows.map((row) => [row.label, row.pace])).toEqual([
      ["1", "5:00"],
      ["2", "5:00"],
      ["0,3", "6:40"],
    ]);
    expect(splits?.average.pace).toBe("5:13");
    expect(splits?.rows[0].heartRate).toBe("125");
    expect(splits?.columns).toEqual(["heartRate"]);
  });

  it("marks km faster than the average and scales the bar to the fastest", () => {
    const splits = kmSplits(
      track({
        distance_m: [0, 1000, 2000, 3000],
        elapsed_s: [0, 360, 620, 980],
      }),
    );
    expect(splits?.rows.map((row) => row.bar)).toEqual([
      { width: 35, fast: false },
      { width: 100, fast: true },
      { width: 35, fast: false },
    ]);
  });

  it("hides columns whose series is missing and drops a tiny tail", () => {
    const splits = kmSplits(
      track({
        distance_m: [0, 1000, 1020],
        elapsed_s: [0, 300, 306],
      }),
    );
    expect(splits?.rows.map((row) => row.label)).toEqual(["1"]);
    expect(splits?.columns).toEqual([]);
    expect(splits?.average.gain).toBeNull();
    expect(kmSplits(track({ elapsed_s: [0, 10] }))).toBeNull();
  });

  it("sums climbing per km and ignores sub-metre noise", () => {
    expect(climb([100, 100.4, 100.8, 102, 101.6, 99])).toEqual({
      gain: 2,
      loss: 3,
    });
    const splits = kmSplits(
      track({
        distance_m: [0, 500, 1000, 1500, 2000],
        elapsed_s: [0, 150, 300, 450, 600],
        elevation_m: [10, 16, 12, 12.3, 20],
      }),
    );
    expect(splits?.rows.map((row) => [row.gain, row.loss])).toEqual([
      ["6", "4"],
      ["8", "—"],
    ]);
    expect([splits?.average.gain, splits?.average.loss]).toEqual(["14", "4"]);
  });
});
