import { describe, expect, it } from "vitest";
import type { PlanState } from "@/features/plans/model/plan";
import {
  buildProgram,
  chartDescription,
  programNavigation,
  sessionFamilyOf,
  weekSplit,
  withRaceValues,
  type ProgramInput,
} from "@/features/plans/view/program";
import {
  easyRun,
  planState,
  supportSession,
  thresholdSession,
} from "./plan-fixture";

function input(overrides: Partial<ProgramInput> = {}): ProgramInput {
  return {
    state: planState(),
    today: "2026-10-21",
    summary: "Quatre semaines de base.",
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
    ],
    ...overrides,
  };
}

function withRace(state: PlanState): PlanState {
  return {
    ...state,
    weeks: state.weeks.map((week, index) =>
      index === 1 ? { ...week, weekType: "recovery" } : week,
    ),
    sessions: [
      ...state.sessions,
      {
        ...easyRun(180),
        kind: "race",
        title: "Marathon de Paris",
        sessionKey: "s-2026-11-08-1",
        scheduledOn: "2026-11-08",
        targets: {
          durationSeconds: 10_800,
          distanceMeters: 42_195,
          elevationGainMeters: null,
        },
      },
    ],
  };
}

describe("program overview", () => {
  it("builds the primary program header from the stored plan", () => {
    const [program] = buildProgram(input()).seasons;
    expect(program).toMatchObject({
      id: "race-a",
      raceId: "race-a",
      status: "current",
      href: "/plan",
      eyebrow: "Semaine 2 sur 4 · Base",
      title: "J-18 · Marathon de Paris",
      summary: "Quatre semaines de base.",
      next: null,
      defaultWeekKey: "w-2026-10-19",
    });
    expect(program.kpis.map((kpi) => [kpi.label, kpi.value])).toEqual([
      ["Course", "8 nov."],
      ["Total prévu", "5 h"],
      ["Plus longue sortie", "1h30"],
      ["Semaine de pic", "3h10"],
    ]);
    expect(program.bands).toEqual([
      {
        key: "b-base-1",
        name: "Base",
        start: 0,
        span: 4,
        tone: "dim",
        current: true,
      },
    ]);
  });

  it("labels weeks from their type and a race week from the race", () => {
    const program = buildProgram(input({ state: withRace(planState()) }));
    expect(
      program.weeks.map((week) => [week.number, week.label, week.labelTone]),
    ).toEqual([
      [1, "Construction", "muted"],
      [2, "Allégée", "provider"],
      [3, "Construction", "muted"],
      [4, "Marathon de Paris · objectif", "accent"],
    ]);
    expect(program.weeks[3].race).toEqual({ letter: "A", primary: true });
    expect(program.weeks[1].isLight).toBe(true);
  });

  it("gives each day the family of its main session and rests elsewhere", () => {
    const [first] = buildProgram(input()).weeks;
    expect(first.families).toEqual([
      "rest",
      "easy",
      "rest",
      "threshold",
      "rest",
      "rest",
      "rest",
    ]);
    expect(first.totals.durationSeconds).toBe(5_700);
    expect(first.easySeconds + first.qualitySeconds).toBe(6_000);
    expect(first.qualitySeconds).toBe(4 * 360);
  });

  it("reports the planned running easy share against the 80/20 target", () => {
    const [first] = buildProgram(input()).weeks;
    expect(first.easyPct).toBe(76);
    expect(weekSplit(first)).toEqual({
      easyPct: 76,
      easySeconds: 4_560,
      qualitySeconds: 1_440,
      met: false,
    });
    expect(
      weekSplit({ easySeconds: 4_920, qualitySeconds: 1_080, easyPct: 82 }),
    ).toMatchObject({ met: true });
    expect(
      weekSplit({ easySeconds: 0, qualitySeconds: 0, easyPct: 100 }),
    ).toBeNull();
  });

  it("derives past completion and current progress from matching", () => {
    const program = buildProgram(
      input({
        matches: [
          {
            sessionKey: "s-2026-10-13-1",
            status: "completed",
            compliance: { duration: 0.98, distance: null },
          },
          {
            sessionKey: "s-2026-10-20-1",
            status: "partial",
            compliance: { duration: 0.6, distance: null },
          },
        ],
      }),
    );
    const [past, current, future] = program.weeks;
    expect(past.status).toBe("past");
    expect(past.completionPct).toBe(50);
    expect(current.status).toBe("current");
    expect(current.completionPct).toBeNull();
    expect(future.status).toBe("future");
    expect(program.currentWeekKey).toBe(current.weekKey);
    expect(current.done.durationSeconds).toBe(1_800);
    const tuesday = current.days[1];
    expect(tuesday).toMatchObject({
      state: "partial",
      compliancePct: 60,
      title: "Footing",
      summary: "50’",
    });
    expect(current.days[0]).toMatchObject({ family: "rest", state: "done" });
    expect(current.days[2]).toMatchObject({ isToday: true, state: null });
    expect(past.days[1]).toMatchObject({ state: "done", compliancePct: 98 });
    expect(past.days[3]).toMatchObject({ state: "missed" });
  });

  it("marks sessions targeted by a ready proposal", () => {
    const program = buildProgram(
      input({ proposalKeys: ["session:s-2026-10-22-1"] }),
    );
    const current = program.weeks[1];
    expect(current.proposed).toBe(true);
    expect(current.days[3].state).toBe("proposed");
    expect(program.weeks[0].proposed).toBe(false);
  });

  it("groups weeks by block with totals", () => {
    const [block] = buildProgram(input()).blocks;
    expect(block).toMatchObject({
      index: 1,
      name: "Base",
      span: "12 oct. → 8 nov. · 4 semaines",
      months: "oct.–nov.",
      current: true,
    });
    expect(block.totals.durationSeconds).toBe(5_700 + 11_400);
  });

  it("falls back to the plan title without a primary race", () => {
    const { seasons } = buildProgram(input({ races: [] }));
    expect(seasons).toHaveLength(1);
    expect(seasons[0]).toMatchObject({
      id: "open",
      raceId: null,
      letter: null,
      title: "Marathon de Paris",
    });
  });

  it("uses the target time in the title when the race has one", () => {
    const [program] = buildProgram(
      input({
        races: [
          {
            id: "race-a",
            name: "Marathon de Paris",
            date: "2026-11-08",
            priority: "A",
            targetSeconds: 11_400,
            distanceKm: null,
            elevationGainM: null,
            kind: "road",
          },
        ],
      }),
    ).seasons;
    expect(program.title).toBe("Marathon de Paris · cible 3:10:00");
  });

  it("describes the volume chart", () => {
    const { weeks } = buildProgram(input());
    expect(chartDescription(weeks)).toBe(
      "Volume hebdomadaire prévu sur 4 semaines, de 0’ à 3h15",
    );
  });
});

function withNestedRace(state: PlanState): PlanState {
  return {
    ...state,
    plan: {
      ...state.plan,
      raceRoles: [
        { raceId: "race-a", role: "primary" },
        { raceId: "race-c", role: "secondary" },
      ],
    },
    blocks: [
      { ...state.blocks[0], endsOn: "2026-10-25" },
      {
        blockKey: "b-specific-1",
        kind: "specific",
        name: "Vitesse",
        startsOn: "2026-10-26",
        endsOn: "2026-11-08",
        objective: "La qualité devient de la vitesse.",
        raceId: "race-c",
      },
    ],
    weeks: state.weeks.map((week, index) =>
      index >= 2 ? { ...week, blockKey: "b-specific-1" } : week,
    ),
    sessions: [
      ...state.sessions,
      {
        ...thresholdSession(),
        sessionKey: "s-2026-10-28-1",
        scheduledOn: "2026-10-28",
      },
    ],
  };
}

const nestedRaces: ProgramInput["races"] = [
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
    targetSeconds: 2_670,
    distanceKm: null,
    elevationGainM: null,
    kind: "road",
  },
];

function twoSeasons(today: string): ProgramInput {
  const state = planState();
  const weekStarts = ["2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"];
  return input({
    today,
    summary: "Deux saisons.",
    state: {
      ...state,
      plan: { ...state.plan, endsOn: "2026-12-06", primaryRaceId: "race-b" },
      blocks: [{ ...state.blocks[0], endsOn: "2026-12-06" }],
      weeks: [
        ...state.weeks,
        ...weekStarts.map((weekStart) => ({
          ...state.weeks[0],
          weekKey: `w-${weekStart}`,
          weekStart,
        })),
      ],
    },
    matches: ["s-2026-10-13-1", "s-2026-10-20-1"].map((sessionKey) => ({
      sessionKey,
      status: "completed" as const,
      compliance: { duration: null, distance: null },
    })),
    races: [
      {
        id: "race-a",
        name: "10K Vincennes",
        date: "2026-10-25",
        priority: "A",
        targetSeconds: null,
        distanceKm: 10,
        elevationGainM: null,
        kind: "road",
      },
      {
        id: "race-b",
        name: "Marathon de Paris",
        date: "2026-12-06",
        priority: "A",
        targetSeconds: null,
        distanceKm: 42.195,
        elevationGainM: null,
        kind: "road",
      },
    ],
  });
}

describe("race values", () => {
  const races = (
    distanceKm: number | null,
    elevationGainM: number | null,
  ): ProgramInput["races"] => [
    {
      id: "race-a",
      name: "Marathon de Paris",
      date: "2026-11-08",
      priority: "A",
      targetSeconds: null,
      distanceKm,
      elevationGainM,
      kind: "road",
    },
  ];
  const raceSession = (state: PlanState) =>
    state.sessions.find((session) => session.kind === "race")!;

  it("applies the resolved race distance and elevation to its race session", () => {
    const state = withRaceValues(withRace(planState()), races(48.9, 1_210));
    expect(raceSession(state).targets).toEqual({
      durationSeconds: 10_800,
      distanceMeters: 48_900,
      elevationGainMeters: 1_210,
    });
    const week = buildProgram(input({ state, races: races(48.9, 1_210) }))
      .weeks[3];
    const day = week.days.find((item) => item.date === "2026-11-08")!;
    expect(day.summary).toBe("48,9 km");
    expect(day.elevation).toBe("1\u202f210 m D+");
    expect(week.totals.distanceEstimated).toBe(false);
  });

  it("keeps stored targets for missing values and unmatched sessions", () => {
    const base = withRace(planState());
    expect(
      raceSession(withRaceValues(base, races(null, null))).targets,
    ).toEqual(raceSession(base).targets);
    expect(withRaceValues(base, [])).toBe(base);
    const elsewhere = races(48.9, 1_210).map((race) => ({
      ...race,
      date: "2026-11-15",
    }));
    expect(raceSession(withRaceValues(base, elsewhere)).targets).toEqual(
      raceSession(base).targets,
    );
  });

  it("links a race day to the plan race before another race that day", () => {
    const other = {
      ...races(null, null)[0],
      id: "race-other",
      name: "Course du même jour",
      priority: "C" as const,
    };
    const week = buildProgram(
      input({
        state: withRace(planState()),
        races: [other, ...races(null, null)],
      }),
    ).weeks[3];
    expect(week.days.find((day) => day.date === "2026-11-08")!.raceId).toBe(
      "race-a",
    );
  });

  it("links race days to their race and leaves other days to the panel", () => {
    const week = buildProgram(input({ state: withRace(planState()) })).weeks[3];
    const raceDay = week.days.find((day) => day.date === "2026-11-08")!;
    expect(raceDay.raceId).toBe("race-a");
    expect(week.days.filter((day) => day.raceId !== null)).toHaveLength(1);
    const unmatched = buildProgram(
      input({ state: withRace(planState()), races: [] }),
    ).weeks[3].days.find((day) => day.date === "2026-11-08")!;
    expect(unmatched.raceId).toBeNull();
    expect(unmatched.sessionKey).toBe("s-2026-11-08-1");
  });
});

describe("add-only proposals", () => {
  it("mark the day and the week of an added session as proposed", () => {
    const program = buildProgram(
      input({ proposalKeys: ["session:s-2026-10-22-2"] }),
    );
    const week = program.weeks[1];
    expect(week.proposed).toBe(true);
    expect(week.days[3].state).toBe("proposed");
    expect(program.weeks[2].proposed).toBe(false);
  });
});

describe("double days", () => {
  const doubleDay = (
    keys: [string, string] = ["s-2026-10-21-1", "s-2026-10-21-2"],
  ) => {
    const state = planState();
    return {
      ...state,
      sessions: [
        ...state.sessions,
        {
          ...easyRun(30),
          title: "Footing facile",
          targets: {
            durationSeconds: 1_800,
            distanceMeters: 5_200,
            elevationGainMeters: null,
          },
          sessionKey: keys[1],
          scheduledOn: "2026-10-21",
        },
        {
          ...supportSession("strength", 30),
          sessionKey: keys[0],
          scheduledOn: "2026-10-21",
        },
      ],
    };
  };

  it("keeps the longest session as the day lead while listing by slot", () => {
    const base = planState();
    const state = {
      ...base,
      sessions: [
        ...base.sessions,
        {
          ...easyRun(90),
          title: "Sortie longue",
          sessionKey: "s-2026-10-21-2",
          scheduledOn: "2026-10-21",
        },
        {
          ...supportSession("strength", 30),
          sessionKey: "s-2026-10-21-1",
          scheduledOn: "2026-10-21",
        },
      ],
    };
    const day = buildProgram(input({ state })).weeks[1].days[2];
    expect(day.sessions.map((session) => session.title)).toEqual([
      "Renforcement",
      "Sortie longue",
    ]);
    expect(day).toMatchObject({
      sessionKey: "s-2026-10-21-2",
      title: "Sortie longue",
    });
  });

  it("lists each session of a day in slot order with its own details", () => {
    const day = buildProgram(input({ state: doubleDay() })).weeks[1].days[2];
    expect(day.sessions).toMatchObject([
      {
        sessionKey: "s-2026-10-21-1",
        family: "strength",
        title: "Renforcement",
        summary: "30’",
      },
      {
        sessionKey: "s-2026-10-21-2",
        family: "easy",
        title: "Footing facile",
        summary: "30’ · 5,2 km",
      },
    ]);
    expect(day.sessions[1].blocks.length).toBeGreaterThan(0);
    expect(day).toMatchObject({
      sessionKey: "s-2026-10-21-1",
      family: "strength",
      title: "Renforcement",
    });
  });

  it("orders slots numerically", () => {
    const day = buildProgram(
      input({ state: doubleDay(["s-2026-10-21-2", "s-2026-10-21-10"]) }),
    ).weeks[1].days[2];
    expect(day.sessions.map((session) => session.sessionKey)).toEqual([
      "s-2026-10-21-2",
      "s-2026-10-21-10",
    ]);
  });

  it("keeps the state of each session independent", () => {
    const day = buildProgram(
      input({
        state: doubleDay(),
        matches: [
          {
            sessionKey: "s-2026-10-21-1",
            status: "completed",
            compliance: { duration: 1, distance: null },
          },
        ],
      }),
    ).weeks[1].days[2];
    expect(day.sessions.map((session) => session.state)).toEqual([
      "done",
      null,
    ]);
  });

  it("leads a race day with the race and still lists the other session", () => {
    const state = withRace(planState());
    const day = buildProgram(
      input({
        state: {
          ...state,
          sessions: [
            ...state.sessions,
            {
              ...easyRun(15),
              title: "Déblocage",
              sessionKey: "s-2026-11-08-0",
              scheduledOn: "2026-11-08",
            },
          ],
        },
      }),
    ).weeks[3].days.find((item) => item.date === "2026-11-08")!;
    expect(day.sessions.map((session) => session.title)).toEqual([
      "Marathon de Paris",
      "Déblocage",
    ]);
    expect(day).toMatchObject({
      sessionKey: "s-2026-11-08-1",
      raceId: "race-a",
      family: "race",
    });
  });

  it("keeps single and rest days unchanged", () => {
    const [, current] = buildProgram(input()).weeks;
    expect(current.days[0]).toMatchObject({
      sessionKey: null,
      family: "rest",
      title: "Repos",
      sessions: [],
    });
    expect(current.days[1].sessions).toHaveLength(1);
    expect(current.days[1]).toMatchObject({
      ...current.days[1].sessions[0],
      title: "Footing",
    });
  });
});

describe("season programs", () => {
  it("keeps a B or C race inside its season as a marker and a race entry", () => {
    const { seasons } = buildProgram(
      input({ state: withNestedRace(planState()), races: nestedRaces }),
    );
    expect(seasons).toHaveLength(1);
    const [season] = seasons;
    expect(
      season.bands.map((band) => [band.name, band.start, band.span]),
    ).toEqual([
      ["Base", 0, 2],
      ["Vitesse", 2, 2],
    ]);
    expect(season.weeks[2]).toMatchObject({
      label: "10K Vincennes · C",
      race: { letter: "C", primary: false },
    });
    expect(season.weeks[3].race).toEqual({ letter: "A", primary: true });
    expect(season.races).toEqual([
      {
        raceId: "race-c",
        number: 3,
        name: "10K Vincennes",
        detail: "Course C · cible 44:30",
        when: "1 nov.",
      },
      {
        raceId: "race-a",
        number: 4,
        name: "Marathon de Paris",
        detail: "Course A",
        when: "8 nov.",
      },
    ]);
  });

  it("marks a race the plan does not know inside its week", () => {
    const { weeks } = buildProgram(
      input({
        races: [
          ...input().races,
          {
            id: "race-b",
            name: "Semi de Boulogne",
            date: "2026-10-25",
            priority: "B",
            targetSeconds: null,
            distanceKm: 21.1,
            elevationGainM: null,
            kind: "road",
          },
        ],
      }),
    );
    expect(weeks[1]).toMatchObject({
      label: "Semi de Boulogne · B",
      race: { letter: "B", primary: false },
    });
  });

  it("derives upcoming milestones from the plan", () => {
    const state = withNestedRace(withRace(planState()));
    const [season] = buildProgram(input({ state, races: nestedRaces })).seasons;
    expect(
      season.milestones.map((milestone) => [
        milestone.number,
        milestone.label,
        milestone.when,
      ]),
    ).toEqual([
      [2, "Allégée", "19–25 oct."],
      [2, "Pic de volume", "19–25 oct."],
    ]);
  });

  it("builds one program per season with weeks numbered from 1", () => {
    const { seasons, weeks } = buildProgram(twoSeasons("2026-11-11"));
    expect(weeks.map((week) => week.number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(
      seasons.map((season) => [
        season.id,
        season.status,
        season.href,
        season.weeks.map((week) => week.number),
        season.weeks[0].weekKey,
      ]),
    ).toEqual([
      ["race-a", "past", "/plan?season=race-a", [1, 2, 3, 4], "w-2026-10-12"],
      ["race-b", "current", "/plan", [1, 2, 3, 4], "w-2026-11-09"],
    ]);
    expect(seasons[1]).toMatchObject({
      eyebrow: "Semaine 1 sur 4 · Base",
      title: "J-25 · Marathon de Paris",
      summary: "Deux saisons.",
      next: null,
      defaultWeekKey: "w-2026-11-09",
    });
    expect(seasons[1].kpis[0]).toEqual({
      key: "race",
      label: "Course",
      value: "6 déc.",
      detail: "J-25",
    });
  });

  it("reads a past season from what was run", () => {
    const [past] = buildProgram(twoSeasons("2026-11-11")).seasons;
    expect(past).toMatchObject({
      eyebrow: "Saison terminée · objectif A",
      title: "10K Vincennes",
      summary: null,
      defaultWeekKey: "w-2026-10-19",
      next: {
        seasonId: "race-b",
        href: "/plan",
        letter: "A",
        status: "current",
        name: "Marathon de Paris",
        detail: "En cours · S1 / 4 · J-25",
      },
    });
    expect(past.milestones).toEqual([]);
    expect(past.kpis).toEqual([
      { key: "race", label: "Course", value: "25 oct." },
      {
        key: "sessions",
        label: "Séances",
        value: "2 / 5",
        detail: "40 % faites",
      },
      { key: "volume", label: "Volume couru", value: "1h35" },
      { key: "peak", label: "Pic", value: "50’", detail: "en S2" },
    ]);
  });
});

describe("session families", () => {
  it("separates trail long runs and recovery runs", () => {
    const long = { ...easyRun(120), kind: "long" as const };
    const placed = { sessionKey: "s-1", scheduledOn: "2026-10-12" };
    expect(sessionFamilyOf({ ...long, ...placed })).toBe("long");
    expect(sessionFamilyOf({ ...long, sport: "trail", ...placed })).toBe(
      "long_trail",
    );
    expect(
      sessionFamilyOf({ ...easyRun(30), kind: "recovery", ...placed }),
    ).toBe("recovery");
    expect(
      sessionFamilyOf({ ...easyRun(30), kind: "mobility", ...placed }),
    ).toBe("mobility");
  });
});

describe("program navigation", () => {
  it("lists blocks and weeks with durations and states", () => {
    const nav = programNavigation(
      buildProgram(input({ state: withRace(planState()) })),
    );
    expect(nav.weekCount).toBe(4);
    expect(nav.blocks).toHaveLength(1);
    expect(nav.blocks[0]).toMatchObject({
      name: "Base",
      months: "oct.–nov.",
      status: "current",
    });
    expect(
      nav.blocks[0].weeks.map((week) => [week.label, week.status]),
    ).toEqual([
      ["Semaine 1", "past"],
      ["Semaine 2 · allégée", "current"],
      ["Semaine 3", "future"],
      ["Semaine 4", "future"],
    ]);
  });
});
