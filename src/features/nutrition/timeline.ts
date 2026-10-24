import type { NutritionProduct } from "@/features/fueling/products";
import type {
  NutritionDayResult,
  NutritionFueling,
  NutritionRange,
} from "./calculator";
import { nutritionThresholds as t } from "./thresholds";

export type FuelingItems = {
  drink: { product: NutritionProduct; count: number } | null;
  gels: {
    product: NutritionProduct | null;
    carbsG: number;
    count: number;
    atSeconds: number[];
  };
};

export type NutritionTimelineStep =
  | { kind: "pre_meal"; hours: NutritionRange; carbsG: number }
  | { kind: "snack"; minutes: number; carbsG: number }
  | { kind: "during"; fueling: NutritionFueling; items: FuelingItems }
  | {
      kind: "recovery";
      withinHours: number;
      proteinG: NutritionRange;
      carbsG: number;
    }
  | { kind: "rest_of_day"; intakes: NutritionRange }
  | { kind: "meals"; intakes: NutritionRange };

export type NutritionTimeline = {
  mainEffort: NutritionDayResult["mainEffort"];
  steps: NutritionTimelineStep[];
};

const roundGrams = (grams: number) =>
  Math.max(
    t.timelineRoundingG,
    Math.round(grams / t.timelineRoundingG) * t.timelineRoundingG,
  );

const stepSeconds = t.fuelingStepRoundingMinutes * 60;

function pick(
  products: readonly NutritionProduct[],
  kind: NutritionProduct["kind"],
) {
  const usable = products.filter(
    (product) => product.kind === kind && product.carbsG > 0,
  );
  return usable.find((product) => product.caffeineMg === 0) ?? usable[0];
}

export function fuelingItems(
  fueling: NutritionFueling,
  products: readonly NutritionProduct[],
): FuelingItems {
  const hours = fueling.durationSeconds / 3_600;
  const perHour = (fueling.gramsPerHour.min + fueling.gramsPerHour.max) / 2;
  const totalG = Math.round(perHour * hours);
  const drinkProduct = pick(products, "drink");
  const drink = drinkProduct
    ? { product: drinkProduct, count: Math.max(1, Math.floor(hours)) }
    : null;
  const gelProduct = pick(products, "gel") ?? null;
  const gelCarbs = gelProduct?.carbsG ?? t.genericGelCarbsG;
  const remaining = totalG - (drink ? drink.count * drink.product.carbsG : 0);
  const count = Math.max(0, Math.round(remaining / gelCarbs));
  const spacing = fueling.durationSeconds / (count + 1);
  return {
    drink,
    gels: {
      product: gelProduct,
      carbsG: gelCarbs,
      count,
      atSeconds: Array.from(
        { length: count },
        (_, index) =>
          Math.round(((index + 1) * spacing) / stepSeconds) * stepSeconds,
      ),
    },
  };
}

export function nutritionTimeline(
  result: NutritionDayResult,
  products: readonly NutritionProduct[],
): NutritionTimeline {
  const { mainEffort } = result;
  const intakes = result.protein.intakes;
  if (!mainEffort)
    return {
      mainEffort,
      steps: [{ kind: "meals", intakes: { ...intakes } }],
    };
  const weightKg = result.inputsUsed.weightKg;
  const fueling =
    result.fueling.find((item) => item.target === mainEffort.target) ?? null;
  const steps: NutritionTimelineStep[] = [
    {
      kind: "pre_meal",
      hours: { ...t.preSessionMealHours },
      carbsG: roundGrams(weightKg * t.preSessionMealCarbsGPerKg),
    },
  ];
  if (fueling) {
    steps.push(
      {
        kind: "snack",
        minutes: t.preSessionSnackMinutes,
        carbsG: t.preSessionSnackCarbsG,
      },
      { kind: "during", fueling, items: fuelingItems(fueling, products) },
    );
  }
  if (result.protein.recoveryIntakeWithinHours !== null)
    steps.push({
      kind: "recovery",
      withinHours: result.protein.recoveryIntakeWithinHours,
      proteinG: { ...result.protein.gramsPerIntake },
      carbsG: roundGrams(weightKg * t.recoveryCarbsGPerKg),
    });
  const used = steps.filter(
    (step) => step.kind === "pre_meal" || step.kind === "recovery",
  ).length;
  steps.push({
    kind: "rest_of_day",
    intakes: {
      min: Math.max(1, intakes.min - used),
      max: Math.max(1, intakes.max - used),
    },
  });
  return { mainEffort, steps };
}
