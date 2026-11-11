import { addDays, mondayOf } from "@/features/plans/model/dates";
import type { PlanState } from "@/features/plans/model/plan";

export type MoveDay = { date: string; label: string; sessions: string[] };

const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  timeZone: "UTC",
});

export function moveDays(
  plan: PlanState,
  sessionKey: string,
  today: string,
): MoveDay[] {
  const session = plan.sessions.find((item) => item.sessionKey === sessionKey);
  if (!session || session.scheduledOn !== today) return [];
  const weekEnd = addDays(mondayOf(today), 6);
  const last = weekEnd < plan.plan.endsOn ? weekEnd : plan.plan.endsOn;
  const days: MoveDay[] = [];
  for (let date = addDays(today, 1); date <= last; date = addDays(date, 1))
    days.push({
      date,
      label: dayLabel.format(new Date(`${date}T00:00:00Z`)),
      sessions: plan.sessions
        .filter(
          (item) =>
            item.scheduledOn === date &&
            item.kind !== "rest" &&
            item.sport !== "rest",
        )
        .map((item) => item.title),
    });
  return days;
}
