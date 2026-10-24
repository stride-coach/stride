import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));

import { sessionVerdict } from "../../src/features/plans/debrief/debrief";
import { buildDebriefView } from "../../src/features/plans/debrief/view";
import type { PlanSession } from "../../src/features/plans/model/plan";
import {
  feelingPill,
  isPlannedMatch,
  needsFeeling,
  plannedPill,
  sessionProgramme,
  withinPlan,
  unplannedPill,
} from "../../src/features/activities/plan-status";
import {
  buildComparison,
  fastLapPace,
  paceAtEqualHeartRate,
  selectSimilar,
  type CompareActivity,
} from "../../src/features/activities/compare";
import {
  activityCoachHref,
  weekLoadSentence,
} from "../../src/features/activities/panel";
import { easyRun, supportSession, thresholdSession } from "./plan-fixture";

const session = (
  content: ReturnType<typeof easyRun>,
  sessionKey = "s-1",
): PlanSession => ({ ...content, sessionKey, scheduledOn: "2026-10-18" });

const match = (
  status: "completed" | "partial" | "substituted" | "checked_in",
  duration: number | null = 1,
  intensity: number | null = null,
) => ({ status, compliance: { duration, intensity } });

describe("activity plan pills", () => {
  it("names the session family with a short verdict", () => {
    expect(
      plannedPill({ session: session(easyRun(45)), match: match("completed") }),
    ).toEqual({ label: "Footing · réussie", tone: "success" });
    expect(
      plannedPill({
        session: session(thresholdSession()),
        match: match("partial", 0.73),
      }),
    ).toEqual({ label: "Seuil · écourtée", tone: "warning" });
    expect(
      plannedPill({
        session: session({ ...easyRun(90), kind: "long" }),
        match: match("completed"),
      }).label,
    ).toBe("Sortie longue · réussie");
  });

  it("prefers the full debrief verdict when the panel has it", () => {
    expect(
      plannedPill({
        session: session(thresholdSession()),
        match: match("completed"),
        verdict: {
          tone: "warning",
          title: "Fractions trop rapides",
          body: "",
        },
      }),
    ).toEqual({ label: "Seuil · trop rapide", tone: "warning" });
  });

  it("marks support and substituted sessions without a pace verdict", () => {
    expect(
      plannedPill({
        session: session(supportSession("strength", 50)),
        match: match("completed"),
      }),
    ).toEqual({ label: "Renfo · faite", tone: "success" });
    expect(
      plannedPill({
        session: session(supportSession("mobility", 20)),
        match: match("checked_in"),
      }).label,
    ).toBe("Mobilité · faite");
    expect(
      plannedPill({
        session: session(easyRun(45)),
        match: match("substituted"),
      }),
    ).toEqual({ label: "Footing · remplacée", tone: "warning" });
  });

  it("counts only matches with an activity as planned", () => {
    expect(isPlannedMatch({ status: "completed", activityId: "a" })).toBe(true);
    expect(isPlannedMatch({ status: "dismissed", activityId: "a" })).toBe(
      false,
    );
    expect(isPlannedMatch({ status: "checked_in", activityId: null })).toBe(
      false,
    );
    expect(unplannedPill.label).toBe("Hors plan");
    expect(feelingPill.label).toBe("Ressenti à noter");
  });

  it("treats an activity as off plan only within the plan dates", () => {
    const plan = { startsOn: "2026-09-01", endsOn: "2027-04-12" };
    expect(withinPlan(plan, "2026-10-23")).toBe(true);
    expect(withinPlan(plan, "2026-08-31")).toBe(false);
    expect(withinPlan(null, "2026-10-23")).toBe(false);
  });

  it("asks for a feeling only on recent activities without one", () => {
    const empty = { rpe: null, feel: null };
    expect(
      needsFeeling({
        date: "2026-10-23",
        today: "2026-10-24",
        garmin: empty,
        athlete: false,
      }),
    ).toBe(true);
    expect(
      needsFeeling({
        date: "2026-10-12",
        today: "2026-10-24",
        garmin: empty,
        athlete: false,
      }),
    ).toBe(true);
    expect(
      needsFeeling({
        date: "2026-10-11",
        today: "2026-10-24",
        garmin: empty,
        athlete: false,
      }),
    ).toBe(false);
    expect(
      needsFeeling({
        date: "2026-10-23",
        today: "2026-10-24",
        garmin: { rpe: 7, feel: null },
        athlete: false,
      }),
    ).toBe(false);
    expect(
      needsFeeling({
        date: "2026-10-23",
        today: "2026-10-24",
        garmin: empty,
        athlete: true,
      }),
    ).toBe(false);
  });
});

const run = (
  id: string,
  date: string,
  values: Partial<CompareActivity> = {},
): CompareActivity => ({
  id,
  date,
  startedAt: `${date}T07:00:00Z`,
  distanceMeters: 8000,
  durationSeconds: 2880,
  averageHeartRate: 140,
  repPace: null,
  ...values,
});

describe("strength programme", () => {
  it("lists the planned blocks with their cues and amounts", () => {
    expect(
      sessionProgramme([
        {
          type: "warmup",
          end: { kind: "time", seconds: 480 },
          target: { kind: "none" },
          intensity: "easy",
          cue: "Échauffement mobilité hanches",
        },
        {
          type: "repeat",
          count: 3,
          steps: [
            {
              type: "work",
              end: { kind: "time", seconds: 45 },
              target: { kind: "none" },
              intensity: "easy",
              cue: "Gainage frontal",
            },
            {
              type: "recovery",
              end: { kind: "time", seconds: 60 },
              target: { kind: "none" },
              intensity: "recovery",
            },
          ],
        },
      ]),
    ).toEqual([
      { label: "Échauffement mobilité hanches", value: "8 min" },
      { label: "Gainage frontal", value: "3 × 45 s" },
    ]);
  });

  it("hides a programme without any named exercise", () => {
    expect(
      sessionProgramme(supportSession("strength", 30).structure),
    ).toBeNull();
  });
});

describe("similar activity comparison", () => {
  const current = run("now", "2026-10-23", {
    distanceMeters: 8320,
    durationSeconds: 3014,
    averageHeartRate: 138,
  });

  it("keeps the last three earlier runs, within 25 % of the distance when unplanned", () => {
    const picked = selectSimilar(
      current,
      [
        run("later", "2026-10-24"),
        run("far", "2026-10-20", { distanceMeters: 12_000 }),
        run("no-hr", "2026-10-19", { averageHeartRate: null }),
        run("a", "2026-10-16"),
        run("b", "2026-09-14"),
        run("c", "2026-09-13"),
        run("d", "2026-09-01"),
      ],
      { kind: "unplanned", group: "road" },
    );
    expect(picked.map((item) => item.id)).toEqual(["a", "b", "c"]);
    expect(
      selectSimilar(
        current,
        [run("far", "2026-10-20", { distanceMeters: 12_000 })],
        {
          kind: "planned",
          family: "easy",
        },
      ).map((item) => item.id),
    ).toEqual(["far"]);
  });

  it("estimates the pace an earlier run would have had at the current heart rate", () => {
    const earlier = run("a", "2026-10-16", {
      distanceMeters: 10_000,
      durationSeconds: 3000,
      averageHeartRate: 150,
    });
    expect(paceAtEqualHeartRate(earlier, 145, 50)).toBeCloseTo(315.8, 1);
    expect(paceAtEqualHeartRate(earlier, 130, 50)).toBeNull();
  });

  it("states a heart-rate gap when the pace is the same", () => {
    const comparison = buildComparison({
      current: run("now", "2026-10-23", { averageHeartRate: 138 }),
      similar: [
        run("a", "2026-10-16", { averageHeartRate: 141 }),
        run("b", "2026-09-14", { averageHeartRate: 142 }),
        run("c", "2026-09-13", { averageHeartRate: 143 }),
      ],
      scope: { kind: "unplanned", group: "road" },
      resting: 50,
      today: "2026-10-24",
    });
    expect(
      `${comparison?.lead}${comparison?.emphasis}${comparison?.tail}`,
    ).toBe(
      "Vs tes 3 dernières sorties similaires : même allure pour 4 bpm de moins",
    );
    expect(comparison?.tone).toBe("better");
    expect(comparison?.estimate).toBe(false);
    expect(comparison?.firstColumn).toBe("Sortie");
    expect(comparison?.columns.map((column) => column.label)).toEqual([
      "Allure",
      "FC moy.",
      "km",
    ]);
    expect(comparison?.rows[0]).toMatchObject({
      current: true,
      date: "ven. 23 oct.",
      cells: { pace: "6:00", heartRate: "138", distance: "8,00" },
    });
  });

  it("states a labelled pace gap at equal heart rate for planned sessions", () => {
    const comparison = buildComparison({
      current: run("now", "2026-10-18", {
        distanceMeters: 11_300,
        durationSeconds: 3520,
        averageHeartRate: 152,
        repPace: 276,
      }),
      similar: [
        run("a", "2026-10-04", {
          distanceMeters: 11_000,
          durationSeconds: 3500,
          averageHeartRate: 151,
          repPace: 281,
        }),
        run("b", "2026-09-20", {
          distanceMeters: 11_200,
          durationSeconds: 3580,
          averageHeartRate: 150,
          repPace: 283,
        }),
      ],
      scope: { kind: "planned", family: "threshold" },
      resting: 50,
      today: "2026-10-24",
    });
    expect(comparison?.lead).toBe("Vs tes 2 dernières séances au seuil : ");
    expect(comparison?.emphasis).toMatch(/^\d+ s\/km plus vite$/);
    expect(comparison?.tail).toBe(" à FC égale");
    expect(comparison?.estimate).toBe(true);
    expect(comparison?.columns.map((column) => column.label)).toEqual([
      "Allure",
      "FC moy.",
      "En rép.",
    ]);
    expect(comparison?.rows.map((row) => row.cells.repPace)).toEqual([
      "4:36",
      "4:41",
      "4:43",
    ]);
  });

  it("hides the comparison without an earlier similar run", () => {
    expect(
      buildComparison({
        current,
        similar: [],
        scope: { kind: "unplanned", group: "road" },
        resting: 50,
        today: "2026-10-24",
      }),
    ).toBeNull();
  });

  it("averages only the fast laps of a structured session", () => {
    expect(
      fastLapPace(
        [
          { durationSeconds: 900, distanceMeters: 2570 },
          { durationSeconds: 600, distanceMeters: 2270 },
          { durationSeconds: 120, distanceMeters: 320 },
          { durationSeconds: 600, distanceMeters: 2230 },
        ],
        3520 / 11.3,
      ),
    ).toBeCloseTo(266.7, 1);
    expect(fastLapPace([], 300)).toBeNull();
  });
});

describe("unplanned activity card", () => {
  it("says how the run counts in the week load", () => {
    expect(
      weekLoadSentence({
        date: "2026-10-23",
        today: "2026-10-24",
        actualMeters: 37_200,
        plannedMeters: 29_000,
      }),
    ).toBe("Compte dans ta charge : 37,2 km cette semaine pour 29 prévus");
    expect(
      weekLoadSentence({
        date: "2026-10-14",
        today: "2026-10-24",
        actualMeters: 35_400,
        plannedMeters: null,
      }),
    ).toBe("Compte dans ta charge : 35,4 km la semaine du 12–18 oct.");
    expect(
      weekLoadSentence({
        date: "2026-10-23",
        today: "2026-10-24",
        actualMeters: 0,
        plannedMeters: 29_000,
      }),
    ).toBeNull();
  });

  it("opens the coach with the activity attached", () => {
    expect(activityCoachHref("aaaaaaaa-aaaa-4aaa-8aaa-000000000001")).toBe(
      "/coach/new?activity=aaaaaaaa-aaaa-4aaa-8aaa-000000000001",
    );
  });
});

describe("list and panel verdicts", () => {
  it("give the same pill for the same match, laps split across two activities", async () => {
    const { sessionLapInput } = await import("../../src/server/plans/debrief");
    const plan = session(thresholdSession());
    const metersAt = (seconds: number, pace: number) => (seconds / pace) * 1000;
    const laps: [number, number, number | null][] = [[900, 2900, null]];
    [272, 274, 276, 278].forEach((pace, index) => {
      const seconds = index === 3 ? 200 : 360;
      laps.push([seconds, metersAt(seconds, pace), 168]);
      laps.push([90, 250, null]);
    });
    laps.push([600, 1900, null]);
    const segments = laps.map(
      ([durationSeconds, distanceMeters, averageHeartRate], index) => ({
        type: "lap" as const,
        index,
        durationSeconds,
        distanceMeters,
        averageHeartRate,
      }),
    );
    const reads = [
      {
        activity: {
          id: "b",
          startedAt: "2026-10-18T08:00:00Z",
          durationSeconds: 2000,
          distanceMeters: 5000,
          averageHeartRate: 150,
        },
        segments: segments
          .slice(5)
          .map((segment, index) => ({ ...segment, index })),
      },
      {
        activity: {
          id: "a",
          startedAt: "2026-10-18T07:00:00Z",
          durationSeconds: 2010,
          distanceMeters: 5200,
          averageHeartRate: 155,
        },
        segments: segments.slice(0, 5),
      },
    ];
    const completed = match("completed", 0.97);
    const input = sessionLapInput(reads);
    const panel = buildDebriefView({
      session: plan,
      activityId: "a",
      activityIds: ["a", "b"],
      laps: input.laps,
      paceRanges: null,
      match: completed,
      garmin: { rpe: null, feel: null },
      athlete: null,
      averageHeartRate: input.averageHeartRate,
    });
    const list = sessionVerdict({
      session: plan,
      match: completed,
      paceRanges: null,
      ...input,
    });
    const panelPill = plannedPill({
      session: plan,
      match: completed,
      verdict: panel?.verdict ?? null,
    });
    expect(
      plannedPill({ session: plan, match: completed, verdict: list }),
    ).toEqual(panelPill);
    expect(panelPill.label).toBe("Seuil · écourtée");
    expect(plannedPill({ session: plan, match: completed }).label).toBe(
      "Seuil · réussie",
    );
  });
});
