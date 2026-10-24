import {
  capitalize,
  namedPortions,
  plainPortions,
  shoppingName,
  type RaceNutritionAllocation,
} from "@/features/fueling/allocation";
import {
  productKindLabels,
  productKindShortLabels,
  productName,
  type NutritionProduct,
} from "@/features/fueling/products";
import type { ChecklistItem } from "./checklists";
import {
  formatClock,
  formatDecimal,
  formatHours,
  formatInteger,
} from "./format";
import type { RacePlan } from "./race";
import type { RaceTimeline } from "./timeline";
import { temperatureRange, type RaceWeather } from "./weather";

export type UpcomingSession = { date: string; title: string };

const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export function formatShortDate(isoDate: string) {
  return shortDate.format(new Date(`${isoDate.slice(0, 10)}T12:00:00Z`));
}

function shortName(name: string) {
  return name.split(" · ").at(-1) ?? name;
}

const sodiumSources: Record<NutritionProduct["kind"], string> = {
  drink: "iso",
  solid: "barres",
  gel: "gels",
  compote: "compotes",
  other: "autres produits",
};

export function nutritionTiles({
  allocation,
  plan,
  weather,
  startClockMinutes,
}: {
  allocation: RaceNutritionAllocation;
  plan: RacePlan;
  weather: RaceWeather | null;
  startClockMinutes: number;
}) {
  const range = weather?.slots.length ? temperatureRange(weather.slots) : null;
  const rangeText = range
    ? range.min === range.max
      ? `${range.min} °C`
      : `${range.min}–${range.max} °C`
    : null;
  const hours = allocation.totals.movingSeconds / 3600;
  const heatMax = Math.max(
    plan.waterMlPerHour,
    ...allocation.segments.map((segment) => segment.waterMlPerHour),
  );
  const sources = [
    ...new Set(
      allocation.shopping
        .filter((item) => item.product.sodiumMg > 0)
        .map((item) => sodiumSources[item.product.kind]),
    ),
  ];
  const caffeineClock =
    allocation.caffeineFromElapsedSeconds === null
      ? null
      : formatClock(
          startClockMinutes + allocation.caffeineFromElapsedSeconds / 60,
        );
  const caffeineDetail = caffeineClock
    ? { detail: `à partir de ${caffeineClock}`, mobile: `dès ${caffeineClock}` }
    : !plan.nightCaffeine
      ? { detail: "pas de caféine la nuit", mobile: "pas la nuit" }
      : allocation.roles.caffeine
        ? { detail: "pas de tronçon de nuit", mobile: "pas de nuit" }
        : { detail: "aucun produit caféiné", mobile: "aucun produit" };
  return {
    carbs: {
      value: `${formatInteger(plan.carbsPerHourG)} g/h`,
      detail: `${formatInteger(allocation.totals.carbsG)} g sur la course`,
      mobile: `${formatInteger(allocation.totals.carbsG)} g au total`,
    },
    water: {
      value: `${formatInteger(plan.waterMlPerHour)} ml/h`,
      detail: [
        rangeText
          ? `${rangeText} ${weather?.mode === "forecast" ? "prévus" : "en moyenne"}`
          : `${formatDecimal(allocation.totals.waterMl / 1000)} L sur la course`,
        heatMax > plan.waterMlPerHour &&
          `jusqu’à ${formatInteger(heatMax)} ml/h au chaud`,
      ]
        .filter(Boolean)
        .join(" · "),
      mobile:
        rangeText ??
        `${formatDecimal(allocation.totals.waterMl / 1000)} L au total`,
    },
    sodium: {
      value: `${formatInteger(plan.sodiumMgPerHour)} mg/h`,
      detail: sources.length
        ? sources.join(" + ")
        : `${formatInteger(hours > 0 ? allocation.totals.sodiumMg / hours : 0)} mg/h apportés`,
    },
    caffeine: {
      value: `${formatInteger(plan.caffeineMaxMg)} mg`,
      detail: caffeineDetail.detail,
      mobile: caffeineDetail.mobile,
    },
    alarm: {
      value: `${formatInteger(plan.alarmMinutes)} min`,
      detail: "sur la montre",
    },
  };
}

export type StartBox = { label: string; value: string; detail: string };

export function startBoxes({
  allocation,
  plan,
  startTemperature,
}: {
  allocation: RaceNutritionAllocation;
  plan: RacePlan;
  startTemperature: number | null;
}): StartBox[] {
  const drink = allocation.roles.drink;
  const boxes: StartBox[] = allocation.start.fills.map((fill) =>
    fill.content === "drink" && drink
      ? {
          label: `Flasque ${fill.index} · ${formatInteger(plan.flaskMl)} ml`,
          value: `Iso ${drink.brand ?? drink.name} · ${fill.doses} dose${fill.doses > 1 ? "s" : ""}`,
          detail: `${formatInteger(drink.carbsG * fill.doses)} g · ${formatInteger(drink.sodiumMg * fill.doses)} mg sodium`,
        }
      : {
          label: `Flasque ${fill.index} · ${formatInteger(plan.flaskMl)} ml`,
          value: "Eau",
          detail:
            plan.bladderMl !== null
              ? `poche à eau de ${formatInteger(plan.bladderMl)} ml en plus`
              : `pas de poche à eau${startTemperature !== null ? ` : ${startTemperature} °C au départ` : ""}`,
        },
  );
  if (allocation.start.bladder && plan.bladderMl !== null)
    boxes.push({
      label: `Poche à eau · ${formatInteger(plan.bladderMl)} ml`,
      value: "Eau",
      detail: "remplie au départ",
    });
  const segments = allocation.start.pocketSegments;
  boxes.push({
    label: "Poches avant",
    value: namedPortions(allocation.start.pocket) || "Rien à emporter",
    detail: `${formatInteger(allocation.start.pocketCarbsG)} g ${segments > 1 ? `jusqu’au T${segments}` : "pour le T1"}`,
  });
  return boxes;
}

export type TestedRow = { done: boolean; text: string };

export function testedRows({
  products,
  allocation,
  checklist,
  sessions,
}: {
  products: readonly NutritionProduct[];
  allocation: RaceNutritionAllocation;
  checklist: readonly ChecklistItem[];
  sessions: readonly UpcomingSession[];
}): TestedRow[] {
  const used = new Set(allocation.shopping.map((item) => item.product.id));
  const next = sessions[0];
  const rows: TestedRow[] = [];
  for (const product of products)
    if (product.tested)
      rows.push({
        done: true,
        text: [productName(product), product.testedNote]
          .filter(Boolean)
          .join(" · "),
      });
  for (const item of checklist)
    if (item.list === "nutrition_tested")
      rows.push({
        done: item.checked,
        text: [item.label, item.detail].filter(Boolean).join(" · "),
      });
  for (const product of products)
    if (!product.tested && used.has(product.id))
      rows.push({
        done: false,
        text: `${productName(product)} · ${next ? `${next.title}, ${formatShortDate(next.date)}` : "à tester avant la course"}`,
      });
  return rows;
}

export function productRows(
  products: readonly NutritionProduct[],
  sessions: readonly UpcomingSession[],
) {
  const next = sessions[0];
  return products.map((product) => ({
    product,
    name: productName(product),
    kind: productKindLabels[product.kind],
    shortKind: productKindShortLabels[product.kind],
    carbs: `${formatInteger(product.carbsG)} g`,
    sodium:
      product.sodiumMg > 0 ? `${formatInteger(product.sodiumMg)} mg` : "—",
    caffeine:
      product.caffeineMg > 0 ? `${formatInteger(product.caffeineMg)} mg` : "—",
    serving: product.servingLabel ?? "—",
    tested: product.tested
      ? `✓ testé${product.testedNote ? ` · ${product.testedNote}` : ""}`
      : `à tester${next ? ` · ${formatShortDate(next.date)}` : ""}`,
  }));
}

export function shoppingRows(allocation: RaceNutritionAllocation) {
  return allocation.shopping.map((item) => ({
    id: item.product.id,
    name: allocation.generic
      ? capitalize(plainPortions([{ ...item, count: 2 }]).replace(/^2 /, ""))
      : shoppingName(item.product),
    count: item.count,
  }));
}

export function dropBagNote(
  allocation: RaceNutritionAllocation,
  names: ReadonlyMap<string, string>,
) {
  const bags = allocation.dropBags.filter((bag) => bag.items.length);
  if (!bags.length) return null;
  if (bags.length === 1)
    return `Dont dans le sac d’allègement (base de vie) : ${plainPortions(bags[0].items, ", ")}.`;
  return `Dont dans les sacs d’allègement : ${bags
    .map(
      (bag) =>
        `${shortName(names.get(bag.stationId) ?? "base de vie")} : ${plainPortions(bag.items, ", ")}`,
    )
    .join(" ; ")}.`;
}

export type SegmentRow = {
  id: string;
  index: number;
  route: string;
  timing: string;
  carbs: string;
  eat: string;
  arrival: string;
};

export function segmentRows(
  allocation: RaceNutritionAllocation,
  timeline: RaceTimeline,
): SegmentRow[] {
  return allocation.segments.map((segment, index) => {
    const from = timeline.stations[index];
    const to = timeline.stations[index + 1];
    const timed = timeline.segments[index];
    return {
      id: segment.id,
      index: segment.index,
      route: `${shortName(from?.name ?? "")} → ${shortName(to?.name ?? "")}`,
      timing: [
        from && to
          ? `${formatClock(from.clockMinutes)} → ${formatClock(to.clockMinutes)}`
          : null,
        formatHours(segment.movingSeconds),
        (timed?.night ?? segment.night) ? "nuit" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      carbs: `${formatInteger(segment.carbsG)} g`,
      eat:
        [segment.text, segment.note].filter(Boolean).join(" · ") ||
        "Rien à prendre",
      arrival:
        to?.kind === "finish"
          ? "Arrivée"
          : (to?.refill ?? "Pas de ravitaillement"),
    };
  });
}
