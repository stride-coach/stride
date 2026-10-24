import { z } from "zod";

export const nutritionRoles = [
  "gel",
  "drink",
  "solid",
  "compote",
  "caffeine",
] as const;
export type NutritionRole = (typeof nutritionRoles)[number];

export const servingSchema = z.strictObject({
  productId: z.uuid(),
  count: z.number().int().min(1).max(40),
});
export type Serving = z.infer<typeof servingSchema>;

export const raceNutritionPlanSchema = z.strictObject({
  products: z
    .strictObject({
      gel: z.uuid().nullable(),
      drink: z.uuid().nullable(),
      solid: z.uuid().nullable(),
      compote: z.uuid().nullable(),
      caffeine: z.uuid().nullable(),
    })
    .partial()
    .default({}),
  start: z
    .strictObject({
      flasks: z
        .array(z.enum(["drink", "water"]))
        .max(6)
        .optional(),
      pocket: z.array(servingSchema).max(12).optional(),
    })
    .optional(),
  segments: z
    .record(
      z.uuid(),
      z.strictObject({
        items: z.array(servingSchema).max(12),
        note: z.string().trim().min(1).max(240).optional(),
      }),
    )
    .default({}),
  dropBag: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
});
export type RaceNutritionPlan = z.infer<typeof raceNutritionPlanSchema>;

export const emptyNutritionPlan: RaceNutritionPlan = {
  products: {},
  segments: {},
};

export const nutritionTargetsSchema = z
  .strictObject({
    carbsPerHourG: z.number().int().min(20).max(120),
    waterMlPerHour: z.number().int().min(100).max(1500),
    sodiumMgPerHour: z.number().int().min(0).max(2000),
    caffeineMaxMg: z.number().int().min(0).max(600),
    nightCaffeine: z.boolean(),
    flaskMl: z.number().int().min(100).max(1500),
    flaskCount: z.number().int().min(0).max(6),
    bladderMl: z.number().int().min(250).max(3000).nullable(),
  })
  .partial();
export type NutritionTargets = z.infer<typeof nutritionTargetsSchema>;
