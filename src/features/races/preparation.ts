import { mondayOf } from "@/features/plans/model/dates";
import type { MatchStatus } from "@/features/plans/matching/adherence";
import type { PlanSession } from "@/features/plans/model/plan";
import { sessionPanelHref } from "@/features/plans/view/session-href";
import { formatDayMonthShort } from "@/features/progress/format";
import type { RaceSummary } from "./race";

export type KeySessionState = "done" | "partial" | "missed" | "upcoming";

export type KeySessionItem = {
  sessionKey: string;
  title: string;
  date: string;
  state: KeySessionState;
  href: string;
};

export function raceKeySessions({
  sessions,
  statuses,
  weekStarts,
  raceDate,
  today,
}: {
  sessions: Pick<
    PlanSession,
    "sessionKey" | "title" | "scheduledOn" | "isKey" | "kind" | "sport"
  >[];
  statuses: ReadonlyMap<string, MatchStatus>;
  weekStarts: readonly string[];
  raceDate: string;
  today: string;
}) {
  const weeks = new Set(weekStarts);
  const items = sessions
    .filter(
      (session) =>
        session.isKey &&
        session.kind !== "rest" &&
        session.kind !== "race" &&
        session.sport !== "rest" &&
        session.scheduledOn < raceDate &&
        weeks.has(mondayOf(session.scheduledOn)),
    )
    .sort(
      (a, b) =>
        a.scheduledOn.localeCompare(b.scheduledOn) ||
        a.sessionKey.localeCompare(b.sessionKey),
    )
    .map((session): KeySessionItem => {
      const status = statuses.get(session.sessionKey);
      return {
        sessionKey: session.sessionKey,
        title: session.title,
        date: formatDayMonthShort(session.scheduledOn),
        state:
          status === "completed"
            ? "done"
            : status === "partial"
              ? "partial"
              : session.scheduledOn < today
                ? "missed"
                : "upcoming",
        href: sessionPanelHref(session.sessionKey),
      };
    });
  return {
    items,
    done: items.filter((item) => item.state === "done").length,
    total: items.length,
  };
}

export type PrepRace = {
  id: string;
  name: string;
  priority: RaceSummary["priority"];
  date: string;
};

export function preparationRaces(
  races: Pick<RaceSummary, "id" | "name" | "priority" | "date">[],
  race: Pick<RaceSummary, "id" | "date">,
  today: string,
): PrepRace[] {
  if (!race.date) return [];
  const raceDate = race.date;
  return races
    .filter(
      (item): item is typeof item & { date: string } =>
        item.id !== race.id &&
        item.date !== null &&
        item.date >= today &&
        item.date < raceDate,
    )
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((item) => ({
      id: item.id,
      name: item.name,
      priority: item.priority,
      date: formatDayMonthShort(item.date),
    }));
}
