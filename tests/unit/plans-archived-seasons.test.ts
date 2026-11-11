import { describe, expect, it } from "vitest";
import { shellSeasons } from "@/features/app-shell/shell";
import {
  archivedProgram,
  buildProgram,
  seasonLink,
  type ProgramInput,
  type ProgramRace,
} from "@/features/plans/view/program";
import {
  archivedSeason,
  archivedSeasonPlanId,
  archivedState,
  defaultSeason,
  planSeasons,
  seasonFor,
  seasonHref,
  seasonProgress,
  type ArchivedPlan,
} from "@/features/plans/view/seasons";
import { buildSessionPanel } from "@/features/plans/view/session-panel";
import { planState, supportSession } from "./plan-fixture";

const races: ProgramRace[] = [
  {
    id: "race-a",
    name: "Marathon de Paris",
    date: "2026-11-08",
    priority: "A",
    targetSeconds: null,
    distanceKm: 42.195,
    elevationGainM: null,
    kind: "road",
  },
];

const weekStarts = planState().weeks.map((week) => week.weekStart);

function archived(overrides: Partial<ArchivedPlan> = {}): ArchivedPlan {
  return {
    planId: "p1",
    title: "Préparation marathon",
    primaryRaceId: "race-a",
    archivedOn: "2026-11-10",
    weekStarts,
    ...overrides,
  };
}

const replaced = archived({ archivedOn: "2026-10-21" });
const older = archived({
  planId: "p0",
  primaryRaceId: null,
  title: "Reprise",
  archivedOn: "2026-10-05",
  weekStarts: ["2026-09-21", "2026-09-28"],
});

const today = "2026-10-21";
const active = planSeasons({ state: planState(), races, today });

function input(on: string, overrides: Partial<ProgramInput> = {}) {
  return {
    state: archivedState(planState(), on),
    today: on,
    summary: null,
    matches: [
      {
        sessionKey: "s-2026-10-20-1",
        status: "completed" as const,
        compliance: { duration: 1, distance: null },
      },
    ],
    proposalKeys: [],
    races,
    ...overrides,
  } satisfies ProgramInput;
}

describe("archived seasons", () => {
  it("shows a plan archived after its race as a finished season", () => {
    const season = archivedSeason(archived(), races)!;
    expect(season).toMatchObject({
      id: "plan-p1",
      raceId: "race-a",
      name: "Marathon de Paris",
      letter: "A",
      status: "past",
      raceDate: "2026-11-08",
      startsOn: "2026-10-12",
      endsOn: "2026-11-08",
      weekStarts,
      currentWeek: null,
      replacedOn: null,
    });
    expect(seasonProgress(season)).toBe("Terminée");
  });

  it("cuts a plan replaced before its race at the archive date", () => {
    const season = archivedSeason(replaced, races)!;
    expect(season).toMatchObject({
      raceId: null,
      raceDate: null,
      name: "Marathon de Paris",
      weekStarts: ["2026-10-12", "2026-10-19"],
      endsOn: "2026-10-25",
      replacedOn: "2026-10-21",
    });
    expect(shellSeasons([season], today)[0]).toMatchObject({
      href: "/plan?season=plan-p1",
      dates: "12 oct. → 25 oct.",
      progress: "Remplacé le 21 oct.",
      countdown: null,
    });
  });

  it("names a season without a primary race after the plan", () => {
    expect(archivedSeason(older, races)).toMatchObject({
      name: "Reprise",
      letter: null,
      raceId: null,
      replacedOn: "2026-10-05",
    });
  });

  it("skips a plan archived before its first week", () => {
    expect(
      archivedSeason(archived({ archivedOn: "2026-10-11" }), races),
    ).toBeNull();
  });

  it("keeps an archived season apart from the active season of the same race", () => {
    const seasons = [...active, archivedSeason(archived(), races)!];
    expect(seasons.map((season) => season.id)).toEqual(["race-a", "plan-p1"]);
    expect(seasonFor(seasons, { race: "race-a" })?.id).toBe("race-a");
    expect(seasonFor(seasons, { season: "plan-p1" })?.id).toBe("plan-p1");
    expect(defaultSeason(seasons)?.id).toBe("race-a");
  });

  it("opens an archived season only from its exact identifier", () => {
    const seasons = [...active, archivedSeason(older, races)!];
    expect(seasonFor(seasons, { season: "plan-unknown" })?.id).toBe("race-a");
    expect(seasonFor(seasons, { week: "2026-09-28" })?.id).toBe("race-a");
    expect(seasonFor(seasons, { session: "2026-09-30" })?.id).toBe("race-a");
  });

  it("never defaults to an archived season without an active plan", () => {
    const seasons = [archivedSeason(older, races)!];
    expect(defaultSeason(seasons)).toBeNull();
    expect(seasonFor(seasons, {})).toBeNull();
    expect(seasonFor(seasons, { season: "plan-p0" })?.id).toBe("plan-p0");
    expect(seasonHref(seasons, "plan-p0")).toBe("/plan?season=plan-p0");
  });
});

describe("archived programs", () => {
  it("reads a replaced plan up to its archive date without a running week", () => {
    const season = archivedSeason(replaced, races)!;
    const next = buildProgram({
      ...input(today),
      state: planState(),
    }).seasons[0].link;
    const program = archivedProgram(input("2026-10-21"), season, next);
    expect(program).toMatchObject({
      id: "plan-p1",
      status: "past",
      href: "/plan?season=plan-p1",
      eyebrow: "Plan remplacé le 21 oct.",
      title: "Marathon de Paris",
      summary: null,
      next: {
        seasonId: "race-a",
        href: "/plan",
        detail: "En cours · S2 / 4 · J-18",
      },
    });
    expect(program.weeks.map((week) => [week.weekStart, week.status])).toEqual([
      ["2026-10-12", "past"],
      ["2026-10-19", "past"],
    ]);
    expect(
      program.weeks.flatMap((week) => week.days).some((day) => day.isToday),
    ).toBe(false);
    expect(program.kpis.map((kpi) => kpi.key)).toEqual([
      "sessions",
      "volume",
      "peak",
    ]);
    const days = program.weeks[1].days;
    expect(days[1]).toMatchObject({ date: "2026-10-20", state: "done" });
    expect(days[3]).toMatchObject({ date: "2026-10-22", state: null });
  });

  it("links an archived season by its identifier", () => {
    const season = archivedSeason(replaced, races)!;
    expect(seasonLink([season], season, today)).toEqual({
      seasonId: "plan-p1",
      href: "/plan?season=plan-p1",
      letter: "A",
      status: "past",
      name: "Marathon de Paris",
      detail: "Remplacé le 21 oct.",
    });
  });

  it("opens a session of the archived plan read-only", () => {
    const panel = buildSessionPanel({
      state: archivedState(planState(), "2026-10-20"),
      today: "2026-10-20",
      sessionKey: "s-2026-10-20-1",
      matches: [],
      proposals: [
        {
          id: "proposal-1",
          title: "Raccourcir",
          summary: null,
          targetKeys: ["session:s-2026-10-20-1"],
          createdAt: "2026-10-19T08:00:00Z",
        },
      ],
      activities: [],
      shoes: {
        sessionKey: "s-2026-10-20-1",
        context: "Footing",
        hasPairs: false,
        chosen: null,
        sentence: "Aucune paire",
        chip: null,
        options: [],
      },
      readOnly: true,
    })!;
    expect(panel).toMatchObject({
      sessionKey: "s-2026-10-20-1",
      title: "Footing",
      status: null,
      checkIn: null,
      proposal: null,
      shoes: null,
      readOnly: true,
    });
    expect(
      buildSessionPanel({
        state: archivedState(planState(), "2026-10-14"),
        today: "2026-10-14",
        sessionKey: "s-2026-10-20-1",
        matches: [],
        proposals: [],
        activities: [],
        readOnly: true,
      }),
    ).toBeNull();
  });

  it("opens the archived plan's session when the active plan has the same key", () => {
    const active = planState();
    const replacedPlan = {
      ...planState(),
      sessions: planState().sessions.map((session) =>
        session.sessionKey === "s-2026-10-20-1"
          ? { ...session, title: "Footing vallonné" }
          : session,
      ),
    };
    const plans: Record<string, typeof active> = { p1: replacedPlan };
    const panelFor = (season: string | null) => {
      const planId = archivedSeasonPlanId(season);
      const archivedPlan = planId ? plans[planId] : undefined;
      return buildSessionPanel({
        state: archivedPlan
          ? archivedState(archivedPlan, "2026-10-21")
          : active,
        today: "2026-10-21",
        sessionKey: "s-2026-10-20-1",
        matches: [],
        proposals: [],
        activities: [],
        readOnly: archivedPlan !== undefined,
      })!;
    };
    expect(archivedSeasonPlanId("plan-p1")).toBe("p1");
    expect(archivedSeasonPlanId("race-a")).toBeNull();
    expect(panelFor("plan-p1")).toMatchObject({
      title: "Footing vallonné",
      readOnly: true,
    });
    expect(panelFor("race-a")).toMatchObject({
      title: "Footing",
      readOnly: false,
    });
  });

  it("keeps a check-in visible on a read-only session", () => {
    const state = planState();
    const panel = buildSessionPanel({
      state: {
        ...state,
        sessions: [
          ...state.sessions,
          {
            ...supportSession("mobility", 20),
            sessionKey: "s-2026-10-14-1",
            scheduledOn: "2026-10-14",
          },
        ],
      },
      today: "2026-10-21",
      sessionKey: "s-2026-10-14-1",
      matches: [
        {
          sessionKey: "s-2026-10-14-1",
          activityId: null,
          status: "checked_in",
          compliance: { duration: null, distance: null },
        },
      ],
      proposals: [],
      activities: [],
      readOnly: true,
    })!;
    expect(panel).toMatchObject({ checkIn: { done: true }, readOnly: true });
  });
});
