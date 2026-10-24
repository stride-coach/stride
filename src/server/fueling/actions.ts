"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { catalogueProduct } from "@/features/fueling/catalogue";
import { productInputSchema } from "@/features/fueling/products";
import { getOnboardingContext } from "@/server/onboarding/context";

export type ProductActionResult =
  | { status: "saved"; id: string }
  | {
      status: "invalid" | "conflict" | "error" | "session-expired" | "missing";
    };

const idSchema = z.uuid();

function refresh() {
  revalidatePath("/races", "layout");
}

export async function addCatalogueProduct(
  key: unknown,
): Promise<ProductActionResult> {
  const item = typeof key === "string" ? catalogueProduct(key) : null;
  if (!item) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const values = {
    name: item.name,
    brand: item.brand,
    kind: item.kind,
    carbs_g: item.carbsG,
    sodium_mg: item.sodiumMg,
    caffeine_mg: item.caffeineMg,
    serving_label: item.servingLabel,
    serving_ml: item.servingMl,
  };
  try {
    const inserted = await context.client
      .from("athlete_nutrition_products")
      .insert({
        user_id: context.userId,
        catalogue_key: item.key,
        ...values,
      })
      .select("id")
      .maybeSingle();
    if (inserted.error?.code === "23505") {
      const restored = await context.client
        .from("athlete_nutrition_products")
        .update({ archived_at: null })
        .eq("user_id", context.userId)
        .eq("catalogue_key", item.key)
        .select("id")
        .maybeSingle();
      if (restored.error || !restored.data) return { status: "error" };
      refresh();
      return { status: "saved", id: restored.data.id };
    }
    if (inserted.error || !inserted.data) return { status: "error" };
    refresh();
    return { status: "saved", id: inserted.data.id };
  } catch {
    return { status: "error" };
  }
}

function rowOf(input: z.output<typeof productInputSchema>) {
  return {
    name: input.name,
    brand: input.brand,
    kind: input.kind,
    carbs_g: input.carbsG,
    sodium_mg: input.sodiumMg,
    caffeine_mg: input.caffeineMg,
    serving_label: input.servingLabel,
    serving_ml: input.servingMl,
    tested: input.tested,
    tested_note: input.testedNote,
  };
}

export async function saveProduct(
  productId: string | null,
  revision: number | null,
  input: unknown,
): Promise<ProductActionResult> {
  const parsed = productInputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  if (productId !== null && !idSchema.safeParse(productId).success)
    return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const row = rowOf(parsed.data);
  try {
    const response =
      productId === null
        ? await context.client
            .from("athlete_nutrition_products")
            .insert({ user_id: context.userId, ...row })
            .select("id")
            .maybeSingle()
        : await context.client
            .from("athlete_nutrition_products")
            .update(row)
            .eq("user_id", context.userId)
            .eq("id", productId)
            .eq("revision", revision ?? 0)
            .select("id")
            .maybeSingle();
    if (response.error) return { status: "error" };
    if (!response.data) return { status: "conflict" };
    refresh();
    return { status: "saved", id: response.data.id };
  } catch {
    return { status: "error" };
  }
}

export async function archiveProduct(
  productId: string,
  revision: number,
): Promise<ProductActionResult> {
  if (!idSchema.safeParse(productId).success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  try {
    const response = await context.client
      .from("athlete_nutrition_products")
      .update({ archived_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("id", productId)
      .eq("revision", revision)
      .select("id")
      .maybeSingle();
    if (response.error) return { status: "error" };
    if (!response.data) return { status: "conflict" };
    refresh();
    return { status: "saved", id: response.data.id };
  } catch {
    return { status: "error" };
  }
}
