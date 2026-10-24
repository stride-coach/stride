import { describe, expect, it } from "vitest";
import {
  activityTotals,
  mainActivity,
  mergeLaps,
  startTimesLabel,
} from "@/features/plans/view/session-activities";

const activity = (
  id: string,
  startedAt: string,
  durationSeconds: number | null,
  distanceMeters: number | null = null,
  averageHeartRate: number | null = null,
) => ({ id, startedAt, durationSeconds, distanceMeters, averageHeartRate });

describe("session activities", () => {
  it("weights heart rate by duration and sums known measures", () => {
    expect(
      activityTotals([
        activity("a", "2026-10-24T14:44:43Z", 1800, 5080, 146),
        activity("b", "2026-10-24T15:21:13Z", 176, 687, 159),
        activity("c", "2026-10-24T16:00:00Z", 60, null, null),
      ]),
    ).toEqual({
      durationSeconds: 2036,
      distanceMeters: 5767,
      averageHeartRate: (1800 * 146 + 176 * 159) / 1976,
    });
    expect(
      activityTotals([activity("a", "2026-10-24T14:00:00Z", null)]),
    ).toEqual({
      durationSeconds: null,
      distanceMeters: null,
      averageHeartRate: null,
    });
  });

  it("picks the longest activity, the earliest on a tie", () => {
    expect(
      mainActivity([
        activity("late", "2026-10-24T16:00:00Z", 600),
        activity("early", "2026-10-24T15:00:00Z", 600),
        activity("short", "2026-10-24T14:00:00Z", 120),
      ])?.id,
    ).toBe("early");
    expect(mainActivity([])).toBeNull();
  });

  it("chains laps of successive activities without index collisions", () => {
    expect(
      mergeLaps([[{ index: 0 }, { index: 1 }], [], [{ index: 0 }]]).map(
        (lap) => lap.index,
      ),
    ).toEqual([0, 1, 2]);
  });

  it("lists start times in French", () => {
    expect(startTimesLabel(["16:44", "17:21"])).toBe("16:44 et 17:21");
    expect(startTimesLabel(["8:00", "9:00", "10:00"])).toBe(
      "8:00, 9:00 et 10:00",
    );
    expect(startTimesLabel(["16:44", null])).toBeNull();
  });
});
