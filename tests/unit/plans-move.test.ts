import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PlanState } from "../../src/features/plans/model/plan";
import { easyRun, planState } from "./plan-fixture";

vi.mock("server-only", () => ({}));

const readActivePlan = vi.hoisted(() => vi.fn());
const readSessionMatches = vi.hoisted(() => vi.fn());
const planChangeset = vi.hoisted(() => vi.fn());

vi.mock("../../src/server/plans/stored", () => ({ readActivePlan }));
vi.mock("../../src/server/plans/matches", () => ({ readSessionMatches }));
vi.mock("../../src/server/plans/apply", () => ({ planChangeset }));
vi.mock("../../src/features/plans/constraints", () => ({
  localToday: () => "2026-10-20",
}));

import { submitSessionMove } from "../../src/server/plans/move";

const rpc = vi.fn();
const context = {
  client: { rpc },
  userId: "a0000000-0000-4000-8000-00000000000a",
} as never;
const stored = (state: PlanState = planState()) => ({
  planId: "plan-1",
  status: "active",
  activeVersion: 4,
  version: 4,
  versionSummary: null,
  state,
});

describe("submitting a move of today's session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readActivePlan.mockResolvedValue(stored());
    readSessionMatches.mockResolvedValue([]);
    planChangeset.mockResolvedValue({ sessions: {} });
    rpc.mockResolvedValue({ data: { id: "proposal-1" }, error: null });
  });

  it("validates the whole change before recording an accepted athlete move", async () => {
    expect(
      await submitSessionMove(context, "s-2026-10-20-1", "2026-10-21"),
    ).toEqual({ ok: true, proposalId: "proposal-1" });
    expect(planChangeset).toHaveBeenCalledWith(context, {
      scope: "session",
      operations: [
        {
          op: "move_session",
          sessionKey: "s-2026-10-20-1",
          toDate: "2026-10-21",
        },
      ],
      plan_id: "plan-1",
      base_version: 4,
    });
    expect(rpc).toHaveBeenCalledWith(
      "submit_athlete_session_move",
      expect.objectContaining({
        p_session_key: "s-2026-10-20-1",
        p_to_date: "2026-10-21",
        p_title: "Séance déplacée : Footing",
      }),
    );
  });

  it("records nothing when the validator blocks the day", async () => {
    planChangeset.mockResolvedValue("validation_failed");
    expect(
      await submitSessionMove(context, "s-2026-10-20-1", "2026-10-22"),
    ).toEqual({ ok: false, reason: "validation_failed" });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("refuses a day outside the week and a session already matched", async () => {
    expect(
      await submitSessionMove(context, "s-2026-10-20-1", "2026-10-27"),
    ).toEqual({ ok: false, reason: "not_allowed" });
    readSessionMatches.mockResolvedValue([
      { sessionKey: "s-2026-10-20-1", status: "completed" },
    ]);
    expect(
      await submitSessionMove(context, "s-2026-10-20-1", "2026-10-21"),
    ).toEqual({ ok: false, reason: "not_allowed" });
    expect(planChangeset).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("removes the rest session of the chosen day in the same change", async () => {
    const state = planState();
    state.sessions.push({
      ...easyRun(0),
      sport: "rest",
      kind: "rest",
      title: "Repos",
      sessionKey: "s-2026-10-21-rest",
      scheduledOn: "2026-10-21",
    });
    readActivePlan.mockResolvedValue(stored(state));
    await submitSessionMove(context, "s-2026-10-20-1", "2026-10-21");
    expect(planChangeset.mock.calls[0][1].operations[0]).toEqual({
      op: "skip_session",
      sessionKey: "s-2026-10-21-rest",
    });
    expect(rpc.mock.calls[0][1].p_rest_key).toBe("s-2026-10-21-rest");
  });
});
