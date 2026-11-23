import "server-only";
import { validatePlanChange } from "@/features/plans/detailing/build";
import { localToday } from "@/features/plans/constraints";
import type { MoveBlock } from "@/features/plans/schedule/move-block";
import { checkMove } from "@/features/plans/schedule/move-check";
import {
  weekMoveDays,
  type MoveDay,
} from "@/features/plans/schedule/week-moves";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadPlanningInput } from "@/server/plans/draft";
import { readSessionMatches } from "@/server/plans/matches";
import { readActivePlan } from "@/server/plans/stored";

export type MoveTarget = MoveDay & { block: MoveBlock | null };
export async function loadSessionMoveTargets(
  context: OnboardingContext,
  sessionKey: string,
): Promise<MoveTarget[]> {
  const stored = await readActivePlan(context);
  if (!stored) return [];
  const { state, activeVersion: version } = stored;
  const [matches, { input }] = await Promise.all([
    readSessionMatches(context, stored.planId),
    loadPlanningInput(context),
  ]);
  const today = localToday(state.plan.timeZone);
  const matchedSessionKeys = new Set(
    matches
      .filter((match) => match.status !== "dismissed")
      .map((match) => match.sessionKey),
  );
  const days = weekMoveDays(state, sessionKey, today, matchedSessionKeys);
  if (days.length === 0) return [];
  const before = validatePlanChange(input, state, state, {
    versions: { expected: version, current: version },
    matchedSessionKeys,
  });
  return days.map((day) => ({
    ...day,
    block: checkMove(input, state, before, sessionKey, day, {
      today,
      matchedSessionKeys,
      version,
    }),
  }));
}
