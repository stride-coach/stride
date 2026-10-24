import { describe, expect, it } from "vitest";
import {
  allocateRaceNutrition,
  shoppingName,
  waterPerHour,
  type AllocationSegment,
  type AllocationStation,
  type AllocationTargets,
} from "@/features/fueling/allocation";
import {
  catalogueProduct,
  productCatalogue,
} from "@/features/fueling/catalogue";
import type { NutritionProduct } from "@/features/fueling/products";
import { emptyNutritionPlan } from "@/features/fueling/race-plan";

const uuid = (index: number) =>
  `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;

function product(key: string, index: number, tested = true): NutritionProduct {
  const item = catalogueProduct(key)!;
  return {
    id: uuid(100 + index),
    catalogueKey: item.key,
    name: item.name,
    brand: item.brand,
    kind: item.kind,
    carbsG: item.carbsG,
    sodiumMg: item.sodiumMg,
    caffeineMg: item.caffeineMg,
    servingLabel: item.servingLabel,
    servingMl: item.servingMl,
    tested,
    testedNote: null,
    revision: 1,
  };
}

const gel = product("maurten-gel-100", 1);
const caffeineGel = product("maurten-gel-100-caf-100", 2, false);
const drink = product("naak-ultra-energy-drink", 3);
const compote = product("overstims-compote", 4);
const bar = product("naak-ultra-energy-bar", 5);
const products = [gel, caffeineGel, drink, compote, bar];

const stations: AllocationStation[] = [
  { id: uuid(1), kind: "start", services: [] },
  { id: uuid(2), kind: "aid", services: ["water", "sweet"] },
  { id: uuid(3), kind: "water", services: ["water"] },
  { id: uuid(4), kind: "base", services: ["water", "salty"] },
  { id: uuid(5), kind: "aid", services: ["water"] },
  { id: uuid(6), kind: "aid", services: ["water"] },
  { id: uuid(7), kind: "finish", services: [] },
];

const hours = [2, 2.05, 1.25, 2, 2.5, 1.4];
const nights = [false, false, false, false, true, true];
let elapsed = 0;
const segments: AllocationSegment[] = hours.map((value, index) => {
  const segment = {
    id: stations[index + 1].id,
    movingSeconds: value * 3600,
    startElapsedSeconds: elapsed,
    night: nights[index],
  };
  elapsed += value * 3600;
  return segment;
});

const targets: AllocationTargets = {
  carbsPerHourG: 70,
  waterMlPerHour: 500,
  sodiumMgPerHour: 400,
  caffeineMaxMg: 200,
  nightCaffeine: true,
  flaskMl: 500,
  flaskCount: 2,
  bladderMl: null,
};

function allocate(
  overrides: Partial<Parameters<typeof allocateRaceNutrition>[0]> = {},
) {
  return allocateRaceNutrition({
    stations,
    segments,
    products,
    targets,
    plan: emptyNutritionPlan,
    dropBagExtras: ["Veste chaude"],
    ...overrides,
  });
}

describe("race nutrition allocation", () => {
  const allocation = allocate();

  it("covers each segment's carbohydrate target within 10 %", () => {
    for (const segment of allocation.segments) {
      expect(segment.carbsG).toBeGreaterThanOrEqual(segment.carbsTargetG * 0.9);
      expect(segment.carbsG).toBeLessThanOrEqual(segment.carbsTargetG * 1.1);
      for (const item of segment.items)
        expect(Number.isInteger(item.count)).toBe(true);
    }
  });

  it("keeps caffeine for the night and within the race maximum", () => {
    for (const segment of allocation.segments)
      if (!segment.night) expect(segment.caffeineMg).toBe(0);
    expect(
      allocation.segments.filter((segment) => segment.caffeineMg > 0),
    ).not.toHaveLength(0);
    expect(allocation.totals.caffeineMg).toBeLessThanOrEqual(200);
    expect(allocation.caffeineFromElapsedSeconds).toBe(
      segments[4].startElapsedSeconds,
    );
    const noCaffeine = allocate({
      targets: { ...targets, nightCaffeine: false },
    });
    expect(noCaffeine.totals.caffeineMg).toBe(0);
  });

  it("sets up the start with the drink flask, water and pockets", () => {
    expect(allocation.start.fills).toEqual([
      { index: 1, content: "drink", doses: 1 },
      { index: 2, content: "water", doses: 0 },
    ]);
    expect(allocation.stations[uuid(1)].text).toMatch(
      /^Flasque 1 iso \(1 dose\) · flasque 2 eau · .* en poche$/,
    );
    expect(allocation.segments[0].text).toMatch(
      /^\d gels Maurten.* · 1 flasque iso \(1 dose\)$/,
    );
  });

  it("refills at each station from its services", () => {
    expect(allocation.stations[uuid(2)].text).toMatch(
      /^Flasque 1 iso \(1 dose\) · flasque 2 eau · reprends /,
    );
    expect(allocation.stations[uuid(3)].text).toBe("Flasque 2 eau seulement");
    expect(allocation.segments[2].drink).toBeNull();
    expect(allocation.stations[uuid(7)].text).toBeNull();
  });

  it("packs the drop bag at the base with what follows it", () => {
    expect(allocation.dropBags).toHaveLength(1);
    const bag = allocation.dropBags[0];
    expect(bag.stationId).toBe(uuid(4));
    const after = allocation.segments.slice(3);
    const count = (id: string) =>
      after.reduce(
        (total, segment) =>
          total +
          [...segment.items, ...(segment.drink ? [segment.drink] : [])]
            .filter((item) => item.product.id === id)
            .reduce((sum, item) => sum + item.count, 0),
        0,
      );
    for (const item of bag.items)
      expect(item.count).toBe(count(item.product.id));
    expect(bag.text).toMatch(/, Veste chaude$/);
    expect(allocation.stations[uuid(4)].text).toMatch(/^Sac d’allègement : /);
  });

  it("totals the shopping list from every segment", () => {
    const carbs = allocation.shopping.reduce(
      (total, item) => total + item.product.carbsG * item.count,
      0,
    );
    expect(carbs).toBe(allocation.totals.carbsG);
    expect(
      allocation.shopping.map((item) => shoppingName(item.product)),
    ).toContain("Näak Ultra Energy · doses");
  });

  it("keeps a segment the athlete or the nutritionist planned", () => {
    const planned = allocate({
      plan: {
        ...emptyNutritionPlan,
        segments: {
          [uuid(2)]: {
            items: [{ productId: bar.id, count: 2 }],
            note: "Mange tôt.",
          },
        },
      },
    });
    expect(planned.segments[0]).toMatchObject({
      custom: true,
      note: "Mange tôt.",
      items: [{ product: bar, count: 2 }],
    });
  });

  it("packs one drop bag per base de vie", () => {
    const twoBases = allocate({
      stations: stations.map((station, index) =>
        index === 5 ? { ...station, kind: "base" } : station,
      ),
    });
    expect(twoBases.dropBags.map((bag) => bag.stationId)).toEqual([
      uuid(4),
      uuid(6),
    ]);
    const eaten = (from: number, to: number) =>
      twoBases.segments
        .slice(from, to)
        .flatMap((segment) => [
          ...segment.items,
          ...(segment.drink ? [segment.drink] : []),
        ])
        .reduce((total, item) => total + item.count, 0);
    const counted = (index: number) =>
      twoBases.dropBags[index].items.reduce(
        (total, item) => total + item.count,
        0,
      );
    expect(counted(0)).toBe(eaten(3, 5));
    expect(counted(1)).toBe(eaten(5, 6));
    expect(twoBases.dropBags[0].extras).toEqual(["Veste chaude"]);
    expect(twoBases.dropBags[1].extras).toEqual([]);
  });

  it("uses caffeinated products only in the caffeine role at night", () => {
    const cafDrink = { ...drink, id: uuid(201), caffeineMg: 80 };
    const cafBar = { ...bar, id: uuid(202), caffeineMg: 50 };
    const mixed = allocate({
      products: [cafDrink, cafBar, gel, compote],
      plan: { ...emptyNutritionPlan, products: { caffeine: cafBar.id } },
    });
    expect(mixed.roles.drink).toBeUndefined();
    expect(mixed.roles.solid).toBeUndefined();
    for (const segment of mixed.segments) {
      if (!segment.night) expect(segment.caffeineMg).toBe(0);
      expect(segment.drink).toBeNull();
    }
    expect(mixed.totals.caffeineMg).toBeLessThanOrEqual(200);
  });

  it("drops daytime caffeine and caps caffeine in planned segments", () => {
    const planned = allocate({
      plan: {
        ...emptyNutritionPlan,
        segments: {
          [uuid(2)]: {
            items: [
              { productId: caffeineGel.id, count: 2 },
              { productId: gel.id, count: 3 },
            ],
          },
          [uuid(6)]: { items: [{ productId: caffeineGel.id, count: 5 }] },
          [uuid(7)]: { items: [{ productId: caffeineGel.id, count: 5 }] },
        },
      },
    });
    expect(planned.segments[0].items).toEqual([{ product: gel, count: 3 }]);
    expect(planned.segments[4].items).toEqual([
      { product: caffeineGel, count: 2 },
    ]);
    expect(planned.totals.caffeineMg).toBe(200);
    expect(planned.segments[5].custom).toBe(false);
    expect(planned.segments[5].caffeineMg).toBe(0);
  });

  it("keeps archived and sodium-only products of a planned segment", () => {
    const salt = {
      ...gel,
      id: uuid(203),
      kind: "other" as const,
      name: "Pastille de sel",
      brand: null,
      carbsG: 0,
      sodiumMg: 300,
    };
    const archived = { ...compote, id: uuid(204) };
    const planned = allocate({
      products: [...products, salt],
      archivedProducts: [archived],
      plan: {
        ...emptyNutritionPlan,
        segments: {
          [uuid(2)]: {
            items: [
              { productId: archived.id, count: 1 },
              { productId: salt.id, count: 2 },
            ],
          },
          [uuid(3)]: { items: [{ productId: uuid(999), count: 2 }] },
        },
      },
    });
    expect(planned.segments[0].items).toEqual([
      { product: archived, count: 1 },
      { product: salt, count: 2 },
    ]);
    expect(planned.segments[0].sodiumMg).toBeGreaterThanOrEqual(600);
    expect(planned.segments[1].custom).toBe(false);
    expect(planned.segments[1].items.length).toBeGreaterThan(0);
  });

  it("adds the start pocket to the shopping list", () => {
    const pocket = allocate({
      plan: {
        ...emptyNutritionPlan,
        start: { pocket: [{ productId: bar.id, count: 3 }] },
      },
    });
    const bars = (value: typeof allocation) =>
      value.shopping.find((item) => item.product.id === bar.id)?.count ?? 0;
    expect(bars(pocket)).toBe(bars(allocation) + 3);
  });

  it("drinks more in the heat from the nearest temperature", () => {
    expect(waterPerHour(500, null)).toBe(500);
    expect(waterPerHour(500, 15)).toBe(500);
    expect(waterPerHour(500, 17)).toBe(500);
    expect(waterPerHour(500, 18)).toBe(550);
    expect(waterPerHour(500, 24)).toBe(650);
    expect(waterPerHour(500, 40)).toBe(750);
    const hot = allocate({
      segments: segments.map((segment) => ({ ...segment, temperatureC: 27 })),
    });
    expect(hot.segments[0].waterMlPerHour).toBe(700);
    expect(hot.segments[0].waterMl).toBe(1400);
    expect(allocation.segments[0].waterMlPerHour).toBe(500);
  });

  it("falls back to generic portions without products", () => {
    const generic = allocate({ products: [] });
    expect(generic.generic).toBe(true);
    expect(generic.segments[0].text).toMatch(/^\d gels/);
    expect(generic.start.fills.every((fill) => fill.content === "water")).toBe(
      true,
    );
  });

  it("hides the drop bag without a base", () => {
    const withoutBase = allocate({
      stations: stations.map((station) =>
        station.kind === "base" ? { ...station, kind: "aid" } : station,
      ),
    });
    expect(withoutBase.dropBags).toEqual([]);
  });
});

describe("product catalogue", () => {
  it("has unique keys and values within the product bounds", () => {
    const keys = productCatalogue.map((item) => item.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const item of productCatalogue) {
      expect(item.key).toMatch(/^[a-z0-9][a-z0-9-]{0,63}$/);
      expect(item.carbsG).toBeGreaterThan(0);
      expect(item.carbsG).toBeLessThanOrEqual(200);
      expect(item.sodiumMg).toBeLessThanOrEqual(3000);
      expect(item.caffeineMg).toBeLessThanOrEqual(400);
    }
  });
});
