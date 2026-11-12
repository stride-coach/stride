import { z } from "zod";

export const fuelingTolerances = [
  "good",
  "discomfort",
  "not_tolerated",
] as const;
export type FuelingTolerance = (typeof fuelingTolerances)[number];

export const fuelingTestColumns =
  "id, tested_on, activity_id, carbs_per_hour_g, duration_seconds, tolerance, note";

const rowSchema = z.object({
  id: z.string(),
  tested_on: z.string(),
  activity_id: z.string().nullable(),
  carbs_per_hour_g: z.number().int(),
  duration_seconds: z.number().int(),
  tolerance: z.enum(fuelingTolerances),
  note: z.string().nullable(),
});

export type FuelingTest = {
  id: string;
  testedOn: string;
  activityId: string | null;
  carbsPerHourG: number;
  durationSeconds: number;
  tolerance: FuelingTolerance;
  note: string | null;
};

export type LongRun = {
  id: string;
  day: string;
  name: string | null;
  durationSeconds: number;
  distanceM: number | null;
};

export const fuelingTestInputSchema = z.strictObject({
  testedOn: z.iso.date(),
  activityId: z.uuid().nullable(),
  carbsPerHourG: z.number().int().min(10).max(150),
  durationSeconds: z.number().int().min(1800).max(172_800),
  tolerance: z.enum(fuelingTolerances),
  note: z.string().trim().min(1).max(200).nullable(),
});

export function fuelingTests(rows: unknown[]): FuelingTest[] {
  return rows
    .flatMap((row) => {
      const parsed = rowSchema.safeParse(row);
      return parsed.success
        ? [
            {
              id: parsed.data.id,
              testedOn: parsed.data.tested_on,
              activityId: parsed.data.activity_id,
              carbsPerHourG: parsed.data.carbs_per_hour_g,
              durationSeconds: parsed.data.duration_seconds,
              tolerance: parsed.data.tolerance,
              note: parsed.data.note,
            },
          ]
        : [];
    })
    .sort((a, b) => b.testedOn.localeCompare(a.testedOn));
}

export function validatedCarbsPerHour(tests: FuelingTest[]) {
  const tolerated = tests.filter((test) => test.tolerance !== "not_tolerated");
  return tolerated.length
    ? Math.max(...tolerated.map((test) => test.carbsPerHourG))
    : null;
}

export function cappedCarbsPerHour(target: number, cap: number | null) {
  return cap !== null && target > cap ? cap : target;
}

export function withFuelingCap<T extends { carbsPerHourG: number }>(
  plan: T,
  cap: number | null,
): T {
  const carbsPerHourG = cappedCarbsPerHour(plan.carbsPerHourG, cap);
  return carbsPerHourG === plan.carbsPerHourG
    ? plan
    : { ...plan, carbsPerHourG };
}

export const toleranceLabels: Record<FuelingTolerance, string> = {
  good: "Validé",
  discomfort: "Validé avec gêne",
  not_tolerated: "Pas toléré",
};

export function fuelingCapMessage(target: number, cap: number | null) {
  if (cap === null)
    return `Aucun apport n’est encore validé à l’entraînement. Note tes tests de sortie longue : le plan ne dépassera pas ce que tu as toléré.`;
  if (target > cap)
    return `Ta cible de ${target} g/h est plafonnée à ${cap} g/h, le plus haut apport validé à l’entraînement. Teste ${target} g/h sur une sortie longue pour lever le plafond.`;
  return `Ta cible de ${target} g/h est couverte par un test validé à ${cap} g/h.`;
}
