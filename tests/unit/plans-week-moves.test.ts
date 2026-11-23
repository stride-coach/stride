import { describe, expect, it } from "vitest";
import {
  upcomingMoveDays,
  weekMoveDays,
} from "../../src/features/plans/schedule/week-moves";
import { planState } from "./plan-fixture";

const today = "2026-10-20";
const dates = (days: { date: string }[]) => days.map((day) => day.date);

describe("same-week move days", () => {
  it("offers every other day of the week from today on", () => {
    const days = weekMoveDays(planState(), "s-2026-10-22-1", today);
    expect(dates(days)).toEqual([
      "2026-10-20",
      "2026-10-21",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(days[0]).toMatchObject({ label: "mardi 20" });
    expect(days[0].sessions).toHaveLength(1);
  });

  it("offers nothing for a past, matched, race or unknown session", () => {
    expect(weekMoveDays(planState(), "s-2026-10-13-1", today)).toEqual([]);
    expect(
      weekMoveDays(
        planState(),
        "s-2026-10-22-1",
        today,
        new Set(["s-2026-10-22-1"]),
      ),
    ).toEqual([]);
    const plan = planState();
    plan.sessions[3] = { ...plan.sessions[3], kind: "race" };
    expect(weekMoveDays(plan, "s-2026-10-22-1", today)).toEqual([]);
    expect(weekMoveDays(planState(), "missing", today)).toEqual([]);
  });

  it("never moves a rest row", () => {
    const plan = planState();
    plan.sessions.push({
      ...plan.sessions[2],
      sessionKey: "rest-21",
      scheduledOn: "2026-10-21",
      kind: "rest",
      sport: "rest",
      title: "Repos",
    });
    expect(weekMoveDays(plan, "rest-21", today)).toEqual([]);
    const sportOnly = planState();
    sportOnly.sessions.push({
      ...sportOnly.sessions[2],
      sessionKey: "rest-sport",
      scheduledOn: "2026-10-21",
      sport: "rest",
    });
    expect(weekMoveDays(sportOnly, "rest-sport", today)).toEqual([]);
  });

  it("never offers a race day", () => {
    const plan = planState();
    plan.sessions.push({
      ...plan.sessions[2],
      sessionKey: "race-day",
      scheduledOn: "2026-10-24",
      kind: "race",
    });
    expect(dates(weekMoveDays(plan, "s-2026-10-22-1", today))).toEqual([
      "2026-10-20",
      "2026-10-21",
      "2026-10-23",
      "2026-10-25",
    ]);
  });

  it("stays within the plan bounds", () => {
    const ending = planState();
    ending.plan.endsOn = "2026-10-23";
    expect(dates(weekMoveDays(ending, "s-2026-10-22-1", today))).toEqual([
      "2026-10-20",
      "2026-10-21",
      "2026-10-23",
    ]);
    const starting = planState();
    starting.plan.startsOn = "2026-10-21";
    expect(
      dates(weekMoveDays(starting, "s-2026-10-22-1", "2026-10-19")),
    ).toEqual(["2026-10-21", "2026-10-23", "2026-10-24", "2026-10-25"]);
  });

  it("reports a rest row separately from the sessions", () => {
    const plan = planState();
    plan.sessions.push({
      ...plan.sessions[2],
      sessionKey: "rest-21",
      scheduledOn: "2026-10-21",
      kind: "rest",
      sport: "rest",
      title: "Repos",
    });
    const day = weekMoveDays(plan, "s-2026-10-22-1", today).find(
      (item) => item.date === "2026-10-21",
    );
    expect(day).toMatchObject({ sessions: [], restKey: "rest-21" });
  });
});

describe("upcoming move days", () => {
  it("covers every session from this week on, without past or matched ones", () => {
    const state = planState();
    state.sessions.push({
      ...state.sessions[0],
      sessionKey: "s-2026-11-03-1",
      scheduledOn: "2026-11-03",
    });
    const result = upcomingMoveDays(state, today, new Set(["s-2026-10-20-1"]));
    expect(Object.keys(result).sort()).toEqual([
      "s-2026-10-22-1",
      "s-2026-10-25-1",
      "s-2026-11-03-1",
    ]);
    expect(dates(result["s-2026-10-22-1"])).toContain("2026-10-21");
  });
});
