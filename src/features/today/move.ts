import { addDays, mondayOf } from "@/features/plans/model/dates";
import type { PlanSession, PlanState } from "@/features/plans/model/plan";

export type MoveDay = {
  date: string;
  label: string;
  sessions: string[];
  restKey: string | null;
};

const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  timeZone: "UTC",
});

const isRest = (session: PlanSession) =>
  session.kind === "rest" || session.sport === "rest";

export function moveDays(
  plan: PlanState,
  sessionKey: string,
  today: string,
  matchedSessionKeys: ReadonlySet<string> = new Set(),
): MoveDay[] {
  const session = plan.sessions.find((item) => item.sessionKey === sessionKey);
  if (
    !session ||
    session.scheduledOn !== today ||
    session.kind === "race" ||
    matchedSessionKeys.has(sessionKey)
  )
    return [];
  const weekEnd = addDays(mondayOf(today), 6);
  const last = weekEnd < plan.plan.endsOn ? weekEnd : plan.plan.endsOn;
  const days: MoveDay[] = [];
  for (let date = addDays(today, 1); date <= last; date = addDays(date, 1)) {
    const onDay = plan.sessions.filter((item) => item.scheduledOn === date);
    if (onDay.some((item) => item.kind === "race")) continue;
    days.push({
      date,
      label: dayLabel.format(new Date(`${date}T00:00:00Z`)),
      sessions: onDay.filter((item) => !isRest(item)).map((item) => item.title),
      restKey: onDay.find(isRest)?.sessionKey ?? null,
    });
  }
  return days;
}
