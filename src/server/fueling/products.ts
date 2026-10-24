import "server-only";
import { cache } from "react";
import {
  productColumns,
  productRowSchema,
  type NutritionProduct,
} from "@/features/fueling/products";
import type { OnboardingContext } from "@/server/onboarding/context";

export const readNutritionProducts = cache(
  async (context: OnboardingContext): Promise<NutritionProduct[]> => {
    const { data, error } = await context.client
      .from("athlete_nutrition_products")
      .select(productColumns)
      .eq("user_id", context.userId)
      .is("archived_at", null)
      .order("created_at", { ascending: true });
    if (error) throw new Error("Unable to read the nutrition products");
    return (data ?? [])
      .map((row) => productRowSchema.parse(row))
      .filter((row) => !row.archived)
      .map((row) => row.product);
  },
);
