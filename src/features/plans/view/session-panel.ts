import type { Series } from "@/features/activities/track";
import type { SessionShoesView } from "@/features/gear/planned";
import {
  formatClock,
  formatDayMonthShort,
  formatDecimal,
  formatPace,
} from "@/features/progress/format";
import { cardiacDrift } from "@/features/progress/measures";
import { activityTitle } from "@/features/activities/activities";
import type { AthleteFeeling } from "../debrief/debrief";
import { buildDebriefView, type DebriefView } from "../debrief/view";
import type { MatchStatus } from "../matching/adherence";
import { addDays, mondayOf } from "../model/dates";
import { compareSessions, sessionKeyDate } from "../model/keys";
import type { PlanSession, PlanState } from "../model/plan";
import type { IntensityPaces } from "../model/structure";
import {
  hasIntensity,
  isUntrackedSession,
  sessionDistance,
} from "../model/volume";
import { paceMidpoints, type IntensityPaceRanges } from "../targets/targets";
import { formatDistance, formatDuration, formatLongDay } from "./format";
import {
  chartSegments,
  sessionStats,
  stepViews,
  type ChartSegment,
  type StepView,
} from "./plan-view";
import { familyLabels, sessionFamilyOf, type SessionFamily } from "./program";
import {
  activityCountLabel,
  activityTotals,
  byStartTime,
  mainActivity,
  mergeLaps,
  startTimesLabel,
} from "./session-activities";

export type PanelMatch = {
  sessionKey: string;
  activityId: string | null;
  status: MatchStatus;
  compliance: {
    duration: number | null;
    distance: number | null;
    intensity?: number | null;
  };
};

export type PanelProposal = {
  id: string;
  title: string;
  summary: string | null;
  targetKeys: string[];
  createdAt: string;
};

export type PanelActivity = {
  id: string;
  type?: string | null;
  name?: string | null;
  routeName?: string | null;
  startedAt: string;
  date: string;
  localTime: string | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  averageHeartRate: number | null;
  detailImportedAt: string | null;
  perceivedEffort?: number | null;
  feel?: number | null;
};

export type PanelLap = {
  index: number;
  durationSeconds: number | null;
  distanceMeters: number | null;
  averageHeartRate: number | null;
};

export type PanelActivityRead = {
  activity: PanelActivity;
  laps: PanelLap[];
  series: Series | null;
};

export type SessionPanelInput = {
  state: PlanState;
  today: string;
  sessionKey: string;
  matches: PanelMatch[];
  proposals: PanelProposal[];
  activities: PanelActivityRead[];
  paceRanges?: IntensityPaceRanges | null;
  shoes?: SessionShoesView | null;
  feeling?: AthleteFeeling | null;
  readOnly?: boolean;
};

export type PanelStatus =
  "today" | "done" | "partial" | "substituted" | "missed" | null;

export type PanelTone = "success" | "warning" | "danger" | "muted";

export type PanelStat = { key: string; value: string; label: string };

export type PanelRow = {
  key: string;
  label: string;
  planned: string;
  actual: string;
  tone: PanelTone;
};

export type PanelActivityItem = {
  id: string;
  href: string;
  time: string | null;
  title: string;
  detail: string;
  duration: string | null;
};

export type PanelCompletion = {
  activityId: string;
  pct: number | null;
  durationSeconds: number | null;
  startTime: string | null;
  headline: string;
  detail: string;
  rows: PanelRow[];
  totalsLabel: string | null;
  activities: PanelActivityItem[];
  pace: number[];
  paceLabel: string | null;
  debrief: DebriefView | null;
};

export type PanelCheckIn = { done: boolean };

function surgeIdeas(session: PlanSession) {
  const trail = session.sport === "trail" || session.terrain === "trail";
  return [
    "30” vif · trottine 1’",
    trail
      ? "1’ au seuil dans une montée · récupère en descente"
      : "1’ au seuil · trottine 1’",
    trail
      ? "3’ soutenu sur un replat · trottine 2’"
      : "3’ soutenu · trottine 2’",
  ];
}

export type SessionPanel = {
  sessionKey: string;
  day: string;
  heading: string;
  position: { index: number; count: number };
  previousKey: string | null;
  nextKey: string | null;
  family: SessionFamily;
  intensity: boolean;
  untracked: boolean;
  checkIn: PanelCheckIn | null;
  summary: string | null;
  status: PanelStatus;
  title: string;
  purpose: string;
  proposal: { id: string; when: string; text: string } | null;
  stats: PanelStat[];
  segments: ChartSegment[];
  structureLabel: string;
  steps: StepView[];
  contingencies: string[];
  surgeIdeas: string[];
  completion: PanelCompletion | null;
  shoes: SessionShoesView | null;
  readOnly: boolean;
};

const statusLabels: Record<Exclude<PanelStatus, null>, string> = {
  today: "Aujourd’hui",
  done: "Fait",
  partial: "Fait en partie",
  substituted: "Remplacé",
  missed: "Non fait",
};

export function panelStatusLabel(status: Exclude<PanelStatus, null>) {
  return statusLabels[status];
}

function minutes(seconds: number) {
  const value = Math.round(seconds / 60);
  return value < 60 ? `${value} min` : formatDuration(seconds);
}

function weekSessions(state: PlanState, session: PlanSession) {
  const start = mondayOf(session.scheduledOn);
  const end = addDays(start, 6);
  return state.sessions
    .filter(
      (item) =>
        item.scheduledOn >= start &&
        item.scheduledOn <= end &&
        item.kind !== "rest" &&
        item.sport !== "rest",
    )
    .sort(compareSessions);
}

function tone(ratio: number | null): PanelTone {
  if (ratio === null || !Number.isFinite(ratio)) return "muted";
  const gap = Math.abs(ratio - 1);
  return gap <= 0.05 ? "success" : gap <= 0.15 ? "warning" : "danger";
}

const kilometers = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function proposalWhen(createdAt: string, today: string, timeZone: string) {
  const created = new Date(createdAt);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(created);
  const part = (type: string) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const day = `${part("year")}-${part("month")}-${part("day")}`;
  const hour = Number(part("hour"));
  if (day === today)
    return hour < 12 ? "ce matin" : hour < 18 ? "cet après-midi" : "ce soir";
  if (day === addDays(today, -1)) return "hier";
  return `le ${formatDayMonthShort(day)}`;
}

export function paceByMinute(series: Series | null) {
  const elapsed = series?.elapsed_s;
  const distance = series?.distance_m;
  if (!elapsed || !distance) return [];
  const samples = elapsed.flatMap((time, index) => {
    const meters = distance[index];
    return time !== null && meters !== null && meters !== undefined
      ? [{ time, meters }]
      : [];
  });
  if (samples.length < 2) return [];
  const at = (time: number) => {
    let low = 0;
    let high = samples.length - 1;
    if (time <= samples[0].time) return samples[0].meters;
    if (time >= samples[high].time) return samples[high].meters;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (samples[middle].time <= time) low = middle;
      else high = middle;
    }
    const first = samples[low];
    const second = samples[high];
    const share = (time - first.time) / (second.time - first.time || 1);
    return first.meters + (second.meters - first.meters) * share;
  };
  const total = samples.at(-1)!.time - samples[0].time;
  const count = Math.floor(total / 60);
  return Array.from({ length: count }, (_, minute) => {
    const start = samples[0].time + minute * 60;
    const meters = at(start + 60) - at(start);
    return meters > 0 ? Math.round(60_000 / meters) : null;
  }).filter((value): value is number => value !== null);
}

function activityItem(activity: PanelActivity): PanelActivityItem {
  const pace =
    activity.distanceMeters && activity.durationSeconds
      ? `${formatPace(activity.durationSeconds / (activity.distanceMeters / 1000))} /km`
      : null;
  return {
    id: activity.id,
    href: `/activities/${activity.id}`,
    time: activity.localTime,
    title: activityTitle({
      name: activity.name ?? null,
      type: activity.type ?? null,
      routeName: activity.routeName ?? null,
    }),
    detail: [
      activity.distanceMeters !== null &&
        `${kilometers.format(activity.distanceMeters / 1000)} km`,
      pace,
      activity.averageHeartRate !== null &&
        `FC ${Math.round(activity.averageHeartRate)}`,
    ]
      .filter(Boolean)
      .join(" · "),
    duration:
      activity.durationSeconds !== null
        ? formatClock(activity.durationSeconds)
        : null,
  };
}

function completion(
  input: SessionPanelInput,
  session: PlanSession,
  match: PanelMatch,
  paces: IntensityPaces | null,
): PanelCompletion | null {
  const reads = [...input.activities].sort((first, second) =>
    byStartTime(first.activity, second.activity),
  );
  const activities = reads.map((read) => read.activity);
  const main = mainActivity(activities);
  if (!main || !match.activityId) return null;
  const multiple = reads.length > 1;
  const totals = activityTotals(activities);
  const laps = mergeLaps(reads.map((read) => read.laps));
  const durationRatio = match.compliance.duration;
  const pct = durationRatio !== null ? Math.round(durationRatio * 100) : null;
  const distance = sessionDistance(session, paces);
  const planned = distance?.meters ?? null;
  const rows: PanelRow[] = [];
  if (totals.durationSeconds !== null)
    rows.push({
      key: "duration",
      label: "Durée",
      planned: formatDuration(session.targets.durationSeconds),
      actual: formatClock(totals.durationSeconds),
      tone: tone(totals.durationSeconds / session.targets.durationSeconds),
    });
  if (totals.distanceMeters !== null)
    rows.push({
      key: "distance",
      label: "Distance",
      planned: distance
        ? `${distance.estimated ? "≈ " : ""}${formatDistance(distance.meters)}`
        : "–",
      actual: `${kilometers.format(totals.distanceMeters / 1000)} km`,
      tone: tone(planned !== null ? totals.distanceMeters / planned : null),
    });
  if (totals.distanceMeters && totals.durationSeconds) {
    const actualPace = totals.durationSeconds / (totals.distanceMeters / 1000);
    const plannedPace =
      planned !== null
        ? session.targets.durationSeconds / (planned / 1000)
        : null;
    rows.push({
      key: "pace",
      label: "Allure",
      planned: plannedPace !== null ? `${formatPace(plannedPace)} /km` : "–",
      actual: `${formatPace(actualPace)} /km`,
      tone: tone(plannedPace !== null ? actualPace / plannedPace : null),
    });
  }
  if (totals.averageHeartRate !== null)
    rows.push({
      key: "heart-rate",
      label: "FC moyenne",
      planned: "–",
      actual: `${Math.round(totals.averageHeartRate)} bpm`,
      tone: "muted",
    });
  const drift = multiple
    ? null
    : cardiacDrift(
        laps.flatMap((lap) =>
          lap.durationSeconds !== null && lap.distanceMeters !== null
            ? [
                {
                  activityId: main.id,
                  index: lap.index,
                  duration: lap.durationSeconds,
                  distance: lap.distanceMeters,
                  heartRate: lap.averageHeartRate,
                  gain: null,
                  loss: null,
                },
              ]
            : [],
        ),
      );
  if (drift !== null)
    rows.push({
      key: "drift",
      label: "Dérive cardiaque",
      planned: "–",
      actual: `${formatDecimal(drift)} %`,
      tone: "muted",
    });
  const end =
    main.durationSeconds !== null
      ? Date.parse(main.startedAt) + main.durationSeconds * 1000
      : null;
  const delay =
    end !== null && main.detailImportedAt
      ? Math.round((Date.parse(main.detailImportedAt) - end) / 60_000)
      : null;
  const pace = multiple ? [] : paceByMinute(reads[0].series);
  const debrief =
    match.status === "completed" || match.status === "partial"
      ? buildDebriefView({
          session,
          activityId: main.id,
          activityIds: activities.map((activity) => activity.id),
          laps,
          paceRanges: input.paceRanges ?? null,
          match: {
            status: match.status,
            compliance: {
              duration: match.compliance.duration,
              intensity: match.compliance.intensity ?? null,
            },
          },
          garmin: {
            rpe: main.perceivedEffort ?? null,
            feel: main.feel ?? null,
          },
          athlete: input.feeling ?? null,
          averageHeartRate: totals.averageHeartRate,
        })
      : null;
  const times = startTimesLabel(activities.map((item) => item.localTime));
  return {
    activityId: main.id,
    pct,
    durationSeconds: totals.durationSeconds,
    startTime: activities[0]?.localTime ?? null,
    headline:
      match.status === "partial"
        ? `Fait en partie${pct !== null ? ` · ${pct} % conforme` : ""}`
        : `Fait${pct !== null ? ` · ${pct} % conforme` : ""}`,
    detail: (multiple
      ? [
          formatLongDay(activities[0].date),
          `${activityCountLabel(activities.length)}${times ? `, ${times}` : ""}`,
          "importées de Garmin",
        ]
      : [
          formatLongDay(main.date),
          main.localTime,
          delay !== null && delay >= 0 && delay < 24 * 60
            ? `importé de Garmin ${minutes(delay * 60)} après l’arrêt`
            : "importé de Garmin",
        ]
    )
      .filter(Boolean)
      .join(" · "),
    rows,
    totalsLabel: multiple
      ? `Cumul des ${activityCountLabel(activities.length)}`
      : null,
    activities: multiple ? activities.map(activityItem) : [],
    pace,
    paceLabel:
      pace.length > 0
        ? `Allure minute par minute, de ${formatPace(Math.min(...pace))} à ${formatPace(Math.max(...pace))} /km`
        : null,
    debrief,
  };
}

export function buildSessionPanel(
  input: SessionPanelInput,
): SessionPanel | null {
  const { state, today } = input;
  const session = state.sessions.find(
    (item) => item.sessionKey === input.sessionKey,
  );
  if (!session) return null;
  const readOnly = input.readOnly ?? false;
  const sessions = weekSessions(state, session);
  const index = sessions.findIndex(
    (item) => item.sessionKey === session.sessionKey,
  );
  const weekNumber =
    state.weeks.findIndex(
      (week) => week.weekStart === mondayOf(session.scheduledOn),
    ) + 1;
  const match =
    input.matches.find((item) => item.sessionKey === session.sessionKey) ??
    null;
  const status: PanelStatus =
    match?.status === "completed" || match?.status === "checked_in"
      ? "done"
      : match?.status === "partial"
        ? "partial"
        : match?.status === "substituted"
          ? "substituted"
          : session.scheduledOn === today && !readOnly
            ? "today"
            : session.scheduledOn < today &&
                session.kind !== "race" &&
                !isUntrackedSession(session)
              ? "missed"
              : null;
  const checkIn: PanelCheckIn | null =
    isUntrackedSession(session) &&
    session.scheduledOn <= today &&
    !match?.activityId
      ? { done: match?.status === "checked_in" }
      : null;
  const proposal =
    readOnly || status === "done" || status === "partial"
      ? null
      : (input.proposals.find((item) =>
          item.targetKeys.some((target) => {
            const key = target.slice(target.indexOf(":") + 1);
            return (
              key === session.sessionKey ||
              (sessionKeyDate(key) === session.scheduledOn &&
                !state.sessions.some((other) => other.sessionKey === key))
            );
          }),
        ) ?? null);
  const paceRanges = input.paceRanges ?? null;
  const paces = paceRanges ? paceMidpoints(paceRanges) : null;
  const intensity = hasIntensity(session);
  const family = sessionFamilyOf(session);
  const duration: PanelStat = {
    key: "duration",
    value: minutes(session.targets.durationSeconds),
    label: "Durée",
  };
  const stats = sessionStats(session, null, paces);
  const statList: PanelStat[] = [
    duration,
    ...(stats.distance
      ? [{ key: "distance", value: stats.distance, label: "Distance" }]
      : []),
    ...(stats.intensityTime
      ? [
          {
            key: "intensity",
            value: minutes(stats.intensityTime.seconds),
            label:
              session.kind === "fartlek"
                ? "Bloc libre"
                : stats.intensityTime.label.charAt(0).toUpperCase() +
                  stats.intensityTime.label.slice(1),
          },
        ]
      : []),
    ...(stats.effort
      ? [{ key: "effort", value: stats.effort, label: "Effort bloc" }]
      : []),
    ...(stats.pace
      ? [{ key: "pace", value: stats.pace, label: "Allure /km" }]
      : []),
    ...(stats.heartRate
      ? [{ key: "heart-rate", value: stats.heartRate, label: "FC bpm" }]
      : []),
    ...(stats.elevation
      ? [{ key: "elevation", value: stats.elevation, label: "D+" }]
      : []),
    ...(stats.terrain
      ? [{ key: "terrain", value: stats.terrain, label: "Terrain" }]
      : []),
  ];
  const segments = intensity ? chartSegments(session) : [];
  const steps = stepViews(session, paceRanges);
  const day = formatLongDay(session.scheduledOn);
  return {
    sessionKey: session.sessionKey,
    day,
    heading: weekNumber > 0 ? `${day} · S${weekNumber}` : day,
    position: { index: index + 1, count: sessions.length },
    previousKey: sessions[index - 1]?.sessionKey ?? null,
    nextKey: sessions[index + 1]?.sessionKey ?? null,
    family,
    intensity,
    untracked: isUntrackedSession(session),
    checkIn,
    summary: intensity ? null : `${familyLabels[family]} · ${duration.value}`,
    status,
    title: session.title,
    purpose: session.purpose,
    proposal: proposal
      ? {
          id: proposal.id,
          when: proposalWhen(proposal.createdAt, today, state.plan.timeZone),
          text: proposal.summary ?? proposal.title,
        }
      : null,
    stats: intensity ? statList.slice(0, 6) : [duration],
    segments,
    structureLabel: `Déroulé de la séance sur ${formatDuration(
      segments.reduce((total, segment) => total + segment.seconds, 0),
    )}`,
    steps: intensity
      ? steps
      : steps
          .filter((step) => step.cue !== null)
          .map((step) => ({ ...step, target: "", pace: null })),
    contingencies: session.contingencies,
    surgeIdeas: session.kind === "fartlek" ? surgeIdeas(session) : [],
    completion: match ? completion(input, session, match, paces) : null,
    shoes: readOnly ? null : (input.shoes ?? null),
    readOnly,
  };
}
