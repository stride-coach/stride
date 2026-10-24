import { z } from "zod";

export const productKinds = [
  "gel",
  "drink",
  "compote",
  "solid",
  "other",
] as const;
export type ProductKind = (typeof productKinds)[number];

export const productKindLabels: Record<ProductKind, string> = {
  gel: "Gel",
  drink: "Boisson iso",
  compote: "Compote",
  solid: "Solide",
  other: "Autre",
};

export const productKindShortLabels: Record<ProductKind, string> = {
  gel: "Gel",
  drink: "Iso",
  compote: "Compote",
  solid: "Solide",
  other: "Autre",
};

export type NutritionProduct = {
  id: string;
  catalogueKey: string | null;
  name: string;
  brand: string | null;
  kind: ProductKind;
  carbsG: number;
  sodiumMg: number;
  caffeineMg: number;
  servingLabel: string | null;
  servingMl: number | null;
  tested: boolean;
  testedNote: string | null;
  revision: number;
};

export const productColumns =
  "id, catalogue_key, name, brand, kind, carbs_g, sodium_mg, caffeine_mg, serving_label, serving_ml, tested, tested_note, archived_at, revision";

export const productRowSchema = z
  .object({
    id: z.uuid(),
    catalogue_key: z.string().nullable(),
    name: z.string(),
    brand: z.string().nullable(),
    kind: z.enum(productKinds),
    carbs_g: z.number().int(),
    sodium_mg: z.number().int(),
    caffeine_mg: z.number().int(),
    serving_label: z.string().nullable(),
    serving_ml: z.number().int().nullable(),
    tested: z.boolean(),
    tested_note: z.string().nullable(),
    archived_at: z.string().nullable(),
    revision: z.number().int().positive(),
  })
  .transform((row) => ({
    archived: row.archived_at !== null,
    product: {
      id: row.id,
      catalogueKey: row.catalogue_key,
      name: row.name,
      brand: row.brand,
      kind: row.kind,
      carbsG: row.carbs_g,
      sodiumMg: row.sodium_mg,
      caffeineMg: row.caffeine_mg,
      servingLabel: row.serving_label,
      servingMl: row.serving_ml,
      tested: row.tested,
      testedNote: row.tested_note,
      revision: row.revision,
    } satisfies NutritionProduct,
  }));

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

export const productInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(80),
  brand: optionalText(60),
  kind: z.enum(productKinds),
  carbsG: z.number().int().min(0).max(200),
  sodiumMg: z.number().int().min(0).max(3000),
  caffeineMg: z.number().int().min(0).max(400),
  servingLabel: optionalText(60),
  servingMl: z.number().int().min(1).max(2000).nullable(),
  tested: z.boolean(),
  testedNote: optionalText(240),
});
export type ProductInput = z.input<typeof productInputSchema>;

export function productName(product: Pick<NutritionProduct, "name" | "brand">) {
  if (!product.brand) return product.name;
  return product.name
    .toLocaleLowerCase("fr-FR")
    .startsWith(product.brand.toLocaleLowerCase("fr-FR"))
    ? product.name
    : `${product.brand} ${product.name}`;
}
