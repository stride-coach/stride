import "server-only";
import { cache } from "react";
import type { IntensityPaces } from "@/features/plans/model/structure";
import {
  intensityPaceRanges,
  paceMidpoints,
  trainingTargets,
  type IntensityPaceRanges,
  type TrainingTargets,
} from "@/features/plans/targets/targets";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadPlanningInput } from "./draft";

export const loadTrainingTargets = cache(
  async (context: OnboardingContext): Promise<TrainingTargets | null> => {
    try {
      const { today, input } = await loadPlanningInput(context);
      return trainingTargets({ ...input.targets, today });
    } catch {
      return null;
    }
  },
);

export const loadIntensityPaceRanges = cache(
  async (context: OnboardingContext): Promise<IntensityPaceRanges | null> => {
    const targets = await loadTrainingTargets(context);
    return targets ? intensityPaceRanges(targets) : null;
  },
);

export const loadIntensityPaces = cache(
  async (context: OnboardingContext): Promise<IntensityPaces | null> => {
    const ranges = await loadIntensityPaceRanges(context);
    return ranges ? paceMidpoints(ranges) : null;
  },
);
