import { describe, expect, it } from "vitest";
import { dayIntensity } from "../../src/features/plans/view/intensity";
import { shortDayLabel } from "../../src/features/today/today";

describe("today week rows", () => {
  it("labels a day by its hardest kept block", () => {
    expect(
      dayIntensity("threshold", [
        { minutes: 15, zone: 2 },
        { minutes: 6, zone: 4 },
        { minutes: 6, zone: 5, removed: true },
      ]),
    ).toEqual({ level: 4, label: "Seuil" });
    expect(dayIntensity("easy", [{ minutes: 50, zone: 2 }])).toEqual({
      level: 2,
      label: "Facile",
    });
  });

  it("names long runs and sessions without an intensity scale", () => {
    expect(dayIntensity("long_trail", [{ minutes: 140, zone: 2 }])).toEqual({
      level: 2,
      label: "Long",
    });
    expect(dayIntensity("strength", [])).toEqual({
      level: null,
      label: "Renfo",
    });
    expect(dayIntensity("fartlek", [])).toEqual({
      level: null,
      label: "Fartlek",
    });
    expect(dayIntensity("rest", [])).toBeNull();
  });

  it("writes a short French day label", () => {
    expect(shortDayLabel("2026-11-10")).toBe("Mar 10");
    expect(shortDayLabel("2026-11-15")).toBe("Dim 15");
  });
});
