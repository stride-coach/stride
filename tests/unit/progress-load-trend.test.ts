import { describe, expect, it } from "vitest";
import { loadTrend } from "@/features/progress/load-trend";

const today = "2026-11-19";

function series(acute: (week: number) => number, weeks = 12) {
  return Array.from({ length: weeks }, (_, index) => {
    const date = new Date(`${today}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 7 * (weeks - 1 - index));
    return {
      day: date.toISOString().slice(0, 10),
      acute: acute(index),
      chronic: 100,
    };
  });
}

describe("load trend", () => {
  it("needs a signal and enough weekly samples", () => {
    expect(
      loadTrend(
        series(() => 100),
        null,
        today,
      ),
    ).toBeNull();
    expect(
      loadTrend(
        series(() => 100, 3),
        { ratio: 1, average: 1 },
        today,
      ),
    ).toBeNull();
  });

  it("stays within the range when no week exceeds it", () => {
    const load = loadTrend(
      series(() => 100),
      { ratio: 1, average: 1 },
      today,
    );
    expect(load).toMatchObject({
      label: "Dans ta plage",
      level: "ok",
      description: "Charge sur 12 semaines, dans la zone prévue.",
      peak: null,
    });
  });

  it("marks the highest week above the range", () => {
    const load = loadTrend(
      series((week) => (week === 5 ? 180 : 100)),
      { ratio: 1.7, average: 1 },
      today,
    );
    expect(load).toMatchObject({
      label: "Au-dessus de ta plage",
      level: "watch",
      description:
        "Charge sur 12 semaines, 1 semaine au-dessus de la zone prévue.",
    });
    expect(load?.peak).not.toBeNull();
  });
});
