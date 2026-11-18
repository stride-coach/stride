import { describe, expect, it } from "vitest";
import {
  recoveryAlert,
  recoveryLine,
  recoveryOutcome,
  recoverySummary,
  sessionConformity,
  type WellnessDay,
} from "../../src/features/coach/decision-outcomes";

function days(
  from: string,
  values: { hrv?: number | null; restingHeartRate?: number | null }[],
): WellnessDay[] {
  return values.map((value, index) => ({
    day: new Date(Date.parse(`${from}T00:00:00Z`) + index * 86_400_000)
      .toISOString()
      .slice(0, 10),
    hrv: value.hrv ?? null,
    restingHeartRate: value.restingHeartRate ?? null,
  }));
}

const baseline = Array.from({ length: 28 }, (_, index) => ({
  hrv: index % 2 === 0 ? 58 : 62,
  restingHeartRate: index % 2 === 0 ? 48 : 52,
}));

describe("recovery alert", () => {
  it("flags an HRV below the range of the 28 days before", () => {
    const series = days("2026-09-01", [...baseline, { hrv: 47 }]);
    expect(recoveryAlert(series, "2026-09-29")).toEqual({
      metric: "hrv",
      range: { low: 58, high: 62 },
    });
  });

  it("flags a resting heart rate above its range", () => {
    const series = days("2026-09-01", [
      ...baseline,
      { hrv: 60, restingHeartRate: 58 },
    ]);
    expect(recoveryAlert(series, "2026-09-29")?.metric).toBe(
      "restingHeartRate",
    );
  });

  it("stays silent inside the range, without a reading or with a short baseline", () => {
    expect(
      recoveryAlert(
        days("2026-09-01", [...baseline, { hrv: 60, restingHeartRate: 50 }]),
        "2026-09-29",
      ),
    ).toBeNull();
    expect(
      recoveryAlert(days("2026-09-01", baseline), "2026-09-29"),
    ).toBeNull();
    expect(
      recoveryAlert(
        days("2026-09-01", [...baseline.slice(0, 5), { hrv: 40 }]),
        "2026-09-06",
      ),
    ).toBeNull();
  });
});

describe("recovery outcome", () => {
  const alerted = [...baseline, { hrv: 47 }];

  it("counts the days until the metric is back in the same range", () => {
    const series = days("2026-09-01", [...alerted, { hrv: 50 }, { hrv: 59 }]);
    expect(recoveryOutcome(series, "2026-09-29", "2026-10-10")).toEqual({
      metric: "hrv",
      state: "back",
      days: 2,
    });
  });

  it("reports a metric still out of range once the horizon has passed", () => {
    const series = days("2026-09-01", [
      ...alerted,
      ...Array.from({ length: 14 }, () => ({ hrv: 45 })),
    ]);
    expect(recoveryOutcome(series, "2026-09-29", "2026-10-20")).toEqual({
      metric: "hrv",
      state: "away",
    });
  });

  it("says nothing while the horizon is still open or without an alert", () => {
    const series = days("2026-09-01", [...alerted, { hrv: 45 }]);
    expect(recoveryOutcome(series, "2026-09-29", "2026-10-02")).toBeNull();
    expect(
      recoveryOutcome(days("2026-09-01", baseline), "2026-09-28", "2026-10-20"),
    ).toBeNull();
  });
});

describe("recovery line", () => {
  it("words the next day and later days", () => {
    expect(recoveryLine({ metric: "hrv", state: "back", days: 1 })).toBe(
      "VFC revenue dans ta plage le lendemain",
    );
    expect(
      recoveryLine({ metric: "restingHeartRate", state: "back", days: 3 }),
    ).toBe("FC repos revenue dans ta plage après 3 jours");
    expect(recoveryLine({ metric: "hrv", state: "away" })).toBe(
      "VFC toujours hors de ta plage après 14 jours",
    );
  });
});

describe("recovery summary", () => {
  it("averages the days back per response and warns on few cases", () => {
    expect(
      recoverySummary([
        { response: "accepted", days: 1 },
        { response: "accepted", days: 1 },
        { response: "accepted", days: 2 },
        { response: "rejected", days: 3 },
      ]),
    ).toEqual({
      groups: [
        { kind: "accepted", label: "Suivie", cases: 3, days: "1,3 jour" },
        { kind: "rejected", label: "Refusée", cases: 1, days: "3 jours" },
      ],
      caution:
        "Quatre cas seulement : une tendance à surveiller, pas une preuve.",
    });
  });

  it("is empty without a single case and drops the caution from ten cases", () => {
    expect(recoverySummary([])).toBeNull();
    const many = Array.from({ length: 10 }, () => ({
      response: "accepted" as const,
      days: 2,
    }));
    expect(recoverySummary(many)?.caution).toBeNull();
  });
});

describe("session conformity", () => {
  const match = (
    status: string,
    compliance: {
      duration: number | null;
      distance: number | null;
      intensity: number | null;
    },
  ) => ({ sessionKey: "s-2026-10-04-1", status, compliance });

  it("averages how close duration and distance are to the target", () => {
    expect(
      sessionConformity(
        [
          match("completed", {
            duration: 0.96,
            distance: 0.92,
            intensity: 1.4,
          }),
        ],
        "s-2026-10-04-1",
      ),
    ).toBe(94);
  });

  it("treats going over the target like falling short of it", () => {
    expect(
      sessionConformity(
        [
          match("completed", {
            duration: 1.1,
            distance: null,
            intensity: null,
          }),
        ],
        "s-2026-10-04-1",
      ),
    ).toBe(90);
  });

  it("ignores sessions that were skipped, substituted or have no ratio", () => {
    const ratios = { duration: 1, distance: 1, intensity: 1 };
    expect(
      sessionConformity([match("dismissed", ratios)], "s-2026-10-04-1"),
    ).toBeNull();
    expect(
      sessionConformity([match("substituted", ratios)], "s-2026-10-04-1"),
    ).toBeNull();
    expect(
      sessionConformity(
        [
          match("completed", {
            duration: null,
            distance: null,
            intensity: 1,
          }),
        ],
        "s-2026-10-04-1",
      ),
    ).toBeNull();
    expect(sessionConformity([], "s-2026-10-04-1")).toBeNull();
  });
});
