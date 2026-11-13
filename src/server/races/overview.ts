import "server-only";
import { cache } from "react";
import { roadPredictionKey } from "@/features/progress/goal";
import { raceOnTrack } from "@/features/races/on-track";
import { currentValues } from "@/features/races/season";
import {
  planPhases,
  preparationProgress,
  preparationRows,
  splitRaces,
} from "@/features/races/overview";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadPlanOverview } from "@/server/plans/overview";
import { loadOnTrackInputs } from "./on-track";
import { listRaces, readWorkspace } from "./races";
import { readRaceResults } from "./results";

export const readRacesOverview = cache(
  async (context: OnboardingContext, today: string) => {
    const races = await listRaces(context);
    const split = splitRaces(races, today);
    const [data, inputs, results, planOverview] = await Promise.all([
      split.featured
        ? readWorkspace(context, split.featured.id)
        : Promise.resolve(null),
      loadOnTrackInputs(context, today),
      readRaceResults(context, split.past),
      loadPlanOverview(context).catch(() => null),
    ]);
    const sessions = (planOverview?.plan.state.sessions ?? []).map(
      (session) => ({ scheduledOn: session.scheduledOn, kind: session.kind }),
    );
    const phases = planPhases(inputs.program, inputs.blockKinds);
    const roadGoals = Object.fromEntries(
      split.calendar.flatMap((race) => {
        const onTrack = roadPredictionKey(race)
          ? raceOnTrack(race, inputs, null)
          : null;
        return onTrack ? [[race.id, onTrack.goal]] : [];
      }),
    );
    const marks = {
      longestRunMeters: inputs.longestRunMeters,
      maxWeeklyGainMeters: inputs.maxWeeklyGainMeters,
      maxWeeklyRunSeconds: inputs.maxWeeklyRunSeconds,
    };
    const values = currentValues(inputs.predictions);
    if (!data)
      return {
        ...split,
        featured: null,
        onTrack: null,
        phases,
        roadGoals,
        results,
        marks,
        values,
        sessions,
      };
    const progress = preparationProgress(preparationRows(data));
    return {
      ...split,
      featured: data.race,
      onTrack: raceOnTrack(data.race, inputs, progress),
      course: data.course,
      plan: data.plan,
      phases,
      roadGoals,
      results,
      marks,
      values,
      sessions,
    };
  },
);

export type RacesOverview = Awaited<ReturnType<typeof readRacesOverview>>;
