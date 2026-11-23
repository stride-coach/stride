import { beforeEach, describe, expect, it, vi } from "vitest";
import type { DeterministicPlanInput } from "../../src/features/plans/detailing/build";
import type { PlanState } from "../../src/features/plans/model/plan";
import { easyRun, planState } from "./plan-fixture";

vi.mock("server-only", () => ({}));

const readActivePlan = vi.hoisted(() => vi.fn());
const readSessionMatches = vi.hoisted(() => vi.fn());
const loadPlanningInput = vi.hoisted(() => vi.fn());

vi.mock("../../src/server/plans/stored", () => ({ readActivePlan }));
vi.mock("../../src/server/plans/matches", () => ({ readSessionMatches }));
vi.mock("../../src/server/plans/draft", () => ({ loadPlanningInput }));
vi.mock("../../src/features/plans/constraints", () => ({
  localToday: () => "2026-10-20",
}));

import { loadSessionMoveTargets } from "../../src/server/plans/move-targets";

const context = { userId: "a0000000-0000-4000-8000-00000000000a" } as never;
const stored = (state: PlanState) => ({
  planId: "plan-1",
  status: "active",
  activeVersion: 4,
  version: 4,
  versionSummary: null,
  state,
});

const input = (availableWeekdays: number[]): DeterministicPlanInput => ({
  today: "2026-10-20",
  races: [],
  activities: [],
  availability: {
    availableWeekdays,
    weekdaySessionMinutes: null,
    longRunDay: "sunday",
    trainingAccess: [],
  },
  constraints: {
    timeZone: "Europe/Paris",
    maxWeeklyMinutes: null,
    unavailablePeriods: [],
  },
  targets: {
    flatLapThresholdPace: null,
    garminLactateThreshold: null,
    bestEfforts: [],
    vo2Max: null,
    garminZones: null,
    strideZones: null,
  },
  health: null,
});

describe("loading move targets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readActivePlan.mockResolvedValue(stored(planState()));
    readSessionMatches.mockResolvedValue([]);
    loadPlanningInput.mockResolvedValue({
      today: "2026-10-20",
      input: input([1, 2, 4, 5, 6, 7]),
    });
  });

  it("returns nothing without an active plan", async () => {
    readActivePlan.mockResolvedValue(null);
    expect(await loadSessionMoveTargets(context, "s-2026-10-22-1")).toEqual([]);
  });

  it("returns nothing for past, matched, race and unknown sessions", async () => {
    const state = planState();
    state.sessions.push({
      ...easyRun(0),
      kind: "race",
      title: "Course",
      sessionKey: "s-2026-11-01-race",
      scheduledOn: "2026-11-01",
    });
    readActivePlan.mockResolvedValue(stored(state));
    readSessionMatches.mockResolvedValue([
      { sessionKey: "s-2026-10-20-1", status: "completed" },
    ]);
    for (const key of [
      "s-2026-10-13-1",
      "s-2026-10-20-1",
      "s-2026-11-01-race",
      "unknown",
    ])
      expect(await loadSessionMoveTargets(context, key)).toEqual([]);
    expect(loadPlanningInput).not.toHaveBeenCalled();
  });

  it("lists the other days of the week and flags the unavailable one", async () => {
    const days = await loadSessionMoveTargets(context, "s-2026-10-22-1");
    expect(days.map((day) => day.date)).toEqual([
      "2026-10-20",
      "2026-10-21",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(days.filter((day) => day.block !== null)).toEqual([
      expect.objectContaining({ date: "2026-10-21", block: "unavailable" }),
    ]);
  });
});
