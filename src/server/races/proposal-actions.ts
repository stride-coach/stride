"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getOnboardingContext } from "@/server/onboarding/context";

export type RaceProposalActionResult = {
  status:
    | "accepted"
    | "rejected"
    | "stale"
    | "closed"
    | "invalid"
    | "error"
    | "session-expired";
};

const inputSchema = z.object({ raceId: z.uuid(), proposalId: z.uuid() });

async function decide(
  input: unknown,
  decision: "accept" | "reject",
): Promise<RaceProposalActionResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };
  const context = await getOnboardingContext({ writable: true });
  if (!context) return { status: "session-expired" };
  const { raceId, proposalId } = parsed.data;
  try {
    const response =
      decision === "accept"
        ? await context.client.rpc("accept_race_proposal", {
            p_proposal_id: proposalId,
          })
        : await context.client.rpc("reject_race_proposal", {
            p_proposal_id: proposalId,
          });
    if (response.error) {
      if (response.error.message === "not_ready") return { status: "closed" };
      if (response.error.message === "not_found") return { status: "invalid" };
      return { status: "error" };
    }
    revalidatePath(`/races/${raceId}`, "layout");
    revalidatePath("/coach", "layout");
    if (decision === "reject") return { status: "rejected" };
    return { status: response.data === "stale" ? "stale" : "accepted" };
  } catch {
    return { status: "error" };
  }
}

export async function acceptRaceProposal(input: unknown) {
  return decide(input, "accept");
}

export async function rejectRaceProposal(input: unknown) {
  return decide(input, "reject");
}
