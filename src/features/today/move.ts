import type { PlanState } from "@/features/plans/model/plan";
import {
  weekMoveDays,
  type MoveDay,
} from "@/features/plans/schedule/week-moves";

export function moveDays(
  plan: PlanState,
  sessionKey: string,
  today: string,
  matchedSessionKeys: ReadonlySet<string> = new Set(),
): MoveDay[] {
  const session = plan.sessions.find((item) => item.sessionKey === sessionKey);
  if (!session || session.scheduledOn !== today) return [];
  return weekMoveDays(plan, sessionKey, today, matchedSessionKeys).filter(
    (day) => day.date > today,
  );
}
