import { describe, expect, it } from "vitest";
import type { DeterministicPlanInput } from "@/features/plans/detailing/build";
import { validatePlanChange } from "@/features/plans/detailing/build";
import {
  blockOf,
  checkMove,
  moveBlockText,
  moveOperations,
} from "@/features/plans/schedule/move-check";
import type { MoveDay } from "@/features/plans/schedule/week-moves";
import { planState } from "./plan-fixture";

const state = planState();
const sessionKey = "s-2026-10-22-1";

const input = (availableWeekdays: number[]): DeterministicPlanInput => ({
  today: "2026-10-14",
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

const context = {
  today: "2026-10-14",
  matchedSessionKeys: new Set<string>(),
  version: 1,
};

const wednesday: MoveDay = {
  date: "2026-10-21",
  label: "mercredi 21",
  sessions: [],
  restKey: null,
};

const before = (value: DeterministicPlanInput) =>
  validatePlanChange(value, state, state, {
    versions: { expected: 1, current: 1 },
    matchedSessionKeys: new Set(),
  });

describe("blockOf", () => {
  it("maps rules to a block reason", () => {
    expect(blockOf(["C1"])).toBe("unavailable");
    expect(blockOf(["C2"])).toBe("duration");
    expect(blockOf(["C3"])).toBe("specialist");
    expect(blockOf(["H1"])).toBe("health");
    expect(blockOf(["H2"])).toBe("health");
    expect(blockOf(["H3"])).toBe("health");
    expect(blockOf(["I1"])).toBe("rules");
    expect(blockOf([])).toBeNull();
  });

  it("prefers health, then unavailable, specialist, duration, rules", () => {
    expect(blockOf(["I1", "C2", "C3", "C1", "H1"])).toBe("health");
    expect(blockOf(["I1", "C2", "C3", "C1"])).toBe("unavailable");
    expect(blockOf(["I1", "C2", "C3"])).toBe("specialist");
    expect(blockOf(["I1", "C2"])).toBe("duration");
  });
});

describe("moveBlockText", () => {
  it("explains every block in French", () => {
    expect(moveBlockText).toEqual({
      unavailable: "Jour indisponible dans ton profil",
      duration: "Durée maximale du jour dépassée",
      specialist: "Contrainte de ton suivi médical",
      health: "Déconseillé vu ton état de forme",
      rules: "Ne respecte pas les règles de Stride",
    });
  });
});

describe("moveOperations", () => {
  it("skips the rest placeholder before moving", () => {
    const day = { ...wednesday, restKey: "r-1" };
    expect(moveOperations("s-1", day)).toEqual([
      { op: "skip_session", sessionKey: "r-1" },
      { op: "move_session", sessionKey: "s-1", toDate: day.date },
    ]);
    expect(moveOperations("s-1", wednesday)).toEqual([
      { op: "move_session", sessionKey: "s-1", toDate: wednesday.date },
    ]);
  });
});

describe("checkMove", () => {
  it("lets a session move to a free day", () => {
    const value = input([2, 3, 4, 5, 6, 7]);
    expect(
      checkMove(value, state, before(value), sessionKey, wednesday, context),
    ).toBeNull();
  });

  it("blocks a weekday the athlete cannot run", () => {
    const value = input([2, 4, 7]);
    expect(
      checkMove(value, state, before(value), sessionKey, wednesday, context),
    ).toBe("unavailable");
  });

  it("blocks a move the plan cannot apply", () => {
    const value = input([2, 3, 4, 5, 6, 7]);
    expect(
      checkMove(value, state, before(value), "missing", wednesday, context),
    ).toBe("rules");
  });
});
