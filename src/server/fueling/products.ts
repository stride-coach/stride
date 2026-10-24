import "server-only";
import { cache } from "react";
import {
  productColumns,
  productRowSchema,
  type NutritionProduct,
} from "@/features/fueling/products";
import type { OnboardingContext } from "@/server/onboarding/context";

export const readNutritionLibrary = cache(
  async (
    context: OnboardingContext,
  ): Promise<{ active: NutritionProduct[]; archived: NutritionProduct[] }> => {
    const { data, error } = await context.client
      .from("athlete_nutrition_products")
      .select(productColumns)
      .eq("user_id", context.userId)
      .order("created_at", { ascending: true });
    if (error) throw new Error("Unable to read the nutrition products");
    const rows = (data ?? []).map((row) => productRowSchema.parse(row));
    return {
      active: rows.filter((row) => !row.archived).map((row) => row.product),
      archived: rows.filter((row) => row.archived).map((row) => row.product),
    };
  },
);

export async function readNutritionProducts(context: OnboardingContext) {
  return (await readNutritionLibrary(context)).active;
}
