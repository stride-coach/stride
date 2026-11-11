import { describe, expect, it } from "vitest";
import { moveDays } from "../../src/features/today/move";
import { planState } from "./plan-fixture";

describe("today's move days", () => {
  it("offers the rest of the plan week with what each day already holds", () => {
    const days = moveDays(planState(), "s-2026-10-20-1", "2026-10-20");
    expect(days.map((day) => day.date)).toEqual([
      "2026-10-21",
      "2026-10-22",
      "2026-10-23",
      "2026-10-24",
      "2026-10-25",
    ]);
    expect(days[0]).toMatchObject({ label: "mercredi 21", sessions: [] });
    expect(days[1].sessions).toHaveLength(1);
    expect(days[4].sessions).toHaveLength(1);
  });

  it("stops at the end of the plan", () => {
    const plan = planState();
    plan.plan.endsOn = "2026-10-22";
    expect(
      moveDays(plan, "s-2026-10-20-1", "2026-10-20").map((day) => day.date),
    ).toEqual(["2026-10-21", "2026-10-22"]);
  });

  it("has nothing to offer on Sunday or for a session that is not today's", () => {
    expect(moveDays(planState(), "s-2026-10-25-1", "2026-10-25")).toEqual([]);
    expect(moveDays(planState(), "s-2026-10-22-1", "2026-10-20")).toEqual([]);
    expect(moveDays(planState(), "missing", "2026-10-20")).toEqual([]);
  });
});
