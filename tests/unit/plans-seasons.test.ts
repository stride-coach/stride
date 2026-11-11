import { describe, expect, it } from "vitest";
import { shellSeasons } from "@/features/app-shell/shell";
import { addDays } from "@/features/plans/model/dates";
import type { PlanState } from "@/features/plans/model/plan";
import {
  defaultSeason,
  planSeasons,
  seasonFor,
  seasonHref,
  type SeasonRace,
} from "@/features/plans/view/seasons";
import { planState } from "./plan-fixture";

function plan(weekCount: number, primaryRaceId: string | null): PlanState {
  const state = planState();
  return {
    ...state,
    plan: { ...state.plan, primaryRaceId },
    weeks: Array.from({ length: weekCount }, (_, index) => {
      const weekStart = addDays("2026-10-12", index * 7);
      return { ...state.weeks[0], weekKey: `w-${weekStart}`, weekStart };
    }),
  };
}

function race(
  id: string,
  date: string | null,
  overrides: Partial<SeasonRace> = {},
): SeasonRace {
  return {
    id,
    name: id,
    date,
    priority: "A",
    distanceKm: 10,
    elevationGainM: null,
    kind: "road",
    ...overrides,
  };
}

const first = race("a1", "2026-10-25");
const second = race("a2", "2026-12-06", { distanceKm: 42.195 });
const today = "2026-11-11";

function spans(state: PlanState, races: SeasonRace[], day = today) {
  return planSeasons({ state, races, today: day }).map((season) => [
    season.id,
    season.startsOn,
    season.endsOn,
    season.status,
  ]);
}

describe("plan seasons", () => {
  it("gives each A race a season that ends with its recovery", () => {
    expect(spans(plan(8, "a2"), [second, first])).toEqual([
      ["a1", "2026-10-12", "2026-11-08", "past"],
      ["a2", "2026-11-09", "2026-12-06", "current"],
    ]);
    const [, current] = planSeasons({
      state: plan(8, "a2"),
      races: [first, second],
      today,
    });
    expect(current).toMatchObject({
      raceId: "a2",
      name: "a2",
      letter: "A",
      raceDate: "2026-12-06",
      currentWeek: 1,
      weekStarts: ["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"],
    });
  });

  it("scales the recovery with the effort of the race", () => {
    const trail = race("a1", "2026-10-25", {
      distanceKm: 45,
      elevationGainM: 2_000,
      kind: "trail",
    });
    expect(spans(plan(12, "a1"), [trail])).toEqual([
      ["a1", "2026-10-12", "2026-12-06", "current"],
      ["open", "2026-12-07", "2027-01-03", "future"],
    ]);
  });

  it("groups the weeks after the last recovery outside an objective", () => {
    const seasons = planSeasons({
      state: plan(8, "a1"),
      races: [first],
      today,
    });
    expect(seasons[1]).toMatchObject({
      id: "open",
      raceId: null,
      name: "Hors objectif",
      letter: null,
      raceDate: null,
      startsOn: "2026-11-09",
      endsOn: "2026-12-06",
      status: "current",
    });
  });

  it("lets the primary race define the season when no race is A", () => {
    const primary = race("b1", "2026-10-25", { priority: "B" });
    expect(spans(plan(4, "b1"), [primary])).toEqual([
      ["b1", "2026-10-12", "2026-11-08", "past"],
    ]);
    expect(
      planSeasons({ state: plan(4, "b1"), races: [primary], today })[0].letter,
    ).toBe("B");
  });

  it("keeps the whole plan outside an objective without a primary race", () => {
    const other = race("c1", "2026-10-25", { priority: "C" });
    expect(spans(plan(4, null), [other])).toEqual([
      ["open", "2026-10-12", "2026-11-08", "past"],
    ]);
    expect(planSeasons({ state: plan(0, null), races: [], today })).toEqual([]);
  });

  it("ends the season on the race week when the distance is unknown", () => {
    const unknown = race("a1", "2026-10-25", { distanceKm: null });
    expect(spans(plan(4, "a1"), [unknown])).toEqual([
      ["a1", "2026-10-12", "2026-10-25", "past"],
      ["open", "2026-10-26", "2026-11-08", "past"],
    ]);
  });

  it("keeps B and C races inside the season that contains their date", () => {
    const tuneUp = race("c1", "2026-11-22", { priority: "C" });
    const undated = race("b2", null, { priority: "B" });
    const seasons = planSeasons({
      state: plan(8, "a2"),
      races: [first, second, tuneUp, undated],
      today,
    });
    expect(seasons.map((season) => [season.id, season.raceIds])).toEqual([
      ["a1", ["a1"]],
      ["a2", ["c1", "a2"]],
    ]);
  });

  it("starts the next season on the week of an A race inside a recovery", () => {
    const close = race("a2", "2026-11-08", { distanceKm: 42.195 });
    const seasons = planSeasons({
      state: plan(8, "a2"),
      races: [first, close],
      today,
    });
    expect(
      seasons.map((season) => [season.id, season.startsOn, season.endsOn]),
    ).toEqual([
      ["a1", "2026-10-12", "2026-11-01"],
      ["a2", "2026-11-02", "2026-12-06"],
    ]);
    expect(seasons.map((season) => season.raceIds)).toEqual([["a1"], ["a2"]]);
    const sameWeek = race("a2", "2026-10-24");
    expect(spans(plan(4, "a2"), [first, sameWeek])).toEqual([
      ["a2", "2026-10-12", "2026-11-08", "past"],
    ]);
  });

  it("reads the status from today", () => {
    const state = plan(8, "a2");
    const statuses = (day: string) =>
      planSeasons({ state, races: [first, second], today: day }).map(
        (season) => season.status,
      );
    expect(statuses("2026-10-01")).toEqual(["future", "future"]);
    expect(statuses("2026-11-08")).toEqual(["current", "future"]);
    expect(statuses("2026-11-09")).toEqual(["past", "current"]);
    expect(statuses("2027-01-01")).toEqual(["past", "past"]);
  });
});

describe("season selection", () => {
  const seasons = planSeasons({
    state: plan(8, "a2"),
    races: [first, second, race("c1", "2026-10-18", { priority: "C" })],
    today,
  });
  const pick = (query: Parameters<typeof seasonFor>[1]) =>
    seasonFor(seasons, query)?.id;

  it("defaults to the current season, then the next, then the last", () => {
    expect(pick({})).toBe("a2");
    const before = planSeasons({
      state: plan(8, "a2"),
      races: [first, second],
      today: "2026-10-01",
    });
    expect(defaultSeason(before)?.id).toBe("a1");
    const after = planSeasons({
      state: plan(8, "a2"),
      races: [first, second],
      today: "2027-01-01",
    });
    expect(defaultSeason(after)?.id).toBe("a2");
    expect(defaultSeason([])).toBeNull();
  });

  it("opens the requested season and ignores an unknown one", () => {
    expect(pick({ season: "a1" })).toBe("a1");
    expect(pick({ season: "missing" })).toBe("a2");
    expect(pick({ season: "a1", week: "2026-11-16" })).toBe("a1");
  });

  it("opens the season that contains an old race link", () => {
    expect(pick({ race: "a1" })).toBe("a1");
    expect(pick({ race: "c1" })).toBe("a1");
    expect(pick({ race: "missing" })).toBe("a2");
  });

  it("prefers the season of a race over a season that contains its date", () => {
    const [early, late] = seasons;
    const overlapping = [{ ...early, raceIds: ["a1", "a2"] }, late];
    expect(seasonFor(overlapping, { race: "a2" })?.id).toBe("a2");
  });

  it("opens the season that contains the week or the session", () => {
    expect(pick({ week: "2026-10-19" })).toBe("a1");
    expect(pick({ session: "2026-10-22" })).toBe("a1");
    expect(pick({ week: "2025-01-06" })).toBe("a2");
  });

  it("links the default season without a parameter", () => {
    expect(seasonHref(seasons, "a2")).toBe("/plan");
    expect(seasonHref(seasons, "a1")).toBe("/plan?season=a1");
  });
});

describe("shell seasons", () => {
  it("describes each season for the switcher", () => {
    const state = plan(12, "a2");
    const seasons = planSeasons({ state, races: [first, second], today });
    expect(shellSeasons(seasons, today)).toEqual([
      {
        id: "a1",
        raceIds: ["a1"],
        startsOn: "2026-10-12",
        endsOn: "2026-11-08",
        status: "past",
        letter: "A",
        name: "a1",
        href: "/plan?season=a1",
        dates: "12 oct. → 8 nov. · course le 25 oct.",
        progress: "Terminée",
        countdown: null,
      },
      {
        id: "a2",
        raceIds: ["a2"],
        startsOn: "2026-11-09",
        endsOn: "2027-01-03",
        status: "current",
        letter: "A",
        name: "a2",
        href: "/plan",
        dates: "9 nov. → 3 janv. · course le 6 déc.",
        progress: "S1 / 8",
        countdown: "J-25",
      },
    ]);
  });

  it("counts the weeks of a season that is not running", () => {
    const seasons = planSeasons({
      state: plan(8, "a1"),
      races: [first],
      today: "2026-10-01",
    });
    expect(
      shellSeasons(seasons, "2026-10-01").map((season) => [
        season.name,
        season.dates,
        season.progress,
        season.countdown,
      ]),
    ).toEqual([
      ["a1", "12 oct. → 8 nov. · course le 25 oct.", "4 sem.", "J-24"],
      ["Hors objectif", "9 nov. → 6 déc. · aucune course A", "4 sem.", null],
    ]);
  });
});
