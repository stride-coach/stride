import { describe, expect, it } from "vitest";
import {
  daysUntil,
  formatKm,
  formatRaceLongDate,
  formatTarget,
} from "@/features/races/goal-format";

describe("race goal formatting", () => {
  it("formats distance, date, target and countdown", () => {
    expect(formatKm(21.1)).toBe("21,1 km");
    expect(formatKm(null)).toBe("—");
    expect(formatRaceLongDate("2027-03-20")).toBe("sam. 20 mars 2027");
    expect(formatRaceLongDate(null)).toBe("Date à définir");
    expect(formatTarget(66600)).toBe("18:30");
    expect(daysUntil("2027-03-20", "2026-10-07")).toBe(164);
  });
});
