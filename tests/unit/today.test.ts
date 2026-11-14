import { describe, expect, it } from "vitest";
import type { Activity } from "@/features/activities/activities";
import { buildDebriefView, feelingView } from "@/features/plans/debrief/view";
import { buildProgram, type ProgramRace } from "@/features/plans/view/program";
import { buildSessionPanel } from "@/features/plans/view/session-panel";
import { addDays } from "@/features/progress/period";
import {
  recoveryModel,
  type RecoveryNight,
} from "@/features/progress/recovery";
import {
  buildToday,
  formatTodayDate,
  todaySessionKey,
  todaySessionKeys,
  todayWeek,
  type TodayInput,
  type TodayMatch,
} from "@/features/today/today";
import { easyRun, planState, supportSession } from "./plan-fixture";
import type { PlanState } from "@/features/plans/model/plan";

const today = "2026-10-22";

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
  {
    id: "race-c",
    name: "10K Vincennes",
    date: "2026-11-01",
    priority: "C",
    targetSeconds: 2_670,
    distanceKm: 10,
    elevationGainM: null,
    kind: "road",
  },
];

function nights(values: (age: number) => Partial<RecoveryNight>) {
  return Array.from({ length: 30 }, (_, index): RecoveryNight => {
    const age = 29 - index;
    return {
      day: addDays(today, -age),
      readiness: 70,
      sleepSeconds: 26_400,
      sleepScore: 82,
      hrv: 58 + (index % 3) - 1,
      hrvStatus: "BALANCED",
      restingHeartRate: 45,
      ...values(age),
    };
  });
}

const activity: Activity = {
  id: "activity-1",
  type: "running",
  name: null,
  routeName: null,
  date: "2026-10-21",
  distanceMeters: 8_320,
  durationSeconds: 3_012,
  elevationGainMeters: null,
  averageHeartRate: 142,
  garminFeeling: { rpe: null, feel: null },
};

function input(overrides: Partial<TodayInput> = {}): TodayInput {
  const state = planState();
  const matches: TodayMatch[] = [
    {
      sessionKey: "s-2026-10-20-1",
      activityId: "activity-1",
      status: "completed",
      compliance: { duration: 0.98 },
    },
  ];
  const sessionKey = todaySessionKey(state, today);
  return {
    today,
    plan: state,
    program: buildProgram({
      state,
      today,
      summary: null,
      matches: matches.map((match) => ({
        ...match,
        compliance: { ...match.compliance, distance: null },
      })),
      proposalKeys: [],
      races,
    }),
    races,
    matches,
    panels: sessionKey
      ? [
          buildSessionPanel({
            state,
            today,
            sessionKey,
            matches: [],
            proposals: [],
            activities: [],
          })!,
        ]
      : [],
    recovery: recoveryModel({
      nights: nights((age) =>
        age === 0 ? { readiness: 58, sleepSeconds: 21_120, hrv: 46 } : {},
      ),
      load: [],
      checkin: null,
      races: [],
      today,
    }),
    latest: { ...activity, date: "2026-10-20" },
    ...overrides,
  };
}

describe("today view", () => {
  it("formats the date as JJ/MM/AAAA with the weekday", () => {
    expect(formatTodayDate(today)).toBe("jeu. 22/10/2026");
  });

  it("shows the plan goal race once with its block and next light week", () => {
    const { goal } = buildToday(input());
    expect(goal).toMatchObject({
      id: "race-a",
      letter: "A",
      name: "Marathon de Paris",
      detail: "dim. 08/11/2026 · 42,2 km",
      days: 17,
      block: { name: "Base", week: "S2 / 4" },
      href: "/races/race-a",
    });
  });

  it("shows today's planned session with its key targets", () => {
    const { session } = buildToday(input());
    expect(session.kind).toBe("session");
    if (session.kind !== "session") return;
    expect(session.panel.title).toBe("Seuil · 4 × 6'");
    expect(session.stats.map((stat) => stat.label)).toEqual([
      "Durée",
      "Allure /km",
      "Au seuil",
    ]);
    expect(session.terrain).toBe("Route");
    expect(session.quality).toBe(true);
    expect(session.href).toBe("/plan/sessions/s-2026-10-22-1");
  });

  it("weighs today's quality session against the day's form", () => {
    const { verdict } = buildToday(input());
    expect(verdict).toMatchObject({
      label: "Avec prudence",
      compat: { question: "Compatible avec Seuil · 4 × 6' ?" },
    });
    expect(buildToday(input({ pain: true })).verdict?.label).toBe("À revoir");
  });

  it("drops the verdict once today's session is done", () => {
    const base = input();
    const done = buildToday(
      input({
        panels: base.panels.map((panel) => ({ ...panel, status: "done" })),
      }),
    );
    expect(done.session.kind).toBe("session");
    expect(done.verdict).toBeNull();
  });

  it("points to the next session on a rest day", () => {
    const { session } = buildToday(input({ today: "2026-10-23", panels: [] }));
    expect(session).toEqual({
      kind: "rest",
      next: {
        title: "Footing",
        when: "dim. 25/10/2026",
        href: "/plan/sessions/s-2026-10-25-1",
      },
    });
  });

  it("says when there is no active plan", () => {
    const view = buildToday(
      input({ plan: null, program: null, panels: [], matches: [] }),
    );
    expect(view.session).toEqual({ kind: "none" });
    expect(view.verdict).toBeNull();
    expect(view.week).toBeNull();
    expect(view.goal).toMatchObject({ id: "race-a", block: null });
  });

  it("reads the day's form from Garmin with banded indicators", () => {
    const { form } = buildToday(input());
    expect(form).toMatchObject({
      score: 58,
      level: "Modérée",
      tone: "warning",
      gap: "12 sous ta moyenne 14 j",
    });
    expect(
      form.indicators.map((item) => [item.label, item.value, item.status]),
    ).toEqual([
      ["VFC", "46 ms", "watch"],
      ["FC repos", "45 bpm", "normal"],
      ["Sommeil", "5h52", "watch"],
    ]);
    expect(form.indicators[2].note).toBe("moy. 7h20 · −1h28");
  });

  it("has no score without a Garmin readiness", () => {
    const view = buildToday(
      input({
        recovery: recoveryModel({
          nights: [],
          load: [],
          checkin: null,
          races: [],
          today,
        }),
      }),
    );
    expect(view.form).toMatchObject({ score: null, indicators: [] });
    expect(view.verdict).toMatchObject({
      label: "Prévue au plan",
      waiting: true,
    });
    expect(view.queue).toEqual([
      {
        kind: "legs",
        key: "legs",
        label: "tes jambes",
        hint: "Ton ressenti complète la forme du jour.",
      },
    ]);
  });

  it("opens the requested week with its neighbours and summary", () => {
    const week = todayWeek(input().program, "2026-10-26");
    expect(week).toMatchObject({
      number: 3,
      weekStart: "2026-10-26",
      previous: "2026-10-19",
      next: "2026-11-02",
      current: false,
      detail: "semaine du 26 oct.",
      href: "/plan?week=2026-10-26",
    });
    expect(week?.range).toEqual(expect.any(String));
    expect(week?.planned.duration).toEqual(expect.any(String));
    expect(week?.days).toHaveLength(7);
  });

  it("falls back to the current week and stops at the plan edges", () => {
    const { program } = input();
    expect(todayWeek(program, null)).toMatchObject({
      weekStart: "2026-10-19",
      current: true,
    });
    expect(todayWeek(program, "2031-01-06")?.weekStart).toBe("2026-10-19");
    expect(todayWeek(program, "2026-10-12")?.previous).toBeNull();
    expect(todayWeek(program, "2026-11-02")?.next).toBeNull();
    expect(todayWeek(null, null)).toBeNull();
  });

  it("summarizes the current week day by day", () => {
    const { week } = buildToday(input());
    expect(week).toMatchObject({
      number: 2,
      total: 4,
      blockName: "Base",
      planned: { duration: expect.any(String) },
      href: "/plan?week=2026-10-19",
    });
    expect(week?.days.map((day) => day.letter)).toEqual([
      "L",
      "M",
      "M",
      "J",
      "V",
      "S",
      "D",
    ]);
    expect(week?.days[1]).toMatchObject({ family: "easy", state: "done" });
    expect(week?.days[3]).toMatchObject({ isToday: true, family: "threshold" });
    expect(week?.pct).toBeGreaterThan(0);
  });

  it("queues the feeling, then the pair, then the legs", () => {
    const debrief = buildDebriefView({
      session: planState().sessions.find(
        (item) => item.sessionKey === "s-2026-10-20-1",
      )!,
      activityId: "activity-1",
      laps: [],
      paceRanges: null,
      match: {
        status: "completed",
        compliance: { duration: 0.98, intensity: 0.9 },
      },
      garmin: { rpe: null, feel: null },
      athlete: null,
    });
    const pairQuestion = {
      activityId: "activity-1",
      title: "Quelle paire as-tu portée ?",
      text: "",
      garmin: { id: "shoe-1", name: "Evo SL 3" },
      planned: { id: "shoe-2", name: "Speedgoat 6" },
      context: "",
      options: [],
    };
    const { queue } = buildToday(
      input({
        today: "2026-10-21",
        panels: [],
        debrief,
        pairQuestion,
      }),
    );
    const withSession = buildToday(input({ debrief, pairQuestion })).queue;
    expect(withSession).toHaveLength(3);
    expect(withSession[0]).toMatchObject({
      kind: "feeling",
      activityId: "activity-1",
    });
    expect(queue.map((item) => [item.kind, item.label])).toEqual([
      ["feeling", "ton ressenti d’hier"],
      ["pair", "ta paire d’hier"],
      ["legs", "tes jambes"],
    ]);
    expect(queue[0]).toMatchObject({
      activityId: "activity-1",
      activity: {
        heading: "Hier",
        title: "Footing · 50’",
        family: "easy",
        detail: "8,32 km · 6:02 /km · FC 142",
        compliance: { pct: 98, partial: false },
        href: "/activities/activity-1",
      },
    });
    const noted = buildToday(
      input({
        today: "2026-10-21",
        panels: [],
        debrief: debrief && {
          ...debrief,
          feeling: feelingView({ source: "athlete", effort: 6, feel: 75 }),
        },
        recovery: recoveryModel({
          nights: [],
          load: [],
          checkin: {
            day: "2026-10-21",
            legs: "fresh",
            soreness: null,
            stress: null,
            updatedAt: null,
          },
          races: [],
          today: "2026-10-21",
        }),
      }),
    );
    expect(noted.queue).toEqual([]);
  });
  it("shows a session done in several activities as one cumulative row", () => {
    const second = {
      ...activity,
      id: "activity-2",
      distanceMeters: 687,
      durationSeconds: 176,
      averageHeartRate: 159,
    };
    const debrief = buildDebriefView({
      session: planState().sessions.find(
        (item) => item.sessionKey === "s-2026-10-20-1",
      )!,
      activityId: "activity-1",
      activityIds: ["activity-1", "activity-2"],
      laps: [],
      paceRanges: null,
      match: {
        status: "completed",
        compliance: { duration: 0.98, intensity: 0.9 },
      },
      garmin: { rpe: null, feel: null },
      athlete: null,
    });
    const { queue } = buildToday(
      input({
        today: "2026-10-21",
        panels: [],
        matches: ["activity-1", "activity-2"].map((activityId) => ({
          sessionKey: "s-2026-10-20-1",
          activityId,
          status: "completed" as const,
          compliance: { duration: 0.98 },
        })),
        latest: second,
        latestGroup: [activity, second],
        debrief,
      }),
    );
    expect(queue[0]).toMatchObject({
      kind: "feeling",
      key: "feeling-activity-1",
      activityId: "activity-1",
      activity: {
        title: "Footing",
        detail: "2 activités · 53:08 · 9,01 km",
        compliance: { pct: 98, partial: false },
        href: "/plan/sessions/s-2026-10-20-1",
      },
    });
  });
});

describe("today double day", () => {
  const doubleState = (): PlanState => {
    const state = planState();
    return {
      ...state,
      sessions: [
        ...state.sessions.filter((item) => item.scheduledOn !== today),
        {
          ...easyRun(30),
          title: "Footing facile",
          sessionKey: "s-2026-10-22-2",
          scheduledOn: today,
        },
        {
          ...supportSession("strength", 30),
          sessionKey: "s-2026-10-22-1",
          scheduledOn: today,
        },
      ],
    };
  };

  function doubleInput(done: boolean, extra: TodayMatch[] = []): TodayInput {
    const state = doubleState();
    const matches: TodayMatch[] = [
      ...(done
        ? [
            {
              sessionKey: "s-2026-10-22-1",
              activityId: "activity-2",
              status: "completed" as const,
              compliance: { duration: 1 },
            },
          ]
        : []),
      ...extra,
    ];
    const panelMatches = matches.map((match) => ({
      ...match,
      compliance: { ...match.compliance, distance: null },
    }));
    return input({
      plan: state,
      matches,
      program: buildProgram({
        state,
        today,
        summary: null,
        matches: panelMatches,
        proposalKeys: [],
        races,
      }),
      panels: todaySessionKeys(state, today).map((sessionKey) =>
        buildSessionPanel({
          state,
          today,
          sessionKey,
          matches: panelMatches,
          proposals: [],
          activities:
            done && sessionKey === "s-2026-10-22-1"
              ? [
                  {
                    activity: {
                      id: "activity-2",
                      startedAt: "2026-10-22T05:40:00Z",
                      date: today,
                      localTime: "07:40",
                      durationSeconds: 1_920,
                      distanceMeters: null,
                      averageHeartRate: null,
                      detailImportedAt: null,
                    },
                    laps: [],
                    series: null,
                  },
                ]
              : [],
        })!,
      ),
    });
  }

  it("orders today's sessions by slot", () => {
    expect(todaySessionKeys(doubleState(), today)).toEqual([
      "s-2026-10-22-1",
      "s-2026-10-22-2",
    ]);
  });

  it("shows the done session as a compact row and focuses the next one", () => {
    const view = buildToday(doubleInput(true));
    expect(view.session.kind).toBe("session");
    if (view.session.kind !== "session") return;
    expect(view.session.panel.title).toBe("Footing facile");
    expect(view.session.count).toBe(2);
    expect(view.session.after).toEqual([]);
    expect(view.session.before).toEqual([
      {
        sessionKey: "s-2026-10-22-1",
        family: "strength",
        title: "Renforcement",
        summary: "30’",
        status: "done",
        note: "Fait · 32’ · Garmin 07:40",
        label: "Renforcement, 30’, fait, voir la séance",
        href: "/plan/sessions/s-2026-10-22-1",
      },
    ]);
    expect(view.verdict).not.toBeNull();
  });

  it("focuses the first session while none is done", () => {
    const view = buildToday(doubleInput(false));
    if (view.session.kind !== "session") throw new Error("session expected");
    expect(view.session.panel.title).toBe("Renforcement");
    expect(view.session.before).toEqual([]);
    expect(view.session.after).toMatchObject([
      { title: "Footing facile", status: null, note: "À venir" },
    ]);
  });

  it("focuses the last session once every session is done", () => {
    const view = buildToday(
      doubleInput(true, [
        {
          sessionKey: "s-2026-10-22-2",
          activityId: null,
          status: "completed",
          compliance: { duration: 1 },
        },
      ]),
    );
    if (view.session.kind !== "session") throw new Error("session expected");
    expect(view.session.panel.title).toBe("Footing facile");
    expect(view.session.before).toMatchObject([{ title: "Renforcement" }]);
    expect(view.verdict).toBeNull();
  });

  it("treats a replaced session as settled and focuses the next one", () => {
    const view = buildToday(
      doubleInput(false, [
        {
          sessionKey: "s-2026-10-22-1",
          activityId: "activity-2",
          status: "substituted",
          compliance: { duration: null },
        },
      ]),
    );
    if (view.session.kind !== "session") throw new Error("session expected");
    expect(view.session.panel.title).toBe("Footing facile");
    expect(view.session.before).toMatchObject([
      { title: "Renforcement", status: "substituted", note: "Remplacée" },
    ]);
  });

  it("stacks both sessions in the week strip with a done count", () => {
    const { week } = buildToday(doubleInput(true));
    expect(week?.days[3]).toMatchObject({
      families: ["strength", "easy"],
      doneCount: 1,
      label:
        "jeu. 22 oct. · 2 séances : Renforcement fait, puis Footing facile · aujourd’hui · 1 sur 2 faites",
    });
    expect(week?.days[1]).toMatchObject({ families: ["easy"], doneCount: 0 });
  });

  it("keeps a single session day as before", () => {
    const view = buildToday(input());
    if (view.session.kind !== "session") throw new Error("session expected");
    expect(view.session).toMatchObject({ count: 1, before: [], after: [] });
  });
});
