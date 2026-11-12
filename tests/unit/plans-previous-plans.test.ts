import { describe, expect, it } from "vitest";
import type { PlanState } from "@/features/plans/model/plan";
import {
  archivedState,
  planSeasons,
  seasonFor,
  withPreviousPlans,
  type ArchivedPlan,
} from "@/features/plans/view/seasons";
import {
  buildProgram,
  previousWeeks,
  type ProgramInput,
  type ProgramRace,
} from "@/features/plans/view/program";
import { planState } from "./plan-fixture";

const marathon: ProgramRace = {
  id: "race-a",
  name: "Marathon de Paris",
  date: "2026-11-08",
  priority: "A",
  targetSeconds: null,
  distanceKm: 42.195,
  elevationGainM: null,
  kind: "road",
};

const today = "2026-10-21";

function fromWeek(state: PlanState, weekStart: string): PlanState {
  return {
    ...state,
    plan: { ...state.plan, id: "plan-2", startsOn: weekStart },
    blocks: state.blocks.map((block) => ({
      ...block,
      blockKey: "b-specific-2",
      kind: "specific",
      name: "Spécifique",
      startsOn: weekStart,
    })),
    weeks: state.weeks
      .filter((week) => week.weekStart >= weekStart)
      .map((week) => ({ ...week, blockKey: "b-specific-2" })),
    sessions: state.sessions.filter(
      (session) => session.scheduledOn >= weekStart,
    ),
  };
}

const active = fromWeek(planState(), "2026-10-19");

function archived(overrides: Partial<ArchivedPlan> = {}): ArchivedPlan {
  return {
    planId: "p1",
    title: "Préparation marathon",
    primaryRaceId: "race-a",
    archivedOn: "2026-10-18",
    weekStarts: planState().weeks.map((week) => week.weekStart),
    ...overrides,
  };
}

function merged(plans: ArchivedPlan[], races: ProgramRace[] = [marathon]) {
  return withPreviousPlans({
    seasons: planSeasons({ state: active, races, today }),
    archived: plans,
    races,
    today,
  });
}

describe("seasons across plans", () => {
  it("gathers the weeks of a replaced plan into the season of its race", () => {
    const seasons = merged([archived()]);
    expect(seasons.map((season) => season.id)).toEqual(["race-a"]);
    expect(seasons[0]).toMatchObject({
      startsOn: "2026-10-12",
      endsOn: "2026-11-08",
      status: "current",
      currentWeek: 2,
      weekStarts: ["2026-10-12", "2026-10-19", "2026-10-26", "2026-11-02"],
      previousPlans: [{ planId: "p1", weekStarts: ["2026-10-12"] }],
    });
  });

  it("keeps the newer plan's week when both plans hold it", () => {
    const [season] = merged([archived({ archivedOn: "2026-10-21" })]);
    expect(season.weekStarts).toEqual([
      "2026-10-12",
      "2026-10-19",
      "2026-10-26",
      "2026-11-02",
    ]);
    expect(season.previousPlans).toEqual([
      { planId: "p1", weekStarts: ["2026-10-12"] },
    ]);
  });

  it("leaves out the weeks before the previous A race's week ends", () => {
    const earlier: ProgramRace = {
      ...marathon,
      id: "race-0",
      name: "Semi de Boulogne",
      date: "2026-09-27",
      distanceKm: 21.1,
    };
    const [season] = merged(
      [
        archived({
          weekStarts: ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"],
        }),
      ],
      [earlier, marathon],
    );
    expect(season.startsOn).toBe("2026-09-28");
    expect(season.previousPlans).toEqual([
      { planId: "p1", weekStarts: ["2026-09-28", "2026-10-05", "2026-10-12"] },
    ]);
  });

  it("keeps a plan for another race as its own past season", () => {
    const seasons = merged([
      archived({ primaryRaceId: null, title: "Reprise" }),
      archived({ planId: "p2", primaryRaceId: "race-b" }),
    ]);
    expect(seasons.map((season) => [season.id, season.previousPlans])).toEqual([
      ["race-a", []],
      ["plan-p1", []],
      ["plan-p2", []],
    ]);
  });

  it("gathers an older archived plan into a newer archived plan for the same race", () => {
    const seasons = withPreviousPlans({
      seasons: [],
      archived: [
        archived({
          planId: "p0",
          archivedOn: "2026-10-04",
          weekStarts: ["2026-09-21", "2026-09-28", "2026-10-05"],
        }),
        archived({
          weekStarts: ["2026-10-05", "2026-10-12", "2026-10-19"],
        }),
      ],
      races: [marathon],
      today,
    });
    expect(seasons).toHaveLength(1);
    expect(seasons[0]).toMatchObject({
      id: "plan-p1",
      startsOn: "2026-09-21",
      status: "past",
      replacedOn: "2026-10-18",
      weekStarts: ["2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12"],
      previousPlans: [
        { planId: "p0", weekStarts: ["2026-09-21", "2026-09-28"] },
      ],
    });
  });

  it("drops a replaced plan whose weeks the newer plan all holds", () => {
    const seasons = merged([archived({ weekStarts: ["2026-10-19"] })]);
    expect(seasons.map((season) => season.id)).toEqual(["race-a"]);
    expect(seasons[0].previousPlans).toEqual([
      { planId: "p1", weekStarts: [] },
    ]);
    expect(seasonFor(seasons, { season: "plan-p1" })?.id).toBe("race-a");
  });

  it("opens the archived season that took an older archived plan", () => {
    const seasons = withPreviousPlans({
      seasons: [],
      archived: [
        archived({
          planId: "p0",
          archivedOn: "2026-10-04",
          weekStarts: ["2026-09-28"],
        }),
        archived({ weekStarts: ["2026-10-05", "2026-10-12"] }),
      ],
      races: [marathon],
      today,
    });
    expect(seasonFor(seasons, { season: "plan-p0" })?.id).toBe("plan-p1");
    expect(seasonFor(seasons, { season: "plan-p9" })).toBeNull();
  });

  it("opens the season that took the weeks of an old archived link", () => {
    const seasons = merged([archived()]);
    expect(seasonFor(seasons, { season: "plan-p1" })?.id).toBe("race-a");
    expect(seasonFor(seasons, { week: "2026-10-12" })?.id).toBe("race-a");
  });
});

describe("programs across plans", () => {
  const input: ProgramInput = {
    state: active,
    today,
    summary: null,
    matches: [],
    proposalKeys: [],
    races: [marathon],
  };
  const previous = previousWeeks(
    {
      ...input,
      state: archivedState(planState(), "2026-10-18"),
      matches: [
        {
          sessionKey: "s-2026-10-13-1",
          status: "completed",
          compliance: { duration: 1, distance: null },
        },
      ],
    },
    "p1",
    ["2026-10-12"],
  );

  it("builds the previous plan's weeks read-only", () => {
    expect(
      previous.map((week) => [week.weekStart, week.status, week.planId]),
    ).toEqual([["2026-10-12", "past", "p1"]]);
    expect(previous[0].days[1]).toMatchObject({
      date: "2026-10-13",
      state: "done",
      isToday: false,
    });
  });

  it("numbers and charts the whole season", () => {
    const [season] = buildProgram(
      input,
      merged([archived()]),
      previous,
    ).seasons;
    expect(
      season.weeks.map((week) => [week.weekStart, week.number, week.planId]),
    ).toEqual([
      ["2026-10-12", 1, "p1"],
      ["2026-10-19", 2, null],
      ["2026-10-26", 3, null],
      ["2026-11-02", 4, null],
    ]);
    expect(season.eyebrow).toBe("Semaine 2 sur 4 · Spécifique");
    expect(
      season.bands.map((band) => [band.name, band.start, band.span]),
    ).toEqual([
      ["Base", 0, 1],
      ["Spécifique", 1, 3],
    ]);
  });

  it("starts a new band when the next plan reuses a block key", () => {
    const sameKey = previous.map((week) => ({
      ...week,
      block: { key: "b-specific-2", kind: "specific" as const },
    }));
    const [season] = buildProgram(input, merged([archived()]), sameKey).seasons;
    expect(season.bands.map((band) => [band.start, band.span])).toEqual([
      [0, 1],
      [1, 3],
    ]);
  });
});
