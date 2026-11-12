import { describe, expect, it } from "vitest";
import {
  cappedCarbsPerHour,
  fuelingCapMessage,
  fuelingTests,
  validatedCarbsPerHour,
  withFuelingCap,
} from "@/features/fueling/tests";

const row = (
  id: string,
  tested_on: string,
  carbs_per_hour_g: number,
  tolerance: string,
) => ({
  id,
  tested_on,
  activity_id: null,
  carbs_per_hour_g,
  duration_seconds: 7200,
  tolerance,
  note: null,
});

describe("fueling tests", () => {
  const tests = fuelingTests([
    row("a", "2026-10-04", 50, "good"),
    row("b", "2026-10-11", 60, "discomfort"),
    row("c", "2026-10-18", 75, "not_tolerated"),
    row("d", "2026-10-19", 70, "excellent"),
  ]);

  it("reads the stored tests, newest first", () => {
    expect(tests.map((test) => test.id)).toEqual(["c", "b", "a"]);
  });

  it("validates the highest intake that was tolerated", () => {
    expect(validatedCarbsPerHour(tests)).toBe(60);
    expect(validatedCarbsPerHour([])).toBeNull();
    expect(
      validatedCarbsPerHour(tests.filter((test) => test.id === "c")),
    ).toBeNull();
  });

  it("caps the race target at the validated intake only", () => {
    expect(cappedCarbsPerHour(70, 60)).toBe(60);
    expect(cappedCarbsPerHour(55, 60)).toBe(55);
    expect(cappedCarbsPerHour(70, null)).toBe(70);
    const plan = { carbsPerHourG: 70, waterMlPerHour: 500 };
    expect(withFuelingCap(plan, 60)).toEqual({
      carbsPerHourG: 60,
      waterMlPerHour: 500,
    });
    expect(withFuelingCap(plan, null)).toBe(plan);
  });

  it("says why the plan is capped or how to lift it", () => {
    expect(fuelingCapMessage(70, 60)).toBe(
      "Ta cible de 70 g/h est plafonnée à 60 g/h, le plus haut apport validé à l’entraînement. Teste 70 g/h sur une sortie longue pour lever le plafond.",
    );
    expect(fuelingCapMessage(55, 60)).toBe(
      "Ta cible de 55 g/h est couverte par un test validé à 60 g/h.",
    );
    expect(fuelingCapMessage(70, null)).toMatch(
      /^Aucun apport n’est encore validé/,
    );
  });
});
