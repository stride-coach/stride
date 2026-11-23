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

export const moveDayLabel = (date: string): string =>
  dayLabel.format(new Date(`${date}T00:00:00Z`));

const isRest = (session: PlanSession) =>
  session.kind === "rest" || session.sport === "rest";

export function weekMoveDays(
  plan: PlanState,
  sessionKey: string,
  today: string,
  matchedSessionKeys: ReadonlySet<string> = new Set(),
): MoveDay[] {
  const session = plan.sessions.find((item) => item.sessionKey === sessionKey);
  if (
    !session ||
    session.kind === "race" ||
    session.scheduledOn < today ||
    matchedSessionKeys.has(sessionKey)
  )
    return [];
  const monday = mondayOf(session.scheduledOn);
  const days: MoveDay[] = [];
  for (let offset = 0; offset < 7; offset += 1) {
    const date = addDays(monday, offset);
    if (
      date < today ||
      date < plan.plan.startsOn ||
      date > plan.plan.endsOn ||
      date === session.scheduledOn
    )
      continue;
    const onDay = plan.sessions.filter((item) => item.scheduledOn === date);
    if (onDay.some((item) => item.kind === "race")) continue;
    days.push({
      date,
      label: moveDayLabel(date),
      sessions: onDay.filter((item) => !isRest(item)).map((item) => item.title),
      restKey: onDay.find(isRest)?.sessionKey ?? null,
    });
  }
  return days;
}
