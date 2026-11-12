import { describe, expect, it } from "vitest";
import {
  calendarMonth,
  parseCalendarMonth,
} from "@/features/plans/view/calendar";
import { buildProgram, type ProgramInput } from "@/features/plans/view/program";
import { planState } from "./plan-fixture";

function input(overrides: Partial<ProgramInput> = {}): ProgramInput {
  return {
    state: planState(),
    today: "2026-10-21",
    summary: null,
    matches: [],
    proposalKeys: [],
    races: [
      {
        id: "race-a",
        name: "Marathon de Paris",
        date: "2026-11-08",
        priority: "A",
        targetSeconds: null,
        distanceKm: null,
        elevationGainM: null,
        kind: "road",
      },
      {
        id: "race-c",
        name: "10K Vincennes",
        date: "2026-11-01",
        priority: "C",
        targetSeconds: null,
        distanceKm: 10,
        elevationGainM: null,
        kind: "road",
      },
    ],
    ...overrides,
  };
}

function month(value: string | null, overrides: Partial<ProgramInput> = {}) {
  const programInput = input(overrides);
  return calendarMonth({
    input: programInput,
    seasons: buildProgram(programInput).seasons,
    month: value,
  });
}

function day(calendar: ReturnType<typeof month>, date: string) {
  return calendar?.weeks
    .flatMap((week) => week.days)
    .find((item) => item.date === date);
}

describe("calendar month parameter", () => {
  it("accepts a year and month", () => {
    expect(parseCalendarMonth("2026-10")).toBe("2026-10");
  });

  it("rejects malformed values", () => {
    expect(parseCalendarMonth("2026-13")).toBeNull();
    expect(parseCalendarMonth("2026-1")).toBeNull();
    expect(parseCalendarMonth("octobre")).toBeNull();
    expect(parseCalendarMonth(null)).toBeNull();
  });
});

describe("calendar month", () => {
  it("opens on the current month as a Monday-first grid", () => {
    const calendar = month(null);
    expect(calendar).toMatchObject({
      month: "2026-10",
      title: "Octobre 2026",
      monthName: "Octobre",
      isCurrent: true,
    });
    expect(calendar?.weeks).toHaveLength(5);
    expect(calendar?.weeks[0].days[0].date).toBe("2026-09-28");
    expect(calendar?.weeks.at(-1)?.days.at(-1)?.date).toBe("2026-11-01");
  });

  it("marks days outside the month and outside the plan", () => {
    const calendar = month("2026-10");
    expect(day(calendar, "2026-09-30")).toMatchObject({
      inMonth: false,
      inPlan: false,
      rest: false,
      sessions: [],
    });
    expect(day(calendar, "2026-11-01")).toMatchObject({
      inMonth: false,
      inPlan: true,
    });
  });

  it("places sessions, rest days and today", () => {
    const calendar = month("2026-10");
    expect(day(calendar, "2026-10-15")?.sessions).toMatchObject([
      { sessionKey: "s-2026-10-15-1", family: "threshold" },
    ]);
    expect(day(calendar, "2026-10-14")).toMatchObject({
      inPlan: true,
      rest: true,
      sessions: [],
    });
    expect(day(calendar, "2026-10-21")?.isToday).toBe(true);
    expect(day(calendar, "2026-10-20")?.isToday).toBe(false);
  });

  it("names the blocks and season weeks shown", () => {
    expect(month("2026-10")?.subtitle).toBe("Base · semaines 1 à 3");
    expect(month("2026-11")?.subtitle).toBe("Base · semaines 3 à 4");
  });

  it("links months inside the plan only", () => {
    expect(month("2026-10")).toMatchObject({ previous: null, next: "2026-11" });
    expect(month("2026-11")).toMatchObject({
      previous: "2026-10",
      next: null,
      isCurrent: false,
    });
  });

  it("clamps a month outside the plan to its nearest end", () => {
    expect(month("2026-01")?.month).toBe("2026-10");
    expect(month("2027-05")?.month).toBe("2026-11");
  });

  it("sums the month's running sessions with what was done", () => {
    const calendar = month("2026-10", {
      matches: [
        {
          sessionKey: "s-2026-10-13-1",
          status: "completed",
          compliance: { duration: 1, distance: null },
        },
      ],
    });
    expect(calendar?.summary).toEqual({
      planned: { duration: "4h45", distance: null },
      done: { duration: "45’", distance: null },
      sessions: 5,
      quality: 2,
      lightWeeks: [],
    });
  });

  it("keeps one intensity zone per session for the dots and legend", () => {
    const calendar = month("2026-10");
    expect(day(calendar, "2026-10-15")?.sessions[0].zone).toBe(4);
    expect(calendar?.legend).toEqual([2, 4]);
  });

  it("lists the light weeks of the month", () => {
    const state = planState();
    const calendar = month("2026-10", {
      state: {
        ...state,
        weeks: state.weeks.map((week, index) =>
          index === 1 ? { ...week, weekType: "recovery" } : week,
        ),
      },
    });
    expect(calendar?.summary.lightWeeks).toEqual([
      { label: "S2", range: "19–25 oct." },
    ]);
  });

  it("lists the races still to come", () => {
    expect(month("2026-10")?.upcoming).toEqual([
      {
        raceId: "race-c",
        name: "10K Vincennes",
        when: "1 nov.",
        detail: "course C",
      },
      {
        raceId: "race-a",
        name: "Marathon de Paris",
        when: "8 nov.",
        detail: "objectif",
      },
    ]);
  });

  it("has no calendar without plan weeks", () => {
    const state = planState();
    const programInput = input({ state: { ...state, weeks: [] } });
    expect(
      calendarMonth({ input: programInput, seasons: [], month: null }),
    ).toBeNull();
  });
});
