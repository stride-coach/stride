import {
  raceGoalCard,
  type GoalCard,
  type GoalInputs,
  type KeySession,
} from "@/features/progress/goal";
import type { RaceSummary } from "./race";

export type OnTrackInputs = Omit<GoalInputs, "preparation"> & {
  nextKey: KeySession | null;
  maxWeeklyRunSeconds: number | null;
};

export type RaceOnTrack = {
  goal: GoalCard;
  preparation: { done: number; total: number } | null;
  nextKey: KeySession | null;
};

export function raceOnTrack(
  race: RaceSummary,
  inputs: OnTrackInputs,
  preparation: { done: number; total: number } | null,
): RaceOnTrack | null {
  if (race.date === null || race.date < inputs.today) return null;
  return {
    goal: raceGoalCard(
      { ...race, date: race.date },
      { ...inputs, preparation },
    ),
    preparation,
    nextKey: inputs.nextKey,
  };
}
