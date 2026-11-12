import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCourse, type RawPoint } from "../../src/features/races/course";
import { defaultPlan, type StoredCourse } from "../../src/features/races/race";
import type { Waypoint } from "../../src/features/races/waypoints";
import type { OnboardingContext } from "../../src/server/onboarding/context";

vi.mock("server-only", () => ({}));

const sources = vi.hoisted(() => ({
  readWorkspace: vi.fn(),
  readNutritionProducts: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock("../../src/server/races/races", () => ({
  readWorkspace: sources.readWorkspace,
}));
vi.mock("../../src/server/fueling/products", () => ({
  readNutritionProducts: sources.readNutritionProducts,
}));
vi.mock("../../src/server/races/proposals", () => ({
  readReadyRaceProposals: vi.fn(async () => []),
}));

import { proposeRaceStrategyTool } from "../../src/server/coaching/tools/race-proposal";
import { proposeRaceNutritionTool } from "../../src/server/coaching/tools/race-nutrition";

const raceId = "a0000000-0000-4000-8000-0000000000c1";
const ids = {
  start: "a0000000-0000-4000-8000-000000000001",
  aid: "a0000000-0000-4000-8000-000000000002",
  water: "a0000000-0000-4000-8000-000000000003",
  finish: "a0000000-0000-4000-8000-000000000004",
};
const caffeinated = "a0000000-0000-4000-8000-0000000000f1";

function waypoint(id: string, kind: Waypoint["kind"], distanceM: number) {
  return {
    id,
    kind,
    name: kind,
    distanceM,
    cutoffMinutes: null,
    services: ["water"],
    watchLabel: null,
    alertDistanceM: 500,
    voiceNote: null,
    todo: null,
    nutritionNote: null,
    source: "athlete",
    needsReview: false,
    revision: 1,
  } satisfies Waypoint;
}

const points: RawPoint[] = Array.from({ length: 4001 }, (_, index) => ({
  lat: 48.8 + (index * 10) / 111_195,
  lon: 2.3,
  ele: 100 + 30 * Math.sin((index * 10) / 900),
}));
const course = buildCourse(points)!;
const stored: StoredCourse = {
  ...course,
  source: "gpx",
  fileName: "trail.gpx",
  sourceActivityId: null,
  timeZone: "Europe/Paris",
  importedAt: "2026-10-11T00:00:00Z",
};

const workspace = {
  race: {
    id: raceId,
    name: "Trail d’hiver",
    kind: "trail",
    date: "2027-01-15",
    distanceKm: 40,
    elevationGainM: null,
    priority: "A",
    targetSeconds: 5 * 3600,
    revision: 1,
  },
  plan: { ...defaultPlan, startMinutes: 15 * 60, caffeineMaxMg: 150 },
  course: stored,
  waypoints: [
    waypoint(ids.start, "start", 0),
    waypoint(ids.aid, "aid", 15_000),
    waypoint(ids.water, "water", 25_000),
    waypoint(ids.finish, "finish", course.distanceM),
  ],
  checklist: [],
  strategy: null,
  nutritionPlan: null,
  dropBag: null,
};

const context = {
  userId: "a0000000-0000-4000-8000-00000000000a",
  client: { rpc: sources.rpc },
} as unknown as OnboardingContext;

function nutritionInput(
  segments: { arrivalWaypointId: string; count: number }[],
) {
  return {
    raceId,
    title: "Nutrition",
    summary: null,
    targets: {
      carbsPerHourG: null,
      waterMlPerHour: null,
      sodiumMgPerHour: null,
      caffeineMaxMg: null,
      nightCaffeine: null,
      flaskMl: null,
      flaskCount: null,
    },
    plan: {
      products: {
        gel: null,
        drink: null,
        compote: null,
        solid: null,
        caffeine: null,
      },
      startFlasks: null,
      startPocket: null,
      segments: segments.map((segment) => ({
        arrivalWaypointId: segment.arrivalWaypointId,
        items: [{ productId: caffeinated, count: segment.count }],
        note: null,
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  sources.readWorkspace.mockResolvedValue(workspace);
  sources.readNutritionProducts.mockResolvedValue([
    {
      id: caffeinated,
      catalogueKey: null,
      name: "Gel caféiné",
      brand: null,
      kind: "gel",
      carbsG: 25,
      sodiumMg: 50,
      caffeineMg: 100,
      servingLabel: null,
      servingMl: null,
      tested: true,
      testedNote: null,
      revision: 1,
    },
  ]);
  sources.rpc.mockResolvedValue({
    data: "a0000000-0000-4000-8000-0000000000e1",
    error: null,
  });
});

describe("race proposal tools", () => {
  it("refuses a strategy that repeats a segment", async () => {
    await expect(
      proposeRaceStrategyTool.run!(context, {
        raceId,
        title: "Stratégie",
        summary: null,
        consignes: [],
        segments: [ids.aid, ids.aid].map((id) => ({
          arrivalWaypointId: id,
          note: "Relance.",
          paceFactor: null,
        })),
      }),
    ).rejects.toMatchObject({
      code: "validation_failed",
      details: { reason: "duplicate_segment" },
    });
    expect(sources.rpc).not.toHaveBeenCalled();
  });

  it("refuses a nutrition plan that repeats a segment", async () => {
    await expect(
      proposeRaceNutritionTool.run!(
        context,
        nutritionInput([
          { arrivalWaypointId: ids.finish, count: 1 },
          { arrivalWaypointId: ids.finish, count: 1 },
        ]),
      ),
    ).rejects.toMatchObject({ details: { reason: "duplicate_segment" } });
  });

  it("keeps caffeine out of day segments", async () => {
    await expect(
      proposeRaceNutritionTool.run!(
        context,
        nutritionInput([{ arrivalWaypointId: ids.aid, count: 1 }]),
      ),
    ).rejects.toMatchObject({
      details: { reason: "caffeine_by_day", arrivalWaypointIds: [ids.aid] },
    });
  });

  it("keeps caffeine within the maximum", async () => {
    await expect(
      proposeRaceNutritionTool.run!(
        context,
        nutritionInput([{ arrivalWaypointId: ids.finish, count: 2 }]),
      ),
    ).rejects.toMatchObject({
      details: { reason: "caffeine_above_maximum", caffeineMg: 200 },
    });
  });

  it("never proposes more carbohydrate than validated in training", async () => {
    sources.readWorkspace.mockResolvedValue({ ...workspace, fuelingCapG: 60 });
    const input = nutritionInput([{ arrivalWaypointId: ids.finish, count: 1 }]);
    await expect(
      proposeRaceNutritionTool.run!(context, {
        ...input,
        targets: { ...input.targets, carbsPerHourG: 70 },
      }),
    ).rejects.toMatchObject({
      details: {
        reason: "above_validated_intake",
        validatedCarbsPerHourG: 60,
      },
    });
  });

  it("stores caffeine at night within the maximum", async () => {
    await expect(
      proposeRaceNutritionTool.run!(
        context,
        nutritionInput([{ arrivalWaypointId: ids.finish, count: 1 }]),
      ),
    ).resolves.toMatchObject({ raceId });
    expect(sources.rpc).toHaveBeenCalledWith(
      "submit_race_proposal",
      expect.objectContaining({ p_kind: "nutrition" }),
    );
  });
});
