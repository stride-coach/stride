import "server-only";
import { cache } from "react";
import { validatePlanChange } from "@/features/plans/detailing/build";
import { localToday } from "@/features/plans/constraints";
import { addDays, mondayOf } from "@/features/plans/model/dates";
import {
  checkMove,
  type MoveBlock,
} from "@/features/plans/schedule/move-check";
import {
  weekMoveDays,
  type MoveDay,
} from "@/features/plans/schedule/week-moves";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadPlanningInput } from "@/server/plans/draft";
import { readSessionMatches } from "@/server/plans/matches";
import { readActivePlan } from "@/server/plans/stored";

export type MoveTarget = MoveDay & { block: MoveBlock | null };
export type MoveTargets = Record<string, MoveTarget[]>;

export const loadMoveTargets = cache(
  async (context: OnboardingContext): Promise<MoveTargets> => {
    const stored = await readActivePlan(context);
    if (!stored) return {};
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
    const before = validatePlanChange(input, state, state, {
      versions: { expected: version, current: version },
      matchedSessionKeys,
    });
    const monday = mondayOf(today);
    const horizon = addDays(monday, 14);
    const targets: MoveTargets = {};
    for (const session of state.sessions) {
      if (session.scheduledOn < monday || session.scheduledOn >= horizon)
        continue;
      const days = weekMoveDays(
        state,
        session.sessionKey,
        today,
        matchedSessionKeys,
      );
      if (days.length === 0) continue;
      targets[session.sessionKey] = days.map((day) => ({
        ...day,
        block: checkMove(input, state, before, session.sessionKey, day, {
          today,
          matchedSessionKeys,
          version,
        }),
      }));
    }
    return targets;
  },
);
