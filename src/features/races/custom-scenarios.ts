import { z } from "zod";
import type { CustomScenario } from "./workspace";

export const customScenarioColumns =
  "id, name, target_seconds, walk_grade_percent, aid_stop_seconds, carbs_per_hour_g, position";

export const customScenarioRowSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    target_seconds: z.number().int().positive(),
    walk_grade_percent: z.number().int().nullable(),
    aid_stop_seconds: z.number().int().nullable(),
    carbs_per_hour_g: z.number().int().nullable(),
    position: z.number().int(),
  })
  .transform((row): CustomScenario => ({
    id: row.id,
    name: row.name,
    targetSeconds: row.target_seconds,
    walkGradePercent: row.walk_grade_percent,
    aidStopSeconds: row.aid_stop_seconds,
    carbsPerHourG: row.carbs_per_hour_g,
    position: row.position,
  }));

export const customScenarioInputSchema = z.object({
  raceId: z.uuid(),
  name: z.string().trim().min(1).max(40),
  targetSeconds: z.number().int().min(60).max(1_209_599),
  walkGradePercent: z.number().int().min(5).max(20).nullable(),
  aidStopSeconds: z.number().int().min(0).max(3600).nullable(),
  carbsPerHourG: z.number().int().min(20).max(120).nullable(),
});

export type CustomScenarioInput = z.infer<typeof customScenarioInputSchema>;

export const maximumCustomScenarios = 3;

export function planBLabel(
  planB: string | null,
  scenarios: readonly { key: string; label: string }[],
) {
  if (!planB) return null;
  return scenarios.find((scenario) => scenario.key === planB)?.label ?? null;
}
