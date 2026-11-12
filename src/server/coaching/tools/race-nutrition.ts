import "server-only";
import { z } from "zod";
import type { RaceNutritionAllocation } from "@/features/fueling/allocation";
import { productName } from "@/features/fueling/products";
import { nutritionTargetsSchema } from "@/features/fueling/race-plan";
import { localToday } from "@/features/plans/constraints";
import { nutritionTargetsOf } from "@/features/races/proposal-review";
import { nutritionProposalSchema } from "@/features/races/proposals";
import { daysUntil } from "@/features/races/race";
import { raceAllocation } from "@/features/races/race-nutrition";
import { segmentNight } from "@/features/races/workspace";
import { temperatureRange } from "@/features/races/weather";
import {
  readNutritionLibrary,
  readNutritionProducts,
} from "@/server/fueling/products";
import { readReadyRaceProposals } from "@/server/races/proposals";
import { readWorkspace } from "@/server/races/races";
import { withFuelingCap } from "@/features/fueling/tests";
import { planFor, weatherFor } from "@/server/races/views";
import { defineTool } from "./define";
import { toolError } from "./errors";
import { submitRaceProposal } from "./race-proposal";

const weatherHorizonDays = 14;

function km(meters: number) {
  return Math.round(meters / 100) / 10;
}

function allocationView(
  allocation: RaceNutritionAllocation,
  names: ReadonlyMap<string, string>,
  bounds: { fromId: string; toId: string; fromM: number; toM: number }[],
) {
  const portion = (item: RaceNutritionAllocation["shopping"][number]) => ({
    productId: allocation.generic ? null : item.product.id,
    name: productName(item.product),
    count: item.count,
  });
  return {
    generic: allocation.generic,
    start: {
      flasks: allocation.start.fills,
      bladder: allocation.start.bladder,
      pocket: allocation.start.pocket.map(portion),
    },
    segments: allocation.segments.map((segment, index) => ({
      segment: `T${segment.index}`,
      arrivalWaypointId: segment.id,
      from: names.get(bounds[index]?.fromId ?? "") ?? null,
      to: names.get(segment.id) ?? null,
      km: bounds[index] ? km(bounds[index].toM - bounds[index].fromM) : null,
      movingSeconds: Math.round(segment.movingSeconds),
      night: segment.night,
      carbsTargetG: segment.carbsTargetG,
      carbsG: segment.carbsG,
      sodiumMg: segment.sodiumMg,
      caffeineMg: segment.caffeineMg,
      waterMl: segment.waterMl,
      items: segment.items.map(portion),
      drinkDoses: segment.drink?.count ?? 0,
      flasks: segment.fills,
      plannedByAthlete: segment.custom,
      note: segment.note,
    })),
    stations: Object.values(allocation.stations).map((station) => ({
      waypointId: station.id,
      name: names.get(station.id) ?? null,
      kind: station.kind,
      refill: station.text,
    })),
    dropBags: allocation.dropBags.map((bag) => ({
      waypointId: bag.stationId,
      name: names.get(bag.stationId) ?? null,
      items: bag.items.map(portion),
      extras: bag.extras,
    })),
    shopping: allocation.shopping.map(portion),
    totals: allocation.totals,
  };
}

export const readRaceNutritionTool = defineTool({
  name: "read_race_nutrition",
  description:
    "Read the race nutrition plan of one of the athlete's races, by race id from read_athlete_context: the race fueling targets (carbohydrate, water and sodium per hour, caffeine maximum, night caffeine, flasks and water bladder), the athlete's nutrition products with their ids, carbohydrate, sodium and caffeine per serving and whether they were tested in training, the accepted race nutrition plan, any nutrition proposal still waiting for the athlete, and validatedCarbsPerHourG, the highest carbohydrate per hour the athlete tolerated in a recorded training test (null when none is recorded), and Stride's exact allocation on the target scenario, already capped at that validated intake: the start setup, per segment T1, T2… (with its arrival waypoint id) the moving time, night flag, carbohydrate target and allocated items, the refill at each station from its services, the drop bag at the first base, the shopping list and the totals. The temperature range is included when the race is at most 14 days away. Returns hasCourse false without an imported course or a target time. Never compute a quantity yourself: quote this result.",
  class: "compute",
  dataClasses: ["training"],
  input: z.strictObject({
    raceId: z.string().min(1).max(64).describe("Race id."),
  }),
  output: z.strictObject({
    today: z.iso.date(),
    race: z.unknown(),
    hasCourse: z.boolean(),
    daysToRace: z.number().nullable(),
    targets: z.unknown(),
    validatedCarbsPerHourG: z.number().nullable(),
    products: z.array(z.unknown()),
    acceptedPlan: z.unknown().nullable(),
    pendingProposal: z.unknown().nullable(),
    allocation: z.unknown().nullable(),
    temperatures: z.unknown().nullable(),
  }),
  run: async (context, { raceId }) => {
    if (!z.uuid().safeParse(raceId).success) throw toolError("not_found");
    const [data, pending, library] = await Promise.all([
      readWorkspace(context, raceId),
      readReadyRaceProposals(context, raceId),
      readNutritionLibrary(context),
    ]);
    const products = library.active;
    if (!data) throw toolError("not_found");
    const today = localToday(data.course?.timeZone ?? "Europe/Paris");
    const daysToRace = data.race.date ? daysUntil(data.race.date, today) : null;
    const waiting = pending.find((proposal) => proposal.kind === "nutrition");
    const base = {
      today,
      race: data.race,
      daysToRace,
      targets: {
        ...nutritionTargetsOf(data.plan),
        alarmMinutes: data.plan.alarmMinutes,
      },
      validatedCarbsPerHourG: data.fuelingCapG,
      products: products.map((product) => ({
        id: product.id,
        name: productName(product),
        kind: product.kind,
        carbsG: product.carbsG,
        sodiumMg: product.sodiumMg,
        caffeineMg: product.caffeineMg,
        serving: product.servingLabel,
        servingMl: product.servingMl,
        tested: product.tested,
        testedNote: product.testedNote,
      })),
      acceptedPlan: data.nutritionPlan
        ? {
            revision: data.nutritionPlan.revision,
            plan: data.nutritionPlan.plan,
          }
        : null,
      pendingProposal: waiting
        ? {
            title: waiting.title,
            summary: waiting.summary,
            createdAt: waiting.createdAt,
            payload: waiting.payload,
          }
        : null,
    };
    const views = planFor(data);
    if (!views?.planned)
      return {
        ...base,
        hasCourse: false,
        allocation: null,
        temperatures: null,
      };
    const { model, planned } = views;
    const weather =
      daysToRace !== null && daysToRace <= weatherHorizonDays
        ? await weatherFor(data, model, planned)
        : null;
    const allocation = raceAllocation({
      model,
      planned,
      plan: withFuelingCap(data.plan, data.fuelingCapG ?? null),
      nutritionPlan: data.nutritionPlan?.plan ?? null,
      dropBagExtras: data.dropBag?.extras ?? [],
      products,
      archivedProducts: library.archived,
      weather,
    });
    const names = new Map(
      model.waypoints.map((waypoint) => [waypoint.id, waypoint.name]),
    );
    return {
      ...base,
      hasCourse: true,
      allocation: allocationView(
        allocation,
        names,
        planned.simulation.segments,
      ),
      temperatures: weather?.slots.length
        ? { mode: weather.mode, ...temperatureRange(weather.slots) }
        : null,
    };
  },
});

const text = (max: number) => z.string().trim().min(1).max(max);
const serving = z.strictObject({
  productId: z.uuid().describe("Product id from read_race_nutrition."),
  count: z.number().int().min(1).max(40),
});

export const proposeRaceNutritionTool = defineTool({
  name: "propose_race_nutrition",
  description:
    "Propose a race nutrition plan to the athlete for one race, by race id. Stride stores it as a proposal: nothing changes until the athlete accepts it on the race's Nutrition tab. Give the targets you change (others stay as they are) and, optionally, the plan: which product to use for each role (gel, drink, compote, solid, caffeine), the start flask contents and pockets, per segment by its arrival waypoint id the exact items to take and a note. Segments you leave out keep Stride's allocation. The plan replaces the accepted one as a whole. Use only product ids and arrival waypoint ids from read_race_nutrition, keep caffeine for the night and within the caffeine maximum, and never set carbsPerHourG above validatedCarbsPerHourG when it is set. A new proposal replaces the one still waiting. Call read_race_nutrition first and quote its numbers in the summary.",
  class: "propose",
  dataClasses: ["training"],
  input: z.strictObject({
    raceId: z.string().min(1).max(64).describe("Race id."),
    title: text(120).describe("Short French title shown to the athlete."),
    summary: text(600)
      .nullable()
      .describe("One or two French sentences explaining the change."),
    targets: z
      .strictObject({
        carbsPerHourG: z.number().int().min(20).max(120).nullable(),
        waterMlPerHour: z.number().int().min(100).max(1500).nullable(),
        sodiumMgPerHour: z.number().int().min(0).max(2000).nullable(),
        caffeineMaxMg: z.number().int().min(0).max(600).nullable(),
        nightCaffeine: z.boolean().nullable(),
        flaskMl: z.number().int().min(100).max(1500).nullable(),
        flaskCount: z.number().int().min(0).max(6).nullable(),
      })
      .describe("Targets to change; null keeps the current value."),
    plan: z
      .strictObject({
        products: z
          .strictObject({
            gel: z.uuid().nullable(),
            drink: z.uuid().nullable(),
            compote: z.uuid().nullable(),
            solid: z.uuid().nullable(),
            caffeine: z.uuid().nullable(),
          })
          .describe("Product id per role, or null for Stride's choice."),
        startFlasks: z
          .array(z.enum(["drink", "water"]))
          .max(6)
          .nullable()
          .describe("Content of each flask at the start, or null."),
        startPocket: z
          .array(serving)
          .max(12)
          .nullable()
          .describe("Items in the pockets at the start, or null."),
        segments: z
          .array(
            z.strictObject({
              arrivalWaypointId: z
                .uuid()
                .describe("Arrival waypoint id of the segment."),
              items: z.array(serving).max(12),
              note: text(240).nullable(),
            }),
          )
          .max(40)
          .describe("Segments with exact items; others keep the allocation."),
      })
      .nullable()
      .describe("The nutrition plan, or null to change only targets."),
  }),
  output: z.strictObject({
    proposalId: z.uuid(),
    raceId: z.uuid(),
  }),
  run: async (context, input) => {
    if (!z.uuid().safeParse(input.raceId).success) throw toolError("not_found");
    const [data, products] = await Promise.all([
      readWorkspace(context, input.raceId),
      readNutritionProducts(context),
    ]);
    if (!data) throw toolError("not_found");
    const carbs = input.targets?.carbsPerHourG ?? null;
    if (carbs !== null && data.fuelingCapG !== null && carbs > data.fuelingCapG)
      throw toolError("validation_failed", {
        reason: "above_validated_intake",
        message: `The athlete has validated at most ${data.fuelingCapG} g of carbohydrate per hour in training. Propose ${data.fuelingCapG} g/h or less, and suggest a long run to test more.`,
        validatedCarbsPerHourG: data.fuelingCapG,
      });
    const productIds = new Set(products.map((product) => product.id));
    const plan = input.plan;
    const referenced = plan
      ? [
          ...Object.values(plan.products).filter(
            (id): id is string => id !== null,
          ),
          ...(plan.startPocket ?? []).map((item) => item.productId),
          ...plan.segments.flatMap((segment) =>
            segment.items.map((item) => item.productId),
          ),
        ]
      : [];
    const unknownProducts = referenced.filter((id) => !productIds.has(id));
    const views = planFor(data);
    const planned = views?.planned ?? null;
    const arrivals = new Set(
      planned?.simulation.segments.map((segment) => segment.toId) ?? [],
    );
    const ids = (plan?.segments ?? []).map(
      (segment) => segment.arrivalWaypointId,
    );
    const duplicated = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicated.length)
      throw toolError("validation_failed", {
        reason: "duplicate_segment",
        message: "Each arrival waypoint id may appear only once.",
        arrivalWaypointIds: [...new Set(duplicated)],
      });
    const unknownSegments = (plan?.segments ?? [])
      .map((segment) => segment.arrivalWaypointId)
      .filter((id) => !arrivals.has(id));
    if (unknownProducts.length || unknownSegments.length)
      throw toolError("validation_failed", {
        reason: unknownProducts.length ? "unknown_product" : "unknown_segment",
        productIds: unknownProducts,
        arrivalWaypointIds: unknownSegments,
      });
    if (plan && planned) {
      const caffeine = new Map(
        products.map((product) => [product.id, product.caffeineMg]),
      );
      const night = new Map(
        planned.simulation.segments.map((segment, index) => [
          segment.toId,
          segmentNight(planned, index),
        ]),
      );
      const caffeineOf = (items: { productId: string; count: number }[]) =>
        items.reduce(
          (sum, item) => sum + (caffeine.get(item.productId) ?? 0) * item.count,
          0,
        );
      const byDay = plan.segments
        .filter(
          (segment) =>
            caffeineOf(segment.items) > 0 &&
            !night.get(segment.arrivalWaypointId),
        )
        .map((segment) => segment.arrivalWaypointId);
      if (byDay.length)
        throw toolError("validation_failed", {
          reason: "caffeine_by_day",
          message:
            "Caffeinated products are allowed only in night segments (night true in read_race_nutrition).",
          arrivalWaypointIds: byDay,
        });
      const total =
        caffeineOf(plan.startPocket ?? []) +
        plan.segments.reduce(
          (sum, segment) => sum + caffeineOf(segment.items),
          0,
        );
      const maximum = input.targets.caffeineMaxMg ?? data.plan.caffeineMaxMg;
      if (total > maximum)
        throw toolError("validation_failed", {
          reason: "caffeine_above_maximum",
          message: `The plan holds ${total} mg of caffeine, above the ${maximum} mg maximum.`,
          caffeineMg: total,
          caffeineMaxMg: maximum,
        });
    }
    const targets = nutritionTargetsSchema.parse(
      Object.fromEntries(
        Object.entries(input.targets).filter(([, value]) => value !== null),
      ),
    );
    const parsed = nutritionProposalSchema.safeParse({
      ...(Object.keys(targets).length ? { targets } : {}),
      ...(plan
        ? {
            plan: {
              products: Object.fromEntries(
                Object.entries(plan.products).filter(
                  ([, value]) => value !== null,
                ),
              ),
              ...((plan.startFlasks || plan.startPocket) && {
                start: {
                  ...(plan.startFlasks && { flasks: plan.startFlasks }),
                  ...(plan.startPocket && { pocket: plan.startPocket }),
                },
              }),
              segments: Object.fromEntries(
                plan.segments.map((segment) => [
                  segment.arrivalWaypointId,
                  {
                    items: segment.items,
                    ...(segment.note !== null && { note: segment.note }),
                  },
                ]),
              ),
            },
          }
        : {}),
    });
    if (!parsed.success)
      throw toolError("validation_failed", { reason: "empty_proposal" });
    const proposalId = await submitRaceProposal(context, {
      raceId: input.raceId,
      kind: "nutrition",
      title: input.title,
      summary: input.summary,
      payload: parsed.data,
    });
    return { proposalId, raceId: input.raceId };
  },
});
