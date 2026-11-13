import {
  activityKind,
  activityTitle,
  formatDistance,
  formatPace,
  type Activity,
} from "@/features/activities/activities";
import type { PlanSession } from "@/features/plans/model/plan";
import { formatDuration, formatLongDay } from "@/features/plans/view/format";
import { daysUntil } from "@/features/races/race";
import type { SearchEntry } from "./results";

const raceDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function joinDetail(parts: (string | null)[]) {
  return parts.filter((part): part is string => !!part).join(" · ");
}

export function sessionEntry(
  session: Pick<
    PlanSession,
    "sessionKey" | "title" | "scheduledOn" | "targets"
  >,
  today: string,
  done: boolean,
): SearchEntry {
  const isToday = session.scheduledOn === today;
  const upcoming = session.scheduledOn >= today;
  const state = done
    ? "faite"
    : isToday
      ? "prévue aujourd’hui"
      : upcoming
        ? "prévue"
        : "non faite";
  const duration = session.targets.durationSeconds;
  return {
    kind: "session",
    id: `session:${session.sessionKey}`,
    title: session.title,
    detail: joinDetail([
      formatLongDay(session.scheduledOn),
      state,
      !done && upcoming && duration > 0 ? formatDuration(duration) : null,
    ]),
    date: session.scheduledOn,
    href: `/plan/sessions/${encodeURIComponent(session.sessionKey)}`,
    badge: done ? "done" : isToday ? "today" : null,
  };
}

export function activityEntry(
  activity: Pick<
    Activity,
    | "id"
    | "name"
    | "type"
    | "routeName"
    | "date"
    | "distanceMeters"
    | "durationSeconds"
  >,
): SearchEntry {
  const { distanceMeters, durationSeconds } = activity;
  const pace =
    distanceMeters &&
    distanceMeters >= 100 &&
    durationSeconds &&
    activityKind(activity.type) !== "other"
      ? `${formatPace(distanceMeters, durationSeconds)} /km`
      : null;
  return {
    kind: "activity",
    id: `activity:${activity.id}`,
    title: activityTitle(activity),
    detail: joinDetail([
      formatLongDay(activity.date),
      distanceMeters ? `${formatDistance(distanceMeters)} km` : null,
      pace,
    ]),
    date: activity.date,
    href: `/activities/${encodeURIComponent(activity.id)}`,
    badge: null,
  };
}

export function raceCountdown(date: string, today: string) {
  const days = daysUntil(date, today);
  if (days === 0) return "aujourd’hui";
  return days > 0 ? `J-${days}` : "passée";
}

export function raceEntry(
  race: { id: string; name: string; date: string | null },
  today: string,
): SearchEntry {
  return {
    kind: "race",
    id: `race:${race.id}`,
    title: race.name,
    detail: race.date
      ? joinDetail([
          raceDay.format(new Date(`${race.date}T00:00:00Z`)),
          raceCountdown(race.date, today),
        ])
      : "Date à préciser",
    date: race.date,
    href: `/races/${encodeURIComponent(race.id)}`,
    badge: null,
  };
}
