import { sessionStatuses } from "../matching/adherence";
import { addDays, mondayOf } from "../model/dates";
import type { PlanSession } from "../model/plan";
import type { Zone } from "@/components/stride/session-blocks";
import {
  hasQualityWork,
  isRunningSession,
  sessionDistance,
} from "../model/volume";
import { formatDayMonthShort } from "@/features/progress/format";
import { formatDistance, formatDuration, formatFullDate } from "./format";
import { dayIntensity } from "./intensity";
import {
  approximate,
  completeDistance,
  complianceRatio,
  type ProgramDaySession,
  type ProgramInput,
  type ProgramWeek,
  type SeasonProgram,
} from "./program";

export type CalendarSession = Pick<
  ProgramDaySession,
  "sessionKey" | "raceId" | "family" | "title" | "duration" | "state"
> & { zone: Zone | null };

export type CalendarDay = {
  date: string;
  dayNumber: number;
  label: string;
  inMonth: boolean;
  inPlan: boolean;
  isToday: boolean;
  isPast: boolean;
  rest: boolean;
  sessions: CalendarSession[];
};

export type CalendarWeek = {
  weekStart: string;
  label: string;
  days: CalendarDay[];
};

export type CalendarTotals = { duration: string; distance: string | null };

export type CalendarSummary = {
  planned: CalendarTotals;
  done: CalendarTotals;
  sessions: number;
  quality: number;
  lightWeeks: { label: string; range: string }[];
};

export type CalendarRace = {
  raceId: string;
  name: string;
  when: string;
  detail: string;
};

export type CalendarMonth = {
  month: string;
  title: string;
  monthName: string;
  subtitle: string | null;
  isCurrent: boolean;
  previous: string | null;
  next: string | null;
  weeks: CalendarWeek[];
  legend: Zone[];
  summary: CalendarSummary;
  upcoming: CalendarRace[];
};

const monthPattern = /^(\d{4})-(0[1-9]|1[0-2])$/;
const monthTitle = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const monthLong = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: "UTC",
});
const upcomingLimit = 3;

export function parseCalendarMonth(value: string | null) {
  return value !== null && monthPattern.test(value) ? value : null;
}

function shiftMonth(month: string, offset: number) {
  const [year, index] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, index - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function calendarSession(session: ProgramDaySession): CalendarSession {
  return {
    sessionKey: session.sessionKey,
    raceId: session.raceId,
    family: session.family,
    title: session.title,
    duration: session.duration,
    state: session.state,
    zone: dayIntensity(session.family, session.blocks)?.level ?? null,
  };
}

function seasonWeeks(seasons: SeasonProgram[]) {
  const weeks = new Map<string, ProgramWeek>();
  for (const season of seasons)
    for (const week of season.weeks)
      if (!weeks.has(week.weekStart)) weeks.set(week.weekStart, week);
  return [...weeks.values()].sort((first, second) =>
    first.weekStart.localeCompare(second.weekStart),
  );
}

function subtitle(weeks: ProgramWeek[]) {
  if (weeks.length === 0) return null;
  const blocks = [...new Set(weeks.map((week) => week.blockName))].filter(
    Boolean,
  );
  const first = weeks[0].number;
  const last = weeks.at(-1)!.number;
  const ascending = weeks.every(
    (week, index) => index === 0 || week.number === weeks[index - 1].number + 1,
  );
  const span = !ascending
    ? null
    : first === last
      ? `semaine ${first}`
      : `semaines ${first} à ${last}`;
  return [blocks.join(", "), span].filter(Boolean).join(" · ") || null;
}

function summary(
  input: ProgramInput,
  sessions: PlanSession[],
  weeks: ProgramWeek[],
): CalendarSummary {
  const statuses = sessionStatuses(input.matches);
  const compliance = new Map(
    input.matches.map((match) => [match.sessionKey, match.compliance]),
  );
  const paces = input.paces ?? null;
  const counted = sessions.filter(
    (session) => session.kind !== "rest" && session.kind !== "race",
  );
  const runs = counted.filter(isRunningSession);
  const done = runs.filter((session) => {
    const status = statuses.get(session.sessionKey);
    return status === "completed" || status === "partial";
  });
  const planned = completeDistance(
    runs.map((session) => sessionDistance(session, paces)),
  );
  const doneDistance =
    planned === null
      ? null
      : done.length === 0
        ? { meters: 0, estimated: false }
        : completeDistance(
            done.map((session) => {
              const distance = sessionDistance(session, paces);
              return (
                distance && {
                  meters: Math.round(
                    distance.meters *
                      complianceRatio(
                        compliance.get(session.sessionKey)?.distance ?? null,
                      ),
                  ),
                  estimated: distance.estimated,
                }
              );
            }),
          );
  const seconds = (items: PlanSession[], ratio: (key: string) => number) =>
    Math.round(
      items.reduce(
        (total, session) =>
          total + session.targets.durationSeconds * ratio(session.sessionKey),
        0,
      ),
    );
  return {
    planned: {
      duration: formatDuration(seconds(runs, () => 1)),
      distance:
        planned &&
        approximate(formatDistance(planned.meters), planned.estimated),
    },
    done: {
      duration: formatDuration(
        seconds(done, (key) =>
          complianceRatio(compliance.get(key)?.duration ?? null),
        ),
      ),
      distance:
        doneDistance &&
        approximate(
          formatDistance(doneDistance.meters),
          doneDistance.estimated,
        ),
    },
    sessions: counted.length,
    quality: counted.filter(hasQualityWork).length,
    lightWeeks: weeks
      .filter((week) => week.isLight)
      .map((week) => ({ label: `S${week.number}`, range: week.range })),
  };
}

function upcoming(
  input: ProgramInput,
  seasons: SeasonProgram[],
  end: string,
): CalendarRace[] {
  const objectives = new Set([
    input.state.plan.primaryRaceId,
    ...seasons.map((season) => season.raceId),
  ]);
  return input.races
    .filter(
      (race): race is typeof race & { date: string } =>
        race.date !== null && race.date >= input.today && race.date <= end,
    )
    .sort((first, second) => first.date.localeCompare(second.date))
    .slice(0, upcomingLimit)
    .map((race) => ({
      raceId: race.id,
      name: race.name,
      when: formatDayMonthShort(race.date),
      detail: objectives.has(race.id)
        ? "objectif"
        : race.priority
          ? `course ${race.priority}`
          : "course",
    }));
}

export function calendarMonth({
  input,
  seasons,
  month,
}: {
  input: ProgramInput;
  seasons: SeasonProgram[];
  month: string | null;
}): CalendarMonth | null {
  const planWeeks = seasonWeeks(seasons);
  if (planWeeks.length === 0) return null;
  const planStart = planWeeks[0].weekStart;
  const planEnd = addDays(planWeeks.at(-1)!.weekStart, 6);
  const firstMonth = planStart.slice(0, 7);
  const lastMonth = planEnd.slice(0, 7);
  const todayMonth = input.today.slice(0, 7);
  const requested = parseCalendarMonth(month) ?? todayMonth;
  const shown =
    requested < firstMonth
      ? firstMonth
      : requested > lastMonth
        ? lastMonth
        : requested;
  const monthStart = `${shown}-01`;
  const monthEnd = addDays(`${shiftMonth(shown, 1)}-01`, -1);
  const byStart = new Map(planWeeks.map((week) => [week.weekStart, week]));
  const rows: CalendarWeek[] = [];
  for (
    let weekStart = mondayOf(monthStart);
    weekStart <= monthEnd;
    weekStart = addDays(weekStart, 7)
  ) {
    const planWeek = byStart.get(weekStart) ?? null;
    rows.push({
      weekStart,
      label: `Semaine du ${formatDayMonthShort(weekStart)}`,
      days: Array.from({ length: 7 }, (_, offset) => {
        const date = addDays(weekStart, offset);
        const planDay = planWeek?.days[offset] ?? null;
        return {
          date,
          dayNumber: Number(date.slice(8)),
          label: formatFullDate(date),
          inMonth: date >= monthStart && date <= monthEnd,
          inPlan: planDay !== null,
          isToday: date === input.today,
          isPast: date < input.today,
          rest: planDay !== null && planDay.sessions.length === 0,
          sessions: (planDay?.sessions ?? []).map(calendarSession),
        };
      }),
    });
  }
  const shownWeeks = rows.flatMap((row) => {
    const week = byStart.get(row.weekStart);
    return week ? [week] : [];
  });
  const monthSessions = input.state.sessions.filter(
    (session) =>
      session.scheduledOn >= monthStart && session.scheduledOn <= monthEnd,
  );
  return {
    month: shown,
    title: capitalize(monthTitle.format(new Date(`${monthStart}T00:00:00Z`))),
    monthName: capitalize(
      monthLong.format(new Date(`${monthStart}T00:00:00Z`)),
    ),
    subtitle: subtitle(shownWeeks),
    isCurrent: shown === todayMonth,
    previous: shown > firstMonth ? shiftMonth(shown, -1) : null,
    next: shown < lastMonth ? shiftMonth(shown, 1) : null,
    weeks: rows,
    legend: [
      ...new Set(
        rows.flatMap((row) =>
          row.days.flatMap((day) =>
            day.inMonth
              ? day.sessions.flatMap((session) =>
                  session.zone === null ? [] : [session.zone],
                )
              : [],
          ),
        ),
      ),
    ].sort((first, second) => first - second),
    summary: summary(input, monthSessions, shownWeeks),
    upcoming: upcoming(input, seasons, planEnd),
  };
}
