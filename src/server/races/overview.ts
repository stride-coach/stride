import "server-only";
import { cache } from "react";
import { roadPredictionKey } from "@/features/progress/goal";
import { raceOnTrack } from "@/features/races/on-track";
import {
  planPhases,
  preparationProgress,
  preparationRows,
  splitRaces,
} from "@/features/races/overview";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadOnTrackInputs } from "./on-track";
import { listRaces, readWorkspace } from "./races";
import { readRaceResults } from "./results";

export const readRacesOverview = cache(
  async (context: OnboardingContext, today: string) => {
    const races = await listRaces(context);
    const split = splitRaces(races, today);
    const [data, inputs, results] = await Promise.all([
      split.featured
        ? readWorkspace(context, split.featured.id)
        : Promise.resolve(null),
      loadOnTrackInputs(context, today),
      readRaceResults(context, split.past),
    ]);
    const phases = planPhases(inputs.program, inputs.blockKinds);
    const roadGoals = Object.fromEntries(
      split.calendar.flatMap((race) => {
        const onTrack = roadPredictionKey(race)
          ? raceOnTrack(race, inputs, null)
          : null;
        return onTrack ? [[race.id, onTrack.goal]] : [];
      }),
    );
    if (!data)
      return {
        ...split,
        featured: null,
        onTrack: null,
        phases,
        roadGoals,
        results,
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
    };
  },
);

export type RacesOverview = Awaited<ReturnType<typeof readRacesOverview>>;
