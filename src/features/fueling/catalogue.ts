import type { ProductKind } from "./products";

export type CatalogueProduct = {
  key: string;
  brand: string;
  name: string;
  kind: ProductKind;
  carbsG: number;
  sodiumMg: number;
  caffeineMg: number;
  servingLabel: string;
  servingMl: number | null;
};

export const productCatalogue = [
  {
    key: "maurten-gel-100",
    brand: "Maurten",
    name: "Gel 100",
    kind: "gel",
    carbsG: 25,
    sodiumMg: 20,
    caffeineMg: 0,
    servingLabel: "40 g",
    servingMl: null,
  },
  {
    key: "maurten-gel-100-caf-100",
    brand: "Maurten",
    name: "Gel 100 Caf 100",
    kind: "gel",
    carbsG: 25,
    sodiumMg: 20,
    caffeineMg: 100,
    servingLabel: "40 g",
    servingMl: null,
  },
  {
    key: "maurten-gel-160",
    brand: "Maurten",
    name: "Gel 160",
    kind: "gel",
    carbsG: 40,
    sodiumMg: 30,
    caffeineMg: 0,
    servingLabel: "65 g",
    servingMl: null,
  },
  {
    key: "naak-ultra-energy-drink",
    brand: "Näak",
    name: "Ultra Energy",
    kind: "drink",
    carbsG: 40,
    sodiumMg: 500,
    caffeineMg: 0,
    servingLabel: "500 ml",
    servingMl: 500,
  },
  {
    key: "naak-ultra-energy-bar",
    brand: "Näak",
    name: "Barre Ultra Energy",
    kind: "solid",
    carbsG: 32,
    sodiumMg: 200,
    caffeineMg: 0,
    servingLabel: "50 g",
    servingMl: null,
  },
  {
    key: "overstims-compote",
    brand: "Overstims",
    name: "Compote énergétique",
    kind: "compote",
    carbsG: 25,
    sodiumMg: 0,
    caffeineMg: 0,
    servingLabel: "90 g",
    servingMl: null,
  },
  {
    key: "overstims-gel",
    brand: "Overstims",
    name: "Gel Antioxydant",
    kind: "gel",
    carbsG: 20,
    sodiumMg: 30,
    caffeineMg: 0,
    servingLabel: "30 g",
    servingMl: null,
  },
  {
    key: "precision-fuel-pf30-gel",
    brand: "Precision Fuel",
    name: "PF 30 Gel",
    kind: "gel",
    carbsG: 30,
    sodiumMg: 0,
    caffeineMg: 0,
    servingLabel: "51 g",
    servingMl: null,
  },
  {
    key: "precision-fuel-pf90-gel",
    brand: "Precision Fuel",
    name: "PF 90 Gel",
    kind: "gel",
    carbsG: 90,
    sodiumMg: 0,
    caffeineMg: 0,
    servingLabel: "153 g",
    servingMl: null,
  },
  {
    key: "tailwind-endurance-fuel",
    brand: "Tailwind",
    name: "Endurance Fuel",
    kind: "drink",
    carbsG: 25,
    sodiumMg: 303,
    caffeineMg: 0,
    servingLabel: "1 dose · 500 ml",
    servingMl: 500,
  },
] as const satisfies readonly CatalogueProduct[];

export type CatalogueKey = (typeof productCatalogue)[number]["key"];

export function catalogueProduct(key: string): CatalogueProduct | null {
  return productCatalogue.find((item) => item.key === key) ?? null;
}
