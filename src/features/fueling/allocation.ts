import { productCarbs } from "@/features/races/nutrition";
import type { Service, WaypointKind } from "@/features/races/waypoints";
import { productName, type NutritionProduct } from "./products";
import type { NutritionRole, RaceNutritionPlan } from "./race-plan";

export type AllocationStation = {
  id: string;
  kind: WaypointKind;
  services: readonly Service[];
};

export type AllocationSegment = {
  id: string;
  movingSeconds: number;
  startElapsedSeconds: number;
  night: boolean;
};

export type AllocationTargets = {
  carbsPerHourG: number;
  waterMlPerHour: number;
  sodiumMgPerHour: number;
  caffeineMaxMg: number;
  nightCaffeine: boolean;
  flaskMl: number;
  flaskCount: number;
  bladderMl: number | null;
};

export type Portion = { product: NutritionProduct; count: number };

export type FlaskFill = {
  index: number;
  content: "drink" | "water";
  doses: number;
};

export type SegmentFueling = {
  id: string;
  index: number;
  movingSeconds: number;
  night: boolean;
  carbsTargetG: number;
  carbsG: number;
  sodiumMg: number;
  caffeineMg: number;
  waterMl: number;
  items: Portion[];
  drink: Portion | null;
  fills: FlaskFill[];
  bladder: boolean;
  custom: boolean;
  note: string | null;
  text: string | null;
};

export type StationFueling = {
  id: string;
  kind: WaypointKind;
  pickup: Portion[];
  text: string | null;
};

export type DropBag = {
  stationId: string;
  items: Portion[];
  extras: string[];
  text: string;
};

export type RaceNutritionAllocation = {
  generic: boolean;
  roles: Partial<Record<NutritionRole, NutritionProduct>>;
  start: {
    fills: FlaskFill[];
    bladder: boolean;
    pocket: Portion[];
    pocketCarbsG: number;
    pocketSegments: number;
  };
  segments: SegmentFueling[];
  stations: Record<string, StationFueling>;
  dropBag: DropBag | null;
  shopping: Portion[];
  totals: {
    carbsG: number;
    sodiumMg: number;
    caffeineMg: number;
    waterMl: number;
    movingSeconds: number;
  };
  caffeineFromElapsedSeconds: number | null;
};

const genericProduct = (
  kind: "gel" | "compote" | "solid",
  name: string,
  carbsG: number,
): NutritionProduct => ({
  id: `generic-${kind}`,
  catalogueKey: null,
  name,
  brand: null,
  kind,
  carbsG,
  sodiumMg: 0,
  caffeineMg: 0,
  servingLabel: null,
  servingMl: null,
  tested: false,
  testedNote: null,
  revision: 1,
});

export const genericProducts = [
  genericProduct("gel", "Gel", productCarbs.gel),
  genericProduct("compote", "Compote", productCarbs.compote),
  genericProduct("solid", "Barre", productCarbs.bar),
];

const roleOrder: Record<string, number> = {
  gel: 0,
  caffeine: 1,
  compote: 2,
  solid: 3,
  other: 4,
  drink: 5,
};

function isGeneric(product: NutritionProduct) {
  return product.id.startsWith("generic-");
}

function caffeinated(product: NutritionProduct) {
  return product.caffeineMg > 0 && product.kind !== "drink";
}

function roleFits(role: NutritionRole, product: NutritionProduct) {
  if (role === "caffeine") return caffeinated(product);
  if (role === "gel") return product.kind === "gel" && !caffeinated(product);
  return product.kind === role;
}

function preferred(products: readonly NutritionProduct[]) {
  return products.find((product) => product.tested) ?? products[0] ?? null;
}

export function productRoles(
  products: readonly NutritionProduct[],
  plan: RaceNutritionPlan,
) {
  const roles: Partial<Record<NutritionRole, NutritionProduct>> = {};
  for (const role of [
    "gel",
    "drink",
    "compote",
    "solid",
    "caffeine",
  ] as const) {
    const chosen = plan.products[role];
    const product =
      (chosen && products.find((item) => item.id === chosen)) ||
      preferred(products.filter((item) => roleFits(role, item)));
    if (product && roleFits(role, product)) roles[role] = product;
  }
  return roles;
}

function providesWater(station: AllocationStation) {
  if (station.kind === "start" || station.kind === "water") return true;
  if (station.kind !== "aid" && station.kind !== "base") return false;
  return station.services.length === 0 || station.services.includes("water");
}

function providesFood(station: AllocationStation) {
  return (
    station.kind === "start" ||
    station.kind === "aid" ||
    station.kind === "base"
  );
}

function plural(count: number, singular: string, pluralForm: string) {
  return count > 1 ? pluralForm : singular;
}

function noun(product: NutritionProduct, count: number) {
  if (caffeinated(product) && product.kind === "gel")
    return plural(count, "gel caféine", "gels caféine");
  switch (product.kind) {
    case "gel":
      return plural(count, "gel", "gels");
    case "compote":
      return plural(count, "compote", "compotes");
    case "solid":
      return plural(count, "barre", "barres");
    case "drink":
      return plural(count, "dose iso", "doses iso");
    default:
      return plural(count, "portion", "portions");
  }
}

function namedPortion({ product, count }: Portion) {
  if (isGeneric(product) || (caffeinated(product) && product.kind === "gel"))
    return `${count} ${noun(product, count)}`;
  if (product.brand) return `${count} ${noun(product, count)} ${product.brand}`;
  return `${count} × ${product.name}`;
}

export function plainPortions(portions: readonly Portion[], separator = " + ") {
  const counts = new Map<string, number>();
  const order: string[] = [];
  for (const portion of portions) {
    const key = noun(portion.product, 2);
    if (!counts.has(key)) order.push(key);
    counts.set(key, (counts.get(key) ?? 0) + portion.count);
  }
  return order
    .map((key) => {
      const count = counts.get(key)!;
      const sample = portions.find(
        (portion) => noun(portion.product, 2) === key,
      )!;
      return `${count} ${noun(sample.product, count)}`;
    })
    .join(separator);
}

export function namedPortions(portions: readonly Portion[]) {
  return portions.map(namedPortion).join(" · ");
}

export function fillsText(fills: readonly FlaskFill[], bladder: boolean) {
  const parts = fills.map(
    (fill) =>
      `flasque ${fill.index} ${
        fill.content === "drink"
          ? `iso (${fill.doses} ${plural(fill.doses, "dose", "doses")})`
          : "eau"
      }`,
  );
  if (bladder) parts.push("poche à eau");
  return parts.join(" · ");
}

export function capitalize(text: string) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function merge(portions: readonly Portion[]) {
  const byId = new Map<string, Portion>();
  for (const portion of portions) {
    const current = byId.get(portion.product.id);
    if (current) current.count += portion.count;
    else byId.set(portion.product.id, { ...portion });
  }
  return [...byId.values()].sort((a, b) => rank(a.product) - rank(b.product));
}

function rank(product: NutritionProduct) {
  return roleOrder[caffeinated(product) ? "caffeine" : product.kind] ?? 9;
}

function sum(
  portions: readonly Portion[],
  key: "carbsG" | "sodiumMg" | "caffeineMg",
) {
  return portions.reduce(
    (total, portion) => total + portion.product[key] * portion.count,
    0,
  );
}

function flaskPattern(
  plan: RaceNutritionPlan,
  count: number,
  drink: NutritionProduct | undefined,
) {
  const chosen =
    plan.start?.flasks ??
    Array.from({ length: count }, (_, index) =>
      index === 0 && drink ? "drink" : "water",
    );
  return Array.from({ length: count }, (_, index) =>
    drink && chosen[index] === "drink" ? "drink" : "water",
  ) as ("drink" | "water")[];
}

export function allocateRaceNutrition({
  stations,
  segments,
  products,
  targets,
  plan,
  dropBagExtras = [],
}: {
  stations: readonly AllocationStation[];
  segments: readonly AllocationSegment[];
  products: readonly NutritionProduct[];
  targets: AllocationTargets;
  plan: RaceNutritionPlan;
  dropBagExtras?: readonly string[];
}): RaceNutritionAllocation {
  const usable = products.filter(
    (product) => product.carbsG > 0 || product.kind === "drink",
  );
  const generic = usable.length === 0;
  const catalogue = generic ? genericProducts : usable;
  const roles = productRoles(
    catalogue,
    generic ? { products: {}, segments: {} } : plan,
  );
  const fill =
    roles.gel ??
    roles.compote ??
    roles.solid ??
    catalogue.find((product) => product.kind === "other" && product.carbsG > 0);
  const byId = new Map(catalogue.map((product) => [product.id, product]));
  const pattern = flaskPattern(plan, targets.flaskCount, roles.drink);
  const dosesPerFlask = roles.drink?.servingMl
    ? Math.max(1, Math.round(targets.flaskMl / roles.drink.servingMl))
    : 1;
  let caffeineBudget = targets.caffeineMaxMg;

  const fueled = segments.map((segment, index): SegmentFueling => {
    const departure = stations[index];
    const hours = segment.movingSeconds / 3600;
    const waterMl = hours * targets.waterMlPerHour;
    const carbsTargetG = hours * targets.carbsPerHourG;
    const needed =
      targets.flaskCount > 0 && waterMl > 0
        ? Math.min(
            targets.flaskCount,
            Math.max(1, Math.ceil(waterMl / targets.flaskMl)),
          )
        : 0;
    let fills: FlaskFill[] = [];
    const refill = departure ? providesWater(departure) : false;
    if (refill) {
      const used = pattern.slice(0, needed).map((content, slot) => ({
        index: slot + 1,
        content,
        doses: content === "drink" ? dosesPerFlask : 0,
      }));
      if (departure?.kind === "water") {
        const water = used.filter((item) => item.content === "water");
        fills = water.length
          ? water
          : used.slice(0, 1).map((item) => ({
              ...item,
              content: "water" as const,
              doses: 0,
            }));
      } else fills = used;
    }
    const bladder =
      refill &&
      targets.bladderMl !== null &&
      (targets.flaskCount === 0 ||
        waterMl > targets.flaskCount * targets.flaskMl);
    const doses = fills.reduce((total, item) => total + item.doses, 0);
    const drink =
      roles.drink && doses > 0 ? { product: roles.drink, count: doses } : null;
    const override = generic ? undefined : plan.segments[segment.id];
    let items: Portion[];
    if (override) {
      items = override.items.flatMap((serving) => {
        const product = byId.get(serving.productId);
        return product ? [{ product, count: serving.count }] : [];
      });
      caffeineBudget -= sum(items, "caffeineMg");
    } else {
      items = [];
      let remaining = carbsTargetG - (drink ? sum([drink], "carbsG") : 0);
      const add = (product: NutritionProduct, count: number) => {
        if (count <= 0) return;
        items.push({ product, count });
        remaining -= product.carbsG * count;
      };
      const caffeine = roles.caffeine;
      if (
        caffeine &&
        segment.night &&
        targets.nightCaffeine &&
        remaining > 0 &&
        caffeineBudget >= caffeine.caffeineMg
      ) {
        const count = Math.min(
          Math.floor(caffeineBudget / caffeine.caffeineMg),
          Math.max(1, Math.floor(hours)),
          Math.max(1, Math.round(remaining / Math.max(1, caffeine.carbsG))),
        );
        add(caffeine, count);
        caffeineBudget -= count * caffeine.caffeineMg;
      }
      const extras = [roles.compote, roles.solid].filter(
        (product): product is NutritionProduct =>
          Boolean(product) && product !== fill && hours >= 1,
      );
      let best: { picked: NutritionProduct[]; fills: number; score: number } = {
        picked: [],
        fills: 0,
        score: Infinity,
      };
      for (let mask = 0; mask < 1 << extras.length; mask += 1) {
        const picked = extras.filter((_, bit) => mask & (1 << bit));
        const rest =
          remaining - picked.reduce((total, item) => total + item.carbsG, 0);
        if (rest < 0 && picked.length) continue;
        const fills =
          fill && fill.carbsG > 0
            ? Math.max(0, Math.round(rest / fill.carbsG))
            : 0;
        const error = Math.abs(rest - fills * (fill?.carbsG ?? 0));
        const variety = hours >= 1.5 ? -picked.length : picked.length;
        const score = error + variety * 0.5;
        if (score < best.score) best = { picked, fills, score };
      }
      for (const product of best.picked) add(product, 1);
      if (fill) add(fill, best.fills);
      items = merge(items);
    }
    const eaten = drink ? [...items, drink] : items;
    const note = override?.note ?? null;
    const named = [
      namedPortions(items),
      drink &&
        `${drink.count === 1 ? "1 flasque iso" : `${fills.filter((item) => item.content === "drink").length} flasques iso`} (${drink.count} ${plural(drink.count, "dose", "doses")})`,
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: segment.id,
      index: index + 1,
      movingSeconds: segment.movingSeconds,
      night: segment.night,
      carbsTargetG: Math.round(carbsTargetG),
      carbsG: sum(eaten, "carbsG"),
      sodiumMg: sum(eaten, "sodiumMg"),
      caffeineMg: sum(eaten, "caffeineMg"),
      waterMl: Math.round(waterMl),
      items,
      drink,
      fills,
      bladder,
      custom: Boolean(override),
      note,
      text: named || null,
    };
  });

  const eatenOf = (segment: SegmentFueling) =>
    segment.drink ? [...segment.items, segment.drink] : segment.items;
  const baseIndex = stations.findIndex(
    (station, index) => station.kind === "base" && index < fueled.length,
  );
  const dropItems =
    baseIndex >= 0 ? merge(fueled.slice(baseIndex).flatMap(eatenOf)) : [];
  const extras = [...dropBagExtras];
  const dropBag: DropBag | null =
    baseIndex >= 0
      ? {
          stationId: stations[baseIndex].id,
          items: dropItems,
          extras,
          text: [plainPortions(dropItems, ", "), ...extras]
            .filter(Boolean)
            .join(", "),
        }
      : null;

  const pickups = stations.map((station, index) => {
    if (index >= fueled.length || !providesFood(station)) return [];
    const next = stations.findIndex(
      (item, at) =>
        at > index && (providesFood(item) || item.kind === "finish"),
    );
    const until = next < 0 ? fueled.length : Math.min(next, fueled.length);
    return merge(
      fueled.slice(index, until).flatMap((segment) => segment.items),
    );
  });
  const startOverride = generic ? undefined : plan.start?.pocket;
  const pocket = startOverride
    ? merge(
        startOverride.flatMap((serving) => {
          const product = byId.get(serving.productId);
          return product ? [{ product, count: serving.count }] : [];
        }),
      )
    : (pickups[0] ?? []);
  const pocketNext = stations.findIndex(
    (item, at) => at > 0 && (providesFood(item) || item.kind === "finish"),
  );
  const pocketSegments = Math.max(
    1,
    Math.min(pocketNext < 0 ? fueled.length : pocketNext, fueled.length),
  );

  const stationRecords: Record<string, StationFueling> = {};
  stations.forEach((station, index) => {
    const segment = fueled[index];
    const pickup = index === 0 ? pocket : (pickups[index] ?? []);
    const flasks = segment ? fillsText(segment.fills, segment.bladder) : "";
    const carried = plainPortions(pickup);
    let text: string | null = null;
    if (segment) {
      if (index === baseIndex && dropBag)
        text = [`sac d’allègement : ${dropBag.text}`, flasks]
          .filter(Boolean)
          .join(" · ");
      else if (station.kind === "start")
        text = [flasks, carried && `${carried} en poche`]
          .filter(Boolean)
          .join(" · ");
      else if (station.kind === "water")
        text = flasks ? `${flasks} seulement` : null;
      else
        text = [flasks, carried && `reprends ${carried}`]
          .filter(Boolean)
          .join(" · ");
    }
    stationRecords[station.id] = {
      id: station.id,
      kind: station.kind,
      pickup,
      text: text ? capitalize(text) : null,
    };
  });

  const all = fueled.flatMap(eatenOf);
  const firstCaffeine = fueled.findIndex((segment) => segment.caffeineMg > 0);
  return {
    generic,
    roles,
    start: {
      fills: fueled[0]?.fills ?? [],
      bladder: fueled[0]?.bladder ?? false,
      pocket,
      pocketCarbsG: sum(pocket, "carbsG"),
      pocketSegments,
    },
    segments: fueled,
    stations: stationRecords,
    dropBag,
    shopping: merge(all),
    totals: {
      carbsG: sum(all, "carbsG"),
      sodiumMg: sum(all, "sodiumMg"),
      caffeineMg: sum(all, "caffeineMg"),
      waterMl: fueled.reduce((total, segment) => total + segment.waterMl, 0),
      movingSeconds: fueled.reduce(
        (total, segment) => total + segment.movingSeconds,
        0,
      ),
    },
    caffeineFromElapsedSeconds:
      firstCaffeine >= 0 ? segments[firstCaffeine].startElapsedSeconds : null,
  };
}

export function shoppingName(product: NutritionProduct) {
  const name = productName(product);
  return product.kind === "drink" ? `${name} · doses` : name;
}
