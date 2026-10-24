import { describe, expect, it } from "vitest";
import {
  countdownLabel,
  parseRacesView,
  planPhases,
  preparationProgress,
  preparationRows,
  seasonTimeline,
  splitRaces,
} from "@/features/races/overview";
import { defaultPlan, type RaceSummary } from "@/features/races/race";

function race(overrides: Partial<RaceSummary>): RaceSummary {
  return {
    id: "race",
    name: "Course",
    kind: "trail",
    date: "2027-03-20",
    distanceKm: 120,
    elevationGainM: 1600,
    priority: "A",
    targetSeconds: 66_600,
    revision: 1,
    ...overrides,
  };
}

const today = "2026-10-13";

describe("races overview", () => {
  it("falls back to the upcoming view for unknown values", () => {
    expect(parseRacesView("past")).toBe("past");
    expect(parseRacesView(["all", "past"])).toBe("all");
    expect(parseRacesView("nope")).toBe("upcoming");
    expect(parseRacesView(undefined)).toBe("upcoming");
  });

  it("splits races and picks the featured one by priority then date", () => {
    const split = splitRaces(
      [
        race({ id: "c", priority: "C", date: "2026-11-22" }),
        race({ id: "a", priority: "A", date: "2027-03-20" }),
        race({ id: "old", priority: "A", date: "2026-09-27" }),
        race({ id: "older", priority: "B", date: "2026-03-21" }),
        race({ id: "undated", priority: "B", date: null }),
      ],
      today,
    );
    expect(split.featured?.id).toBe("a");
    expect(split.upcoming.map((item) => item.id)).toEqual([
      "c",
      "a",
      "undated",
    ]);
    expect(split.calendar.map((item) => item.id)).toEqual(["c", "undated"]);
    expect(split.past.map((item) => item.id)).toEqual(["old", "older"]);
  });

  it("keeps a race happening today upcoming", () => {
    const split = splitRaces([race({ date: today })], today);
    expect(split.upcoming).toHaveLength(1);
    expect(countdownLabel(today, today)).toBe("Jour J");
    expect(countdownLabel("2026-11-28", today)).toBe("J-46");
    expect(countdownLabel("2026-09-01", today)).toBeNull();
  });

  it("scores preparation from persisted facts only", () => {
    const rows = preparationRows({
      race: race({ id: "r1" }),
      plan: { ...defaultPlan, startConfirmed: true },
      course: null,
      waypoints: [],
      checklist: [],
    });
    expect(rows.map((row) => [row.key, row.state])).toEqual([
      ["course", "todo"],
      ["waypoints", "todo"],
      ["target", "done"],
      ["start", "done"],
      ["gear", "todo"],
      ["watch", "todo"],
    ]);
    const progress = preparationProgress(rows);
    expect(progress).toMatchObject({ done: 2, total: 6 });
    expect(progress.next).toContain("GPX");
    expect(progress.nextHref).toBe("/races/r1/course");
  });

  it("skips trail-only steps for road races", () => {
    const rows = preparationRows({
      race: race({ kind: "road" }),
      plan: defaultPlan,
      course: null,
      waypoints: [],
      checklist: [],
    });
    expect(rows.map((row) => row.key)).toEqual(["course", "target", "start"]);
    expect(rows.map((row) => row.href)).toEqual([
      "/races/race/course",
      null,
      null,
    ]);
  });

  it("draws the active plan blocks and no phase without a plan", () => {
    const races = [
      race({ id: "a1", date: "2027-03-20" }),
      race({ id: "c", priority: "C", date: "2026-11-22" }),
    ];
    const week = (weekStart: string) => ({ weekStart });
    const phases = planPhases(
      {
        blocks: [
          {
            blockKey: "lead",
            name: "Reprise",
            weeks: [week("2026-10-05"), week("2026-10-12")],
          },
          {
            blockKey: "build",
            name: "Volume",
            weeks: [week("2026-10-19"), week("2027-01-04")],
          },
          { blockKey: "empty", name: "Vide", weeks: [] },
          {
            blockKey: "taper",
            name: "Affûtage",
            weeks: [week("2027-03-08"), week("2027-03-15")],
          },
        ],
      } as unknown as Parameters<typeof planPhases>[0],
      { lead: "lead_in", build: "build", taper: "taper" },
    );
    expect(phases).toEqual([
      {
        key: "lead",
        label: "Reprise",
        kind: "lead_in",
        start: "2026-10-05",
        end: "2026-10-19",
      },
      {
        key: "build",
        label: "Volume",
        kind: "build",
        start: "2026-10-19",
        end: "2027-01-11",
      },
      {
        key: "taper",
        label: "Affûtage",
        kind: "taper",
        start: "2027-03-08",
        end: "2027-03-22",
      },
    ]);
    const timeline = seasonTimeline(races, today, phases)!;
    expect(timeline.phases.map((phase) => [phase.key, phase.stage])).toEqual([
      ["lead", 0],
      ["build", 1],
      ["taper", 3],
    ]);
    expect(timeline.phases[0].left).toBe(0);
    const a1 = timeline.markers.find((marker) => marker.id === "a1")!;
    const taper = timeline.phases[2];
    expect(taper.left).toBeLessThan(a1.left);
    expect(taper.left + taper.width).toBeGreaterThan(a1.left);
    expect(seasonTimeline(races, today)!.phases).toEqual([]);
    expect(planPhases(null, {})).toEqual([]);
  });

  it("stacks close race labels on separate lanes", () => {
    const timeline = seasonTimeline(
      [
        race({ id: "one", name: "Ecotrail Paris Automne", date: "2026-10-17" }),
        race({ id: "two", name: "10km Tour Eiffel", date: "2026-12-06" }),
        race({ id: "three", name: "UTMB PDA", date: "2027-07-08" }),
      ],
      today,
    )!;
    const lanes = Object.fromEntries(
      timeline.markers.map((marker) => [marker.id, marker]),
    );
    expect(lanes.one.align).toBe("start");
    expect(lanes.three.align).toBe("end");
    expect(lanes.two.lane).not.toBe(lanes.one.lane);
    expect(timeline.lanes).toBe(2);
  });

  it("returns no timeline without a dated upcoming race", () => {
    expect(seasonTimeline([race({ date: null })], today)).toBeNull();
    expect(seasonTimeline([], today)).toBeNull();
  });
});
