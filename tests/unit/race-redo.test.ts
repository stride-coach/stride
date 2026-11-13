import { describe, expect, it } from "vitest";
import {
  editionName,
  redoInputSchema,
  redoTarget,
} from "@/features/races/redo";

describe("redoing a race", () => {
  it("names the next edition with its year", () => {
    expect(editionName("EcoTrail Paris 2026", "2027")).toBe(
      "EcoTrail Paris 2027",
    );
    expect(editionName("EcoTrail Paris 120K", "2027")).toBe(
      "EcoTrail Paris 120K",
    );
  });

  it("proposes the time run, rounded to five minutes", () => {
    expect(
      redoTarget({
        year: "2026",
        resultSeconds: 22_320,
        targetSeconds: 21_600,
      }),
    ).toEqual({
      seconds: 22_200,
      reason: "Ton temps de 2026 (6h12), arrondi à 5 minutes.",
    });
  });

  it("keeps the target without a result", () => {
    expect(
      redoTarget({ year: "2026", resultSeconds: null, targetSeconds: 21_600 }),
    ).toEqual({ seconds: 21_600, reason: "Ton objectif de 2026." });
    expect(
      redoTarget({ year: "2026", resultSeconds: null, targetSeconds: null }),
    ).toBeNull();
  });

  it("validates what is carried over", () => {
    const input = {
      sourceId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      date: "2027-03-20",
      priority: "A",
      targetSeconds: 22_200,
      course: true,
      nutrition: false,
      gear: true,
    };
    expect(redoInputSchema.safeParse(input).success).toBe(true);
    expect(
      redoInputSchema.safeParse({ ...input, date: "20/03/2027" }).success,
    ).toBe(false);
    expect(redoInputSchema.safeParse({ ...input, priority: "D" }).success).toBe(
      false,
    );
  });
});
