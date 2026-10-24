import type {
  NutritionTargets,
  RaceNutritionPlan,
} from "@/features/fueling/race-plan";
import {
  nutritionChanges,
  proposalStatusLabels,
  strategyChanges,
  type ProposalChange,
  type RaceProposal,
  type RaceProposalStatus,
  type RaceStrategy,
  type ReviewSegment,
} from "./proposals";
import type { RacePlan } from "./race";
import type { CourseModel, RacePlanModel } from "./workspace";

export type RaceProposalReview = {
  id: string;
  raceId: string;
  kind: RaceProposal["kind"];
  kicker: string;
  title: string;
  summary: string | null;
  status: RaceProposalStatus;
  statusLabel: string;
  changes: ProposalChange[];
};

const kickers: Record<RaceProposal["kind"], string> = {
  strategy: "Proposition · Stratégie de course",
  nutrition: "Proposition · Nutrition de course",
};

function shortName(name: string) {
  return name.split(" · ")[0];
}

export function reviewSegments(
  model: CourseModel,
  current: RacePlanModel | null,
  proposed: RacePlanModel | null = null,
): ReviewSegment[] {
  const names = new Map(model.waypoints.map((point) => [point.id, point.name]));
  const reference = current ?? proposed;
  if (!reference) return [];
  return reference.simulation.segments.map((segment, index) => {
    const after = proposed?.simulation.segments[index] ?? null;
    const runPace = (item: typeof segment) => {
      const runKm = (item.toM - item.fromM - item.walkM) / 1000;
      return runKm > 0.05 ? item.movingSeconds / runKm : null;
    };
    return {
      id: segment.toId,
      label: `T${index + 1} · ${shortName(names.get(segment.fromId) ?? "")} → ${shortName(names.get(segment.toId) ?? "")}`,
      currentSeconds: current ? segment.movingSeconds : null,
      proposedSeconds: after ? after.movingSeconds : null,
      currentPace: current ? runPace(segment) : null,
      proposedPace: after ? runPace(after) : null,
    };
  });
}

export function nutritionTargetsOf(plan: RacePlan): Required<NutritionTargets> {
  return {
    carbsPerHourG: plan.carbsPerHourG,
    waterMlPerHour: plan.waterMlPerHour,
    sodiumMgPerHour: plan.sodiumMgPerHour,
    caffeineMaxMg: plan.caffeineMaxMg,
    nightCaffeine: plan.nightCaffeine,
    flaskMl: plan.flaskMl,
    flaskCount: plan.flaskCount,
    bladderMl: plan.bladderMl,
  };
}

export function raceProposalReview(
  proposal: RaceProposal,
  input: {
    strategy: RaceStrategy;
    plan: RacePlan;
    nutritionPlan: RaceNutritionPlan;
    segments: ReviewSegment[];
    productNames: ReadonlyMap<string, string>;
  },
): RaceProposalReview {
  const changes =
    proposal.kind === "strategy"
      ? strategyChanges(input.strategy, proposal.payload, input.segments)
      : nutritionChanges(
          {
            targets: nutritionTargetsOf(input.plan),
            plan: input.nutritionPlan,
          },
          proposal.payload,
          input.segments,
          input.productNames,
        );
  return {
    id: proposal.id,
    raceId: proposal.raceId,
    kind: proposal.kind,
    kicker: kickers[proposal.kind],
    title: proposal.title,
    summary: proposal.summary,
    status: proposal.status,
    statusLabel: proposalStatusLabels[proposal.status],
    changes,
  };
}
