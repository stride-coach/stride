import { sessionPanelHref } from "@/features/plans/view/session-href";
import type { DebriefView } from "@/features/plans/debrief/view";
import {
  activityKind,
  activityTitle,
  formatDistance as formatActivityDistance,
  formatPace as formatActivityPace,
  type Activity,
} from "@/features/activities/activities";
import type { PairQuestion } from "@/features/gear/check-view";
import type { MatchStatus } from "@/features/plans/matching/adherence";
import { addDays } from "@/features/plans/model/dates";
import { moveDays, type MoveDay } from "./move";
import type { PlanState } from "@/features/plans/model/plan";
import { isQuality } from "@/features/plans/validation/input";
import {
  formatDistance,
  formatDuration,
  formatLongDay,
} from "@/features/plans/view/format";
import {
  dayIntensity,
  type SessionIntensity as TodayIntensity,
} from "@/features/plans/view/intensity";
import {
  orderDaySessions,
  sessionFamilyOf,
  type DayState,
  type ProgramOverview,
  type ProgramRace,
  type SessionFamily,
} from "@/features/plans/view/program";
import type { SessionPanel } from "@/features/plans/view/session-panel";
import {
  activityCountLabel,
  activityTotals,
} from "@/features/plans/view/session-activities";
import { formatClock, formatInteger } from "@/features/progress/format";
import {
  readinessTones,
  type Readiness,
  type RecoveryModel,
} from "@/features/progress/recovery";
import {
  formIndicators,
  todayVerdict,
  type FormIndicator,
  type TodayVerdict,
} from "./verdict";

export type TodayHeader = { date: string };

export type TodaySessionStat = { key: string; value: string; label: string };

export type TodayDaySession = {
  sessionKey: string;
  family: SessionFamily;
  title: string;
  summary: string | null;
  status: "done" | "partial" | "substituted" | null;
  note: string;
  label: string;
  href: string;
};

export type TodaySession =
  | {
      kind: "session";
      panel: SessionPanel;
      stats: TodaySessionStat[];
      terrain: string | null;
      quality: boolean;
      href: string;
      count: number;
      before: TodayDaySession[];
      after: TodayDaySession[];
      moveDays: MoveDay[];
    }
  | {
      kind: "rest";
      next: { title: string; when: string; href: string } | null;
    }
  | { kind: "none" };

export type TodayForm = {
  score: number | null;
  level: string | null;
  tone: "success" | "warning" | "danger";
  gap: string | null;
  indicators: FormIndicator[];
};

export type TodayWeekDay = {
  date: string;
  dayLabel: string;
  letter: string;
  duration: string | null;
  distance: string | null;
  elevation: string | null;
  intensity: TodayIntensity | null;
  compliance: number | null;
  href: string | null;
  family: SessionFamily;
  families: SessionFamily[];
  title: string;
  state: DayState;
  doneCount: number;
  isToday: boolean;
  isPast: boolean;
  label: string;
};

const shortDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  timeZone: "UTC",
});

export function shortDayLabel(date: string) {
  const label = shortDay.format(new Date(`${date}T00:00:00Z`)).replace(".", "");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export type TodayWeek = {
  number: number;
  total: number;
  blockName: string;
  days: TodayWeekDay[];
  done: { duration: string; distance: string | null };
  planned: { duration: string; distance: string | null };
  pct: number;
  href: string;
};

export type TodayActivity = {
  heading: string;
  title: string;
  family: SessionFamily;
  detail: string;
  compliance: { pct: number | null; partial: boolean } | null;
  href: string;
};

export type TodayQueueItem =
  | {
      kind: "feeling";
      key: string;
      label: string;
      activityId: string;
      activity: TodayActivity;
    }
  | {
      kind: "pair";
      key: string;
      label: string;
      question: PairQuestion;
      activity: TodayActivity | null;
    }
  | { kind: "legs"; key: string; label: string; hint: string };

export type TodayGoal = {
  id: string;
  letter: string;
  name: string;
  detail: string;
  days: number;
  block: { name: string; week: string } | null;
  light: string | null;
  href: string;
};

export type TodayView = {
  header: TodayHeader;
  session: TodaySession;
  verdict: TodayVerdict | null;
  form: TodayForm;
  queue: TodayQueueItem[];
  week: TodayWeek | null;
  goal: TodayGoal | null;
};

export type TodayMatch = {
  sessionKey: string;
  activityId: string | null;
  status: MatchStatus;
  compliance: { duration: number | null };
};

export type TodayInput = {
  today: string;
  plan: PlanState | null;
  program: ProgramOverview | null;
  races: ProgramRace[];
  matches: TodayMatch[];
  panels: SessionPanel[];
  recovery: RecoveryModel;
  latest: Activity | null;
  latestGroup?: Activity[];
  debrief?: DebriefView | null;
  pairQuestion?: PairQuestion | null;
  pain?: boolean;
};

const dayMs = 86_400_000;
const weekdayLetters = ["L", "M", "M", "J", "V", "S", "D"];
const priorityRank: Record<string, number> = { A: 0, B: 1, C: 2 };

const weekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  timeZone: "UTC",
});
const numericDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const kilometers = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

const levelLabels: Record<Readiness["level"], string> = {
  high: "Élevée",
  moderate: "Modérée",
  low: "Basse",
  poor: "Faible",
};

const statOrder = ["duration", "distance", "pace", "heart-rate", "intensity"];

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs,
  );
}

export function formatTodayDate(iso: string) {
  const value = new Date(`${iso}T00:00:00Z`);
  return `${weekday.format(value)} ${numericDate.format(value)}`;
}

function upcomingRaces(races: ProgramRace[], today: string) {
  return races
    .filter(
      (race): race is ProgramRace & { date: string } =>
        race.date !== null && race.date >= today,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function currentWeek(program: ProgramOverview | null) {
  return (
    program?.weeks.find((week) => week.weekKey === program.currentWeekKey) ??
    null
  );
}

function goal(input: TodayInput): TodayGoal | null {
  const races = upcomingRaces(input.races, input.today);
  const primary = input.plan?.plan.primaryRaceId ?? null;
  const race =
    races.find((item) => item.id === primary) ??
    [...races].sort(
      (a, b) =>
        (priorityRank[a.priority ?? ""] ?? 3) -
          (priorityRank[b.priority ?? ""] ?? 3) || a.date.localeCompare(b.date),
    )[0];
  if (!race) return null;
  const { program, today } = input;
  const current = currentWeek(program);
  const light = program?.weeks.find(
    (week) => week.isLight && week.weekStart > today && !week.race,
  );
  return {
    id: race.id,
    letter: race.priority ?? "·",
    name: race.name,
    detail: [
      formatTodayDate(race.date),
      race.distanceKm !== null && `${kilometers.format(race.distanceKm)} km`,
      race.elevationGainM !== null &&
        race.elevationGainM > 0 &&
        `${formatInteger(race.elevationGainM)} m D+`,
    ]
      .filter(Boolean)
      .join(" · "),
    days: daysBetween(today, race.date),
    block:
      current && program
        ? {
            name: current.blockName,
            week: `S${current.number} / ${program.weeks.length}`,
          }
        : null,
    light: light
      ? `S${light.number} · dès le ${formatTodayDate(light.weekStart)}`
      : null,
    href: `/races/${race.id}`,
  };
}

function isPanelDone(panel: SessionPanel) {
  return (
    panel.status === "done" ||
    panel.status === "partial" ||
    panel.status === "substituted" ||
    panel.checkIn?.done === true
  );
}

function focusIndex(panels: SessionPanel[]) {
  const index = panels.findIndex((panel) => !isPanelDone(panel));
  return index === -1 ? panels.length - 1 : index;
}

function daySession(
  panel: SessionPanel,
  summaries: Map<string, string | null>,
): TodayDaySession {
  const status =
    panel.status === "done" ||
    panel.status === "partial" ||
    panel.status === "substituted"
      ? panel.status
      : panel.checkIn?.done
        ? "done"
        : null;
  const completion = panel.completion;
  const note =
    status === null
      ? "À venir"
      : status === "substituted"
        ? "Remplacée"
        : completion
          ? [
              status === "partial" ? "Fait en partie" : "Fait",
              completion.durationSeconds !== null &&
                formatDuration(completion.durationSeconds),
              completion.startTime && `Garmin ${completion.startTime}`,
            ]
              .filter(Boolean)
              .join(" · ")
          : "Fait · noté par toi";
  const summary = summaries.get(panel.sessionKey) ?? null;
  return {
    sessionKey: panel.sessionKey,
    family: panel.family,
    title: panel.title,
    summary,
    status,
    note,
    label: [
      panel.title,
      summary,
      status === null
        ? "à venir"
        : status === "substituted"
          ? "remplacée"
          : status === "partial"
            ? "fait en partie"
            : "fait",
      "voir la séance",
    ]
      .filter(Boolean)
      .join(", "),
    href: sessionPanelHref(panel.sessionKey),
  };
}

function daySummaries(program: ProgramOverview | null, today: string) {
  const day = currentWeek(program)?.days.find((item) => item.date === today);
  return new Map(
    (day?.sessions ?? []).map((item) => [item.sessionKey, item.summary]),
  );
}

function session(input: TodayInput): TodaySession {
  const { panels, plan, today } = input;
  const index = focusIndex(panels);
  const panel = panels[index];
  if (panel) {
    const summaries = daySummaries(input.program, today);
    const planned = plan?.sessions.find(
      (item) => item.sessionKey === panel.sessionKey,
    );
    const stats = statOrder
      .flatMap((key) => panel.stats.filter((stat) => stat.key === key))
      .slice(0, 4);
    return {
      kind: "session",
      panel,
      stats,
      terrain:
        panel.stats.find((stat) => stat.key === "terrain")?.value ?? null,
      quality: planned ? isQuality(planned) : false,
      href: sessionPanelHref(panel.sessionKey),
      count: panels.length,
      before: panels.slice(0, index).map((item) => daySession(item, summaries)),
      after: panels.slice(index + 1).map((item) => daySession(item, summaries)),
      moveDays: plan ? moveDays(plan, panel.sessionKey, today) : [],
    };
  }
  if (!plan) return { kind: "none" };
  const next = plan.sessions
    .filter(
      (item) =>
        item.scheduledOn > today &&
        item.kind !== "rest" &&
        item.sport !== "rest",
    )
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))[0];
  return {
    kind: "rest",
    next: next
      ? {
          title: next.title,
          when: formatTodayDate(next.scheduledOn),
          href: sessionPanelHref(next.sessionKey),
        }
      : null,
  };
}

function form(model: RecoveryModel): TodayForm {
  const score = model.readiness;
  const gap =
    score && score.average !== null
      ? Math.round(score.today - score.average)
      : null;
  return {
    score: score?.today ?? null,
    level: score ? levelLabels[score.level] : null,
    tone: score ? readinessTones[score.level] : "warning",
    gap:
      gap === null
        ? null
        : gap === 0
          ? "dans ta moyenne 14 j"
          : `${formatInteger(Math.abs(gap))} ${gap < 0 ? "sous" : "au-dessus de"} ta moyenne 14 j`,
    indicators: formIndicators(model),
  };
}

function week(program: ProgramOverview | null): TodayWeek | null {
  const current = currentWeek(program);
  if (!current || !program) return null;
  const distance = (meters: number | null, estimated: boolean) =>
    meters === null
      ? null
      : `${estimated ? "≈ " : ""}${formatDistance(meters)}`;
  const stateLabels: Record<Exclude<DayState, null>, string> = {
    done: "fait",
    partial: "fait en partie",
    substituted: "remplacé",
    missed: "non fait",
    proposed: "changement proposé",
  };
  return {
    number: current.number,
    total: program.weeks.length,
    blockName: current.blockName,
    days: current.days.map((day, index) => {
      const state = day.family === "rest" ? null : day.state;
      const multiple = day.sessions.length > 1;
      const doneCount = day.sessions.filter(
        (item) => item.state === "done" || item.state === "partial",
      ).length;
      const sessions = multiple
        ? `${day.sessions.length} séances : ${day.sessions
            .map((item) =>
              item.state
                ? `${item.title} ${stateLabels[item.state]}`
                : item.title,
            )
            .join(", puis ")}`
        : null;
      return {
        date: day.date,
        dayLabel: shortDayLabel(day.date),
        letter: weekdayLetters[index] ?? day.weekday.charAt(0).toUpperCase(),
        duration: multiple ? null : day.duration,
        distance: multiple ? null : day.distance,
        elevation: multiple ? null : day.elevation,
        intensity: dayIntensity(day.family, day.blocks),
        compliance: multiple ? null : day.compliancePct,
        href: day.sessionKey ? sessionPanelHref(day.sessionKey) : null,
        family: day.family,
        families: multiple
          ? day.sessions.map((item) => item.family)
          : [day.family],
        title: day.title,
        state,
        doneCount,
        isToday: day.isToday,
        isPast: day.isPast,
        label: [
          formatLongDay(day.date),
          sessions ?? day.title,
          day.isToday ? "aujourd’hui" : null,
          multiple
            ? `${doneCount} sur ${day.sessions.length} faites`
            : state
              ? stateLabels[state]
              : null,
        ]
          .filter(Boolean)
          .join(" · "),
      };
    }),
    done: {
      duration: formatDuration(current.done.durationSeconds),
      distance: distance(
        current.done.distanceMeters,
        current.done.distanceEstimated,
      ),
    },
    planned: {
      duration: formatDuration(current.totals.durationSeconds),
      distance: distance(
        current.totals.distanceMeters,
        current.totals.distanceEstimated,
      ),
    },
    pct:
      current.totals.durationSeconds > 0
        ? Math.min(
            100,
            Math.round(
              (current.done.durationSeconds / current.totals.durationSeconds) *
                100,
            ),
          )
        : 0,
    href: `/plan?week=${current.weekStart}`,
  };
}

function latest(input: TodayInput): TodayActivity | null {
  const activity = input.latest;
  if (!activity) return null;
  const { today } = input;
  const heading =
    activity.date === today
      ? "Aujourd’hui"
      : activity.date === addDays(today, -1)
        ? "Hier"
        : formatTodayDate(activity.date);
  const match = input.matches.find((item) => item.activityId === activity.id);
  const session = match
    ? input.plan?.sessions.find((item) => item.sessionKey === match.sessionKey)
    : undefined;
  const kind = activityKind(activity.type);
  const pace =
    activity.distanceMeters &&
    activity.distanceMeters >= 100 &&
    activity.durationSeconds &&
    kind !== "other"
      ? `${formatActivityPace(activity.distanceMeters, activity.durationSeconds)} /km`
      : null;
  const title = session ? session.title : activityTitle(activity);
  const group =
    match && session && (input.latestGroup?.length ?? 0) > 1
      ? (input.latestGroup ?? [])
      : null;
  const totals = group ? activityTotals(group) : null;
  return {
    heading,
    title: group
      ? title
      : activity.durationSeconds
        ? `${title} · ${formatDuration(activity.durationSeconds)}`
        : title,
    family: session
      ? sessionFamilyOf(session)
      : kind === "trail"
        ? "long_trail"
        : kind === "road"
          ? "easy"
          : "cross",
    detail: group
      ? [
          activityCountLabel(group.length),
          totals?.durationSeconds && formatClock(totals.durationSeconds),
          totals?.distanceMeters &&
            `${formatActivityDistance(totals.distanceMeters)} km`,
        ]
          .filter(Boolean)
          .join(" · ")
      : [
          activity.distanceMeters !== null &&
            `${formatActivityDistance(activity.distanceMeters)} km`,
          pace,
          activity.averageHeartRate !== null &&
            `FC ${formatInteger(activity.averageHeartRate)}`,
        ]
          .filter(Boolean)
          .join(" · ") || formatTodayDate(activity.date),
    compliance:
      match && (match.status === "completed" || match.status === "partial")
        ? {
            pct:
              match.compliance.duration === null
                ? null
                : Math.round(match.compliance.duration * 100),
            partial: match.status === "partial",
          }
        : null,
    href:
      group && match
        ? sessionPanelHref(match.sessionKey)
        : `/activities/${activity.id}`,
  };
}

function queue(input: TodayInput): TodayQueueItem[] {
  const activity = latest(input);
  const items: TodayQueueItem[] = [];
  const suffix =
    activity?.heading === "Hier"
      ? " d’hier"
      : activity?.heading === "Aujourd’hui"
        ? " du jour"
        : "";
  const debrief =
    input.latest && input.debrief?.activityIds.includes(input.latest.id)
      ? input.debrief
      : null;
  if (activity && input.latest && debrief && !debrief.feeling)
    items.push({
      kind: "feeling",
      key: `feeling-${debrief.activityId}`,
      label: `ton ressenti${suffix}`,
      activityId: debrief.activityId,
      activity,
    });
  const question = input.pairQuestion ?? null;
  if (question)
    items.push({
      kind: "pair",
      key: `pair-${question.activityId}`,
      label: `ta paire${question.activityId === input.latest?.id ? suffix : ""}`,
      question,
      activity: question.activityId === input.latest?.id ? activity : null,
    });
  if (!input.recovery.checkin?.legs)
    items.push({
      kind: "legs",
      key: "legs",
      label: "tes jambes",
      hint: "Ton ressenti complète la forme du jour.",
    });
  return items;
}

export function todaySessionKeys(plan: PlanState | null, today: string) {
  if (!plan) return [];
  return orderDaySessions(
    plan.sessions.filter(
      (item) =>
        item.scheduledOn === today &&
        item.kind !== "rest" &&
        item.sport !== "rest",
    ),
  ).map((item) => item.sessionKey);
}

export function todaySessionKey(plan: PlanState | null, today: string) {
  if (!plan) return null;
  const sessions = plan.sessions.filter(
    (item) =>
      item.scheduledOn === today &&
      item.kind !== "rest" &&
      item.sport !== "rest",
  );
  return (
    sessions.find((item) => item.isKey)?.sessionKey ??
    sessions[0]?.sessionKey ??
    null
  );
}

export function buildToday(input: TodayInput): TodayView {
  const today = session(input);
  const day = form(input.recovery);
  const planned =
    today.kind === "session"
      ? input.plan?.sessions.find(
          (item) => item.sessionKey === today.panel.sessionKey,
        )
      : undefined;
  const done =
    today.kind === "session" &&
    (today.panel.status === "done" ||
      today.panel.status === "partial" ||
      today.panel.status === "substituted");
  return {
    header: { date: formatTodayDate(input.today) },
    session: today,
    verdict: done
      ? null
      : todayVerdict({
          readiness: input.recovery.readiness,
          indicators: day.indicators,
          pain: input.pain ?? false,
          session:
            today.kind === "session"
              ? {
                  kind: "session",
                  sessionKey: today.panel.sessionKey,
                  title: planned?.title ?? today.panel.title,
                  quality: today.quality,
                  href: today.href,
                }
              : today,
        }),
    form: day,
    queue: queue(input),
    week: week(input.program),
    goal: goal(input),
  };
}
