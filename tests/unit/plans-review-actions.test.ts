import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const rpc = vi.hoisted(() => vi.fn());
const applyAcceptedProposal = vi.hoisted(() => vi.fn());
const getOnboardingContext = vi.hoisted(() => vi.fn());
const syncWatchAfterResponse = vi.hoisted(() => vi.fn());
const submitSessionMove = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("../../src/server/plans/apply", () => ({
  applyAcceptedProposal,
}));
vi.mock("../../src/server/onboarding/context", () => ({
  getOnboardingContext,
}));
vi.mock("../../src/server/garmin/watch", () => ({ syncWatchAfterResponse }));
vi.mock("../../src/server/plans/move", () => ({ submitSessionMove }));

import {
  acceptProposal,
  moveSession,
  rejectProposal,
  retryProposal,
} from "../../src/server/plans/actions";

const proposalId = "30000000-0000-4000-8000-000000000003";

describe("proposal actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ error: null });
    getOnboardingContext.mockResolvedValue({
      client: { rpc },
      userId: "a0000000-0000-4000-8000-00000000000a",
    });
  });

  it("accepts then applies with the athlete session", async () => {
    applyAcceptedProposal.mockResolvedValue({ ok: true, version: 5 });
    expect(await acceptProposal({ proposalId })).toEqual({
      status: "applied",
      version: 5,
    });
    expect(rpc).toHaveBeenCalledWith("accept_plan_proposal", {
      p_proposal_id: proposalId,
    });
    expect(applyAcceptedProposal).toHaveBeenCalledOnce();
    expect(syncWatchAfterResponse).toHaveBeenCalledOnce();
  });

  it("reports a plan that moved between review and accept as stale", async () => {
    applyAcceptedProposal.mockResolvedValue({
      ok: false,
      reason: "stale_version",
    });
    expect(await acceptProposal({ proposalId })).toEqual({
      status: "stale",
      reason: "stale_version",
    });
  });

  it("keeps the proposal pending when applying fails unexpectedly", async () => {
    applyAcceptedProposal.mockRejectedValue(new Error("network"));
    expect(await acceptProposal({ proposalId })).toEqual({ status: "pending" });
    expect(syncWatchAfterResponse).not.toHaveBeenCalled();
    applyAcceptedProposal.mockResolvedValue({ ok: true, version: 5 });
    expect(await retryProposal({ proposalId })).toEqual({
      status: "applied",
      version: 5,
    });
    expect(rpc).toHaveBeenCalledOnce();
  });

  it("never applies when the accept call fails", async () => {
    rpc.mockResolvedValue({ error: { message: "invalid_state" } });
    expect(await acceptProposal({ proposalId })).toEqual({ status: "error" });
    expect(applyAcceptedProposal).not.toHaveBeenCalled();
  });

  it("rejects without applying", async () => {
    expect(await rejectProposal({ proposalId })).toEqual({
      status: "rejected",
    });
    expect(rpc).toHaveBeenCalledWith("reject_plan_proposal", {
      p_proposal_id: proposalId,
    });
    expect(applyAcceptedProposal).not.toHaveBeenCalled();
  });

  it("refuses malformed input and expired sessions", async () => {
    expect(await acceptProposal({ proposalId: "nope" })).toEqual({
      status: "invalid-request",
    });
    getOnboardingContext.mockResolvedValue(null);
    expect(await rejectProposal({ proposalId })).toEqual({
      status: "session-expired",
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  describe("moving today's session", () => {
    const move = { sessionKey: "s-2026-10-20-1", toDate: "2026-10-22" };

    it("submits the move, accepts it and applies it through the validator", async () => {
      submitSessionMove.mockResolvedValue({ ok: true, proposalId });
      applyAcceptedProposal.mockResolvedValue({ ok: true, version: 6 });
      expect(await moveSession(move)).toEqual({
        status: "applied",
        version: 6,
      });
      expect(submitSessionMove).toHaveBeenCalledWith(
        expect.anything(),
        move.sessionKey,
        move.toDate,
      );
      expect(rpc).not.toHaveBeenCalled();
      expect(applyAcceptedProposal).toHaveBeenCalledWith(
        expect.anything(),
        proposalId,
      );
    });

    it("reports a day the validator blocks before anything is recorded", async () => {
      submitSessionMove.mockResolvedValue({
        ok: false,
        reason: "validation_failed",
      });
      expect(await moveSession(move)).toEqual({
        status: "invalid",
        reason: "validation_failed",
      });
      expect(applyAcceptedProposal).not.toHaveBeenCalled();
    });

    it("reports a move the validator blocks at apply time", async () => {
      submitSessionMove.mockResolvedValue({ ok: true, proposalId });
      applyAcceptedProposal.mockResolvedValue({
        ok: false,
        reason: "validation_failed",
      });
      expect(await moveSession(move)).toEqual({
        status: "invalid",
        reason: "validation_failed",
      });
      expect(syncWatchAfterResponse).not.toHaveBeenCalled();
    });

    it("never accepts a day outside the rest of the week", async () => {
      submitSessionMove.mockResolvedValue({ ok: false, reason: "not_allowed" });
      expect(await moveSession(move)).toEqual({ status: "invalid-request" });
      expect(await moveSession({ ...move, toDate: "demain" })).toEqual({
        status: "invalid-request",
      });
      expect(rpc).not.toHaveBeenCalled();
      expect(applyAcceptedProposal).not.toHaveBeenCalled();
    });
  });
});
