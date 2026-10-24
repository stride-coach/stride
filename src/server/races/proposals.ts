import "server-only";
import { cache } from "react";
import { z } from "zod";
import { productName } from "@/features/fueling/products";
import { emptyNutritionPlan } from "@/features/fueling/race-plan";
import {
  raceProposalReview,
  reviewSegments,
} from "@/features/races/proposal-review";
import {
  emptyStrategy,
  raceProposalColumns,
  raceProposalRowSchema,
  type RaceProposal,
} from "@/features/races/proposals";
import type { ScenarioKey } from "@/features/races/workspace";
import type { OnboardingContext } from "@/server/onboarding/context";
import type { RaceWorkspaceData } from "./races";
import { planFor } from "./views";

function parseRows(rows: unknown[]) {
  return rows
    .map((row) => raceProposalRowSchema.parse(row))
    .filter((proposal): proposal is RaceProposal => proposal !== null);
}

export const readReadyRaceProposals = cache(
  async (context: OnboardingContext, raceId: string) => {
    const { data, error } = await context.client
      .from("race_proposals")
      .select(raceProposalColumns)
      .eq("user_id", context.userId)
      .eq("race_id", raceId)
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    if (error) throw new Error("Unable to read the race proposals");
    return parseRows(data ?? []);
  },
);

export async function readRaceProposal(
  context: OnboardingContext,
  raceId: string,
  proposalId: string | undefined,
) {
  if (!z.uuid().safeParse(proposalId).success) return null;
  const { data, error } = await context.client
    .from("race_proposals")
    .select(raceProposalColumns)
    .eq("user_id", context.userId)
    .eq("race_id", raceId)
    .eq("id", proposalId!)
    .maybeSingle();
  if (error) throw new Error("Unable to read the race proposal");
  return data ? (parseRows([data])[0] ?? null) : null;
}

export const readProductNames = cache(async (context: OnboardingContext) => {
  const { data, error } = await context.client
    .from("athlete_nutrition_products")
    .select("id, name, brand")
    .eq("user_id", context.userId);
  if (error) throw new Error("Unable to read the nutrition products");
  return new Map((data ?? []).map((row) => [row.id, productName(row)]));
});

export async function loadRaceProposalReview(
  context: OnboardingContext,
  data: RaceWorkspaceData,
  proposalId: string | undefined,
  scenario: ScenarioKey | null = null,
) {
  const proposal = await readRaceProposal(context, data.race.id, proposalId);
  if (!proposal) return null;
  const views = planFor(data, scenario);
  const proposed =
    proposal.kind === "strategy"
      ? planFor(data, scenario, proposal.payload)
      : null;
  const segments = views
    ? reviewSegments(
        views.model,
        views.planned,
        proposed?.planned ?? null,
        data.plan.walkPaceSecondsPerKm,
      )
    : [];
  return raceProposalReview(proposal, {
    strategy: data.strategy ?? emptyStrategy,
    plan: data.plan,
    nutritionPlan: data.nutritionPlan?.plan ?? emptyNutritionPlan,
    segments,
    productNames:
      proposal.kind === "nutrition"
        ? await readProductNames(context)
        : new Map(),
  });
}
