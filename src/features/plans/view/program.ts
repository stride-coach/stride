import type { SessionBlock } from "@/components/stride/session-blocks";
import {
  sessionStatuses,
  planAdherence,
  type MatchStatus,
} from "../matching/adherence";
import { addDays } from "../model/dates";
import { compareSessions, sessionKeyDate } from "../model/keys";
import { formatClock, formatDayMonthShort } from "@/features/progress/format";
import type {
  PlanBlock,
  PlanSession,
  PlanState,
  PlanWeek,
} from "../model/plan";
import { structureTotals, type IntensityPaces } from "../model/structure";
import {
  hasIntensity,
  isRunningSession,
  isUntrackedSession,
  sessionDistance,
  type SessionDistance,
} from "../model/volume";
import {
  formatDateSpan,
  formatDistance,
  formatDuration,
  formatElevation,
  formatMonthSpan,
  formatWeekRange,
  formatWeekdayShort,
} from "./format";
import { sessionBlocks } from "./plan-view";
import type { RaceKind } from "@/features/races/calendar";
import {
  defaultSeason,
  isArchivedSeason,
  openSeasonName,
  planSeasons,
  seasonCountdown,
  seasonHref,
  seasonProgress,
  type PlanSeason,
  type SeasonStatus,
} from "./seasons";

export type SessionFamily =
  | "easy"
  | "recovery"
  | "long"
  | "long_trail"
  | "tempo"
  | "threshold"
  | "intervals"
  | "hills"
  | "fartlek"
  | "race_specific"
  | "strength"
  | "mobility"
  | "cross"
  | "race"
  | "rest";

export const familyLabels: Record<SessionFamily, string> = {
  easy: "Footing",
  recovery: "Récupération",
  long: "Sortie longue",
  long_trail: "Sortie longue trail",
  tempo: "Allure soutenue",
  threshold: "Seuil",
  intervals: "Fractionné",
  hills: "Côtes",
  fartlek: "Fartlek",
  race_specific: "Spécifique course",
  strength: "Renfo",
  mobility: "Mobilité",
  cross: "Sport croisé",
  race: "Course",
  rest: "Repos",
};

export function sessionFamilyOf(session: PlanSession): SessionFamily {
  if (session.kind === "race") return "race";
  if (session.kind === "rest" || session.sport === "rest") return "rest";
  if (session.kind === "mobility") return "mobility";
  if (session.kind === "strength" || session.sport === "strength")
    return "strength";
  if (session.kind === "cross" || session.sport === "cross") return "cross";
  if (session.kind === "long")
    return session.sport === "trail" || session.terrain === "trail"
      ? "long_trail"
      : "long";
  return session.kind;
}

export type ProgramRace = {
  id: string;
  name: string;
  date: string | null;
  priority: "A" | "B" | "C" | null;
  targetSeconds: number | null;
  distanceKm: number | null;
  elevationGainM: number | null;
  kind: RaceKind;
};

export type ProgramMatch = {
  sessionKey: string;
  status: MatchStatus;
  compliance: { duration: number | null; distance: number | null };
};

export type ProgramInput = {
  state: PlanState;
  today: string;
  summary: string | null;
  matches: ProgramMatch[];
  proposalKeys: string[];
  races: ProgramRace[];
  paces?: IntensityPaces | null;
};

export type WeekStatus = "past" | "current" | "future";
export type LabelTone = "muted" | "provider" | "success" | "accent";
export type DayState =
  "done" | "partial" | "substituted" | "missed" | "proposed" | null;

export type ProgramDaySession = {
  sessionKey: string;
  raceId: string | null;
  family: SessionFamily;
  title: string;
  summary: string | null;
  duration: string | null;
  distance: string | null;
  elevation: string | null;
  blocks: SessionBlock[];
  state: DayState;
  compliancePct: number | null;
};

export type ProgramDay = Omit<ProgramDaySession, "sessionKey"> & {
  date: string;
  weekday: string;
  dayNumber: number;
  sessionKey: string | null;
  sessions: ProgramDaySession[];
  isToday: boolean;
  isPast: boolean;
};

export type ProgramTotals = {
  durationSeconds: number;
  distanceMeters: number | null;
  distanceEstimated: boolean;
  elevationMeters: number | null;
};

export type ProgramWeek = {
  weekKey: string;
  weekStart: string;
  planId: string | null;
  block: { key: string; kind: PlanBlock["kind"] } | null;
  longestRunSeconds: number;
  number: number;
  numberInBlock: number;
  blockName: string;
  daysUntil: number;
  range: string;
  label: string;
  labelTone: LabelTone;
  isDefaultLabel: boolean;
  sidebarLabel: string;
  isLight: boolean;
  families: SessionFamily[];
  totals: ProgramTotals;
  done: ProgramTotals;
  easySeconds: number;
  qualitySeconds: number;
  easyPct: number;
  status: WeekStatus;
  completionPct: number | null;
  proposed: boolean;
  race: { letter: string; primary: boolean } | null;
  note: string | null;
  days: ProgramDay[];
};

export const easyTargetPct = 80;

export function weekSplit(
  week: Pick<ProgramWeek, "easySeconds" | "qualitySeconds" | "easyPct">,
) {
  if (week.easySeconds + week.qualitySeconds <= 0) return null;
  return {
    easyPct: week.easyPct,
    easySeconds: week.easySeconds,
    qualitySeconds: week.qualitySeconds,
    met: week.easyPct >= easyTargetPct,
  };
}

export type ProgramBlock = {
  blockKey: string;
  index: number;
  name: string;
  objective: string;
  span: string;
  months: string;
  totals: ProgramTotals;
  weeks: ProgramWeek[];
  current: boolean;
};

export type ProgramKpi = {
  key: string;
  label: string;
  value: string;
  detail?: string;
};

export type BandTone = "dim" | "provider" | "terrain" | "success" | "accent";

export type ProgramBand = {
  key: string;
  name: string;
  start: number;
  span: number;
  tone: BandTone;
  current: boolean;
};

export type MilestoneTone =
  "provider" | "accent" | "terrain" | "quality" | "success";

export type ProgramMilestone = {
  key: string;
  weekKey: string;
  number: number;
  label: string;
  when: string;
  tone: MilestoneTone;
};

export type ProgramSeasonRace = {
  raceId: string;
  number: number;
  name: string;
  detail: string;
  when: string;
};

export type ProgramSeasonLink = {
  seasonId: string;
  href: string;
  letter: PlanSeason["letter"];
  status: SeasonStatus;
  name: string;
  detail: string;
};

export type SeasonProgram = Pick<
  PlanSeason,
  "id" | "raceIds" | "startsOn" | "endsOn" | "previousPlans"
> & {
  raceId: string | null;
  letter: PlanSeason["letter"];
  name: string;
  status: SeasonStatus;
  href: string;
  eyebrow: string;
  title: string;
  summary: string | null;
  kpis: ProgramKpi[];
  weeks: ProgramWeek[];
  bands: ProgramBand[];
  milestones: ProgramMilestone[];
  races: ProgramSeasonRace[];
  link: ProgramSeasonLink;
  next: ProgramSeasonLink | null;
  defaultWeekKey: string | null;
};

export type ProgramOverview = {
  seasons: SeasonProgram[];
  blocks: ProgramBlock[];
  weeks: ProgramWeek[];
  currentWeekKey: string | null;
};

export const weekTypeLabels: Record<PlanWeek["weekType"], string> = {
  lead_in: "Reprise",
  build: "Construction",
  recovery: "Allégée",
  taper: "Affûtage",
  race: "Course",
  post_race: "Récupération",
};

const labelTones: Record<PlanWeek["weekType"], LabelTone> = {
  lead_in: "muted",
  build: "muted",
  recovery: "provider",
  taper: "success",
  race: "accent",
  post_race: "muted",
};

const easyIntensities = new Set(["recovery", "easy"]);

const sum = (values: number[]) =>
  values.reduce((total, value) => total + value, 0);

function presentSum(values: (number | null)[]) {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0 ? sum(present) : null;
}

export function completeDistance(
  distances: (SessionDistance | null)[],
): SessionDistance | null {
  if (distances.length === 0) return null;
  let meters = 0;
  let estimated = false;
  for (const distance of distances) {
    if (distance === null) return null;
    meters += distance.meters;
    estimated ||= distance.estimated;
  }
  return { meters, estimated };
}

export function approximate(text: string, estimated: boolean) {
  return estimated ? `≈ ${text}` : text;
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

function matchesProposal(keys: Set<string>, prefix: string, key: string) {
  return keys.has(key) || keys.has(`${prefix}:${key}`);
}

export function orderDaySessions<
  Session extends Pick<PlanSession, "kind" | "scheduledOn" | "sessionKey">,
>(sessions: Session[]) {
  return [...sessions].sort(
    (first, second) =>
      Number(second.kind === "race") - Number(first.kind === "race") ||
      compareSessions(first, second),
  );
}

export function complianceRatio(value: number | null) {
  return value === null ? 1 : Math.min(value, 1.5);
}

function planRaceIdsOf(state: PlanState) {
  return new Set([
    state.plan.primaryRaceId,
    ...state.plan.raceRoles.map((role) => role.raceId),
  ]);
}

export function withRaceValues(
  state: PlanState,
  races: ProgramRace[],
): PlanState {
  const planRaceIds = planRaceIdsOf(state);
  const planRaces = races.filter(
    (race) => planRaceIds.has(race.id) && race.date !== null,
  );
  if (planRaces.length === 0) return state;
  return {
    ...state,
    sessions: state.sessions.map((session) => {
      if (session.kind !== "race") return session;
      const race = planRaces.find((item) => item.date === session.scheduledOn);
      if (!race) return session;
      return {
        ...session,
        targets: {
          ...session.targets,
          distanceMeters:
            race.distanceKm !== null
              ? Math.round(race.distanceKm * 1000)
              : session.targets.distanceMeters,
          elevationGainMeters:
            race.elevationGainM ?? session.targets.elevationGainMeters,
        },
      };
    }),
  };
}

export function buildProgram(
  input: ProgramInput,
  seasons = planSeasons({
    state: input.state,
    races: input.races,
    today: input.today,
  }),
  previous: ProgramWeek[] = [],
): ProgramOverview {
  const { state, today } = input;
  const paces = input.paces ?? null;
  const statuses = sessionStatuses(input.matches);
  const compliance = new Map(
    input.matches.map((match) => [match.sessionKey, match.compliance]),
  );
  const proposalKeys = new Set(input.proposalKeys);
  const knownKeys = new Set(
    state.sessions.map((session) => session.sessionKey),
  );
  const addedDates = new Set(
    input.proposalKeys.flatMap((key) => {
      const sessionKey = key.replace(/^session:/, "");
      const date = knownKeys.has(sessionKey)
        ? null
        : sessionKeyDate(sessionKey);
      return date ? [date] : [];
    }),
  );
  const planRaceIds = planRaceIdsOf(state);
  const objectiveIds = new Set([
    state.plan.primaryRaceId,
    ...seasons.map((season) => season.raceId),
  ]);
  const raceOn = (date: string) =>
    input.races.find(
      (race) => race.date === date && planRaceIds.has(race.id),
    ) ??
    input.races.find((race) => race.date === date) ??
    null;
  const raceIn = (start: string, end: string) => {
    const inside = input.races.filter(
      (race) => race.date !== null && race.date >= start && race.date <= end,
    );
    return (
      inside.find((race) => planRaceIds.has(race.id)) ??
      inside.sort((first, second) =>
        (first.priority ?? "Z").localeCompare(second.priority ?? "Z"),
      )[0] ??
      null
    );
  };
  const daySession = (
    session: PlanSession,
    date: string,
    isPast: boolean,
  ): ProgramDaySession => {
    const matchStatus = statuses.get(session.sessionKey);
    const durationRatio = compliance.get(session.sessionKey)?.duration ?? null;
    const proposed =
      matchesProposal(proposalKeys, "session", session.sessionKey) ||
      addedDates.has(session.scheduledOn);
    const state: DayState =
      matchStatus === "completed" || matchStatus === "checked_in"
        ? "done"
        : matchStatus === "partial"
          ? "partial"
          : matchStatus === "substituted"
            ? "substituted"
            : proposed && !isPast
              ? "proposed"
              : isPast &&
                  session.kind !== "race" &&
                  !isUntrackedSession(session)
                ? "missed"
                : null;
    const distance = sessionDistance(session, paces);
    const durationLabel =
      session.kind === "race"
        ? null
        : formatDuration(session.targets.durationSeconds);
    const distanceLabel =
      distance !== null
        ? approximate(formatDistance(distance.meters), distance.estimated)
        : null;
    return {
      sessionKey: session.sessionKey,
      raceId: session.kind === "race" ? (raceOn(date)?.id ?? null) : null,
      family: sessionFamilyOf(session),
      title: session.title,
      summary:
        [durationLabel, distanceLabel].filter(Boolean).join(" · ") || null,
      duration: durationLabel,
      distance: distanceLabel,
      elevation:
        session.targets.elevationGainMeters !== null &&
        session.targets.elevationGainMeters > 0
          ? `${formatElevation(session.targets.elevationGainMeters)} D+`
          : null,
      blocks:
        session.kind === "race" || !hasIntensity(session)
          ? []
          : sessionBlocks(session),
      state,
      compliancePct:
        state === "done" || state === "partial"
          ? durationRatio !== null
            ? Math.round(durationRatio * 100)
            : null
          : null,
    };
  };

  const weeks: ProgramWeek[] = state.weeks.map((week, index) => {
    const end = addDays(week.weekStart, 6);
    const sessions = state.sessions.filter(
      (session) =>
        session.scheduledOn >= week.weekStart && session.scheduledOn <= end,
    );
    const status: WeekStatus =
      end < today ? "past" : week.weekStart <= today ? "current" : "future";
    const raceSession = sessions.find((session) => session.kind === "race");
    const race = raceSession
      ? raceOn(raceSession.scheduledOn)
      : raceIn(week.weekStart, end);
    const isPrimaryRace = race
      ? objectiveIds.has(race.id)
      : raceSession !== undefined && week.weekType === "race";
    const raceName = race?.name ?? raceSession?.title ?? null;
    const label = raceName
      ? `${raceName} · ${isPrimaryRace ? "objectif" : (race?.priority ?? "course")}`
      : weekTypeLabels[week.weekType];
    const runs = sessions.filter(isRunningSession);
    const running = runs.filter((session) => session.kind !== "race");
    let easySeconds = 0;
    let qualitySeconds = 0;
    for (const session of running)
      for (const [intensity, seconds] of Object.entries(
        structureTotals(session.structure).secondsByIntensity,
      ))
        if (easyIntensities.has(intensity)) easySeconds += seconds;
        else qualitySeconds += seconds;
    const distance =
      completeDistance(
        runs.map((session) => sessionDistance(session, paces)),
      ) ??
      (week.targets.distanceMeters !== null
        ? { meters: week.targets.distanceMeters, estimated: true }
        : null);
    const totals: ProgramTotals = {
      durationSeconds: sum(
        runs.map((session) => session.targets.durationSeconds),
      ),
      distanceMeters: distance?.meters ?? null,
      distanceEstimated: distance?.estimated ?? false,
      elevationMeters:
        presentSum(
          runs.map((session) => session.targets.elevationGainMeters),
        ) ?? week.targets.elevationGainMeters,
    };
    const doneSessions = runs.filter((session) => {
      const status = statuses.get(session.sessionKey);
      return status === "completed" || status === "partial";
    });
    const doneDistance =
      doneSessions.length === 0
        ? { meters: 0, estimated: false }
        : completeDistance(
            doneSessions.map((session) => {
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
    const done: ProgramTotals = {
      durationSeconds: Math.round(
        sum(
          doneSessions.map(
            (session) =>
              session.targets.durationSeconds *
              complianceRatio(
                compliance.get(session.sessionKey)?.duration ?? null,
              ),
          ),
        ),
      ),
      distanceMeters:
        totals.distanceMeters === null ? null : (doneDistance?.meters ?? null),
      distanceEstimated: doneDistance?.estimated ?? false,
      elevationMeters:
        totals.elevationMeters === null
          ? null
          : sum(
              doneSessions.map(
                (session) => session.targets.elevationGainMeters ?? 0,
              ),
            ),
    };
    const adherence =
      status !== "past"
        ? null
        : planAdherence({
            sessions,
            matches: input.matches,
            start: week.weekStart,
            today,
            windows: [],
          }).share;
    const days: ProgramDay[] = Array.from({ length: 7 }, (_, offset) => {
      const date = addDays(week.weekStart, offset);
      const daySessions = sessions.filter(
        (session) => session.scheduledOn === date,
      );
      const isPast = date < today;
      const base = {
        date,
        weekday: formatWeekdayShort(date),
        dayNumber: Number(date.slice(8)),
        isToday: date === today,
        isPast,
      };
      const ordered = orderDaySessions(daySessions).map((session) =>
        daySession(session, date, isPast),
      );
      const main =
        daySessions.find((session) => session.kind === "race") ??
        orderDaySessions(daySessions).sort(
          (first, second) =>
            second.targets.durationSeconds - first.targets.durationSeconds,
        )[0];
      const lead =
        ordered.find((session) => session.sessionKey === main?.sessionKey) ??
        ordered[0];
      if (!lead)
        return {
          ...base,
          sessionKey: null,
          raceId: null,
          family: "rest",
          title: familyLabels.rest,
          summary: null,
          duration: null,
          distance: null,
          elevation: null,
          blocks: [],
          state: isPast ? "done" : null,
          compliancePct: null,
          sessions: [],
        };
      return { ...base, ...lead, sessions: ordered };
    });
    const families = days.map((day) => day.family);
    const block = state.blocks.find((item) => item.blockKey === week.blockKey);
    return {
      weekKey: week.weekKey,
      weekStart: week.weekStart,
      planId: null,
      block: block ? { key: block.blockKey, kind: block.kind } : null,
      longestRunSeconds: Math.max(
        0,
        ...sessions
          .filter(
            (session) => isRunningSession(session) && session.kind !== "race",
          )
          .map((session) => session.targets.durationSeconds),
      ),
      number: index + 1,
      numberInBlock:
        state.weeks
          .filter((item) => item.blockKey === week.blockKey)
          .findIndex((item) => item.weekKey === week.weekKey) + 1,
      blockName: block?.name ?? "",
      daysUntil: daysBetween(today, week.weekStart),
      range: formatWeekRange(week.weekStart, end),
      label,
      labelTone: raceName
        ? isPrimaryRace
          ? "accent"
          : "muted"
        : labelTones[week.weekType],
      isDefaultLabel: !raceName && week.weekType === "build",
      sidebarLabel:
        week.weekType === "build" || week.weekType === "race"
          ? ""
          : weekTypeLabels[week.weekType].toLowerCase(),
      isLight: week.weekType === "recovery" || week.weekType === "taper",
      families,
      totals,
      done,
      easySeconds,
      qualitySeconds,
      easyPct:
        easySeconds + qualitySeconds > 0
          ? Math.round((easySeconds / (easySeconds + qualitySeconds)) * 100)
          : 100,
      status,
      completionPct: adherence !== null ? Math.round(adherence * 100) : null,
      proposed:
        matchesProposal(proposalKeys, "week", week.weekKey) ||
        sessions.some((session) =>
          matchesProposal(proposalKeys, "session", session.sessionKey),
        ) ||
        [...addedDates].some((date) => date >= week.weekStart && date <= end),
      race:
        raceSession || race
          ? {
              letter: race?.priority ?? (isPrimaryRace ? "A" : "C"),
              primary: isPrimaryRace,
            }
          : null,
      note: week.notes,
      days,
    };
  });

  const blocks: ProgramBlock[] = state.blocks.map((block, index) => {
    const blockWeeks = weeks.filter(
      (week) => state.weeks[week.number - 1].blockKey === block.blockKey,
    );
    const first = blockWeeks[0]?.weekStart ?? block.startsOn;
    const distance = weeksDistance(blockWeeks);
    const last = blockWeeks.at(-1)
      ? addDays(blockWeeks.at(-1)!.weekStart, 6)
      : block.endsOn;
    return {
      blockKey: block.blockKey,
      index: index + 1,
      name: block.name,
      objective: block.objective,
      span: `${formatDateSpan(first, last)} · ${plural(blockWeeks.length, "semaine", "semaines")}`,
      months: formatMonthSpan(first, last),
      totals: {
        durationSeconds: sum(
          blockWeeks.map((week) => week.totals.durationSeconds),
        ),
        distanceMeters: distance?.meters ?? null,
        distanceEstimated: distance?.estimated ?? false,
        elevationMeters: presentSum(
          blockWeeks.map((week) => week.totals.elevationMeters),
        ),
      },
      weeks: blockWeeks,
      current: blockWeeks.some((week) => week.status === "current"),
    };
  });

  return {
    seasons: seasonPrograms(
      input,
      [...previous, ...weeks].sort((first, second) =>
        first.weekStart.localeCompare(second.weekStart),
      ),
      seasons,
    ),
    blocks,
    weeks,
    currentWeekKey:
      weeks.find((week) => week.status === "current")?.weekKey ?? null,
  };
}

const bandTones: Record<PlanBlock["kind"], BandTone> = {
  lead_in: "dim",
  base: "dim",
  recovery: "dim",
  transition: "dim",
  build: "provider",
  specific: "terrain",
  taper: "success",
  race: "accent",
};

function weeksDistance(weeks: ProgramWeek[]) {
  return completeDistance(
    weeks.map((week) =>
      week.totals.distanceMeters === null && week.totals.durationSeconds === 0
        ? { meters: 0, estimated: false }
        : week.totals.distanceMeters === null
          ? null
          : {
              meters: week.totals.distanceMeters,
              estimated: week.totals.distanceEstimated,
            },
    ),
  );
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

function kilometers(meters: number) {
  return `${Math.round(meters / 1000).toLocaleString("fr-FR")} km`;
}

function renumber(weeks: ProgramWeek[]) {
  return weeks.map((week, index) => ({ ...week, number: index + 1 }));
}

function programBands(weeks: ProgramWeek[]): ProgramBand[] {
  const bands: ProgramBand[] = [];
  weeks.forEach((week, index) => {
    const block = week.block;
    const last = bands.at(-1);
    if (
      last &&
      block &&
      last.key === block.key &&
      weeks[index - 1].planId === week.planId
    ) {
      last.span += 1;
      last.current ||= week.status === "current";
      return;
    }
    bands.push({
      key: block?.key ?? week.weekKey,
      name: week.blockName,
      start: index,
      span: 1,
      tone: block ? bandTones[block.kind] : "dim",
      current: week.status === "current",
    });
  });
  return bands;
}

function programMilestones(
  state: PlanState,
  weeks: ProgramWeek[],
): ProgramMilestone[] {
  const milestones: ProgramMilestone[] = [];
  const upcoming = weeks.filter((week) => week.status !== "past");
  const add = (
    week: ProgramWeek,
    key: string,
    label: string,
    when: string,
    tone: MilestoneTone,
  ) => {
    if (week.status === "past") return;
    milestones.push({
      key,
      weekKey: week.weekKey,
      number: week.number,
      label,
      when,
      tone,
    });
  };
  const recovery = upcoming.find(
    (week) =>
      state.weeks.find((item) => item.weekKey === week.weekKey)?.weekType ===
      "recovery",
  );
  if (recovery)
    add(recovery, "recovery", "Allégée", recovery.range, "provider");
  const runs = state.sessions.filter(
    (session) =>
      isRunningSession(session) &&
      session.kind !== "race" &&
      weeks.some(
        (week) =>
          session.scheduledOn >= week.weekStart &&
          session.scheduledOn <= addDays(week.weekStart, 6),
      ),
  );
  const longest = Math.max(
    0,
    ...runs.map((session) => session.targets.durationSeconds),
  );
  const hours = Math.floor(longest / 3600);
  if (hours >= 2) {
    const first = [...runs]
      .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))
      .find((session) => session.targets.durationSeconds >= hours * 3600);
    const week = first
      ? weeks.find(
          (item) =>
            first.scheduledOn >= item.weekStart &&
            first.scheduledOn <= addDays(item.weekStart, 6),
        )
      : undefined;
    if (first && week)
      add(
        week,
        "long-run",
        `1re sortie de ${hours}h`,
        formatDayMonthShort(first.scheduledOn),
        "terrain",
      );
  }
  const peak = weeks.reduce<ProgramWeek | null>(
    (best, week) =>
      !best || week.totals.durationSeconds > best.totals.durationSeconds
        ? week
        : best,
    null,
  );
  if (peak && weeks.length > 2)
    add(peak, "peak", "Pic de volume", peak.range, "quality");
  const taper = weeks.find((week) => week.block?.kind === "taper");
  if (taper)
    add(
      taper,
      "taper",
      "Début de l’affûtage",
      formatDayMonthShort(taper.weekStart),
      "success",
    );
  return milestones.sort((first, second) => first.number - second.number);
}

function programKpis(weeks: ProgramWeek[]): ProgramKpi[] {
  const total = sum(weeks.map((week) => week.totals.durationSeconds));
  const distance = weeksDistance(weeks);
  const longest = Math.max(0, ...weeks.map((week) => week.longestRunSeconds));
  const peak = Math.max(0, ...weeks.map((week) => week.totals.durationSeconds));
  const kpis: ProgramKpi[] = [
    {
      key: "duration",
      label: "Total prévu",
      value: `${Math.round(total / 3600).toLocaleString("fr-FR")} h`,
    },
  ];
  if (distance !== null && distance.meters > 0)
    kpis.push({
      key: "distance",
      label: "Distance",
      value: approximate(kilometers(distance.meters), distance.estimated),
    });
  if (longest > 0)
    kpis.push({
      key: "longest",
      label: "Plus longue sortie",
      value: formatDuration(longest),
    });
  if (peak > 0 && weeks.length > 1)
    kpis.push({
      key: "peak",
      label: "Semaine de pic",
      value: formatDuration(peak),
    });
  return kpis;
}

function defaultWeek(weeks: ProgramWeek[]) {
  return (
    (
      weeks.find((week) => week.status === "current") ??
      weeks.find((week) => week.status === "future") ??
      weeks.at(-1) ??
      null
    )?.weekKey ?? null
  );
}

export function weekEyebrow(week: ProgramWeek, count: number) {
  return `Semaine ${week.number} sur ${count} · ${week.blockName}`;
}

function eyebrow(weeks: ProgramWeek[]) {
  const current = weeks.find((week) => week.status === "current");
  if (current) return weekEyebrow(current, weeks.length);
  const first = weeks[0];
  const span = plural(weeks.length, "semaine", "semaines");
  return first && first.daysUntil > 0
    ? `${span} · débute dans ${plural(first.daysUntil, "jour", "jours")}`
    : span;
}

function seasonKpis(weeks: ProgramWeek[]): ProgramKpi[] {
  const kpis: ProgramKpi[] = [];
  const sessions = weeks
    .flatMap((week) => week.days.flatMap((day) => day.sessions))
    .filter((session) => session.family !== "race");
  const done = sessions.filter(
    (session) => session.state === "done" || session.state === "partial",
  ).length;
  if (sessions.length > 0)
    kpis.push({
      key: "sessions",
      label: "Séances",
      value: `${done} / ${sessions.length}`,
      detail: `${Math.round((done / sessions.length) * 100)} % faites`,
    });
  const distance = completeDistance(
    weeks.map((week) =>
      week.done.distanceMeters !== null
        ? {
            meters: week.done.distanceMeters,
            estimated: week.done.distanceEstimated,
          }
        : week.done.durationSeconds === 0
          ? { meters: 0, estimated: false }
          : null,
    ),
  );
  const elevation = presentSum(weeks.map((week) => week.done.elevationMeters));
  kpis.push({
    key: "volume",
    label: "Volume couru",
    value:
      distance !== null && distance.meters > 0
        ? approximate(kilometers(distance.meters), distance.estimated)
        : formatDuration(sum(weeks.map((week) => week.done.durationSeconds))),
    ...(elevation !== null && elevation > 0
      ? { detail: `${formatElevation(elevation)} D+` }
      : {}),
  });
  const peak = weeks.reduce<ProgramWeek | null>(
    (best, week) =>
      week.done.durationSeconds > (best?.done.durationSeconds ?? 0)
        ? week
        : best,
    null,
  );
  if (peak)
    kpis.push({
      key: "peak",
      label: "Pic",
      value: formatDuration(peak.done.durationSeconds),
      detail: `en S${peak.number}`,
    });
  return kpis;
}

const seasonStatusLabels: Record<SeasonStatus, string> = {
  current: "En cours",
  future: "À venir",
  past: "Terminée",
};

export function seasonLink(
  seasons: PlanSeason[],
  season: PlanSeason,
  today: string,
): ProgramSeasonLink {
  return {
    seasonId: season.id,
    href: seasonHref(seasons, season.id),
    letter: season.letter,
    status: season.status,
    name: season.name,
    detail: [
      ...new Set([
        season.replacedOn === null ? seasonStatusLabels[season.status] : null,
        seasonProgress(season),
        season.status === "past" ? null : seasonCountdown(season, today),
      ]),
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

function seasonPrograms(
  input: ProgramInput,
  allWeeks: ProgramWeek[],
  seasons: PlanSeason[],
): SeasonProgram[] {
  const { state, today } = input;
  const initial = defaultSeason(seasons);
  return seasons.map((season, index): SeasonProgram => {
    const weeks = renumber(
      allWeeks.filter((week) => season.weekStarts.includes(week.weekStart)),
    );
    const race = input.races.find((item) => item.id === season.raceId) ?? null;
    const past = season.status === "past";
    const weekOf = (date: string) =>
      weeks.find(
        (week) => date >= week.weekStart && date <= addDays(week.weekStart, 6),
      );
    const countdown = past ? null : seasonCountdown(season, today);
    const raceKpi: ProgramKpi[] = season.raceDate
      ? [
          {
            key: "race",
            label: "Course",
            value: formatDayMonthShort(season.raceDate),
            ...(countdown ? { detail: countdown } : {}),
          },
        ]
      : [];
    const next = past ? seasons[index + 1] : undefined;
    return {
      id: season.id,
      raceIds: season.raceIds,
      startsOn: season.startsOn,
      endsOn: season.endsOn,
      previousPlans: season.previousPlans,
      raceId: season.raceId,
      letter: season.letter,
      name: season.name,
      status: season.status,
      href: seasonHref(seasons, season.id),
      eyebrow: past
        ? season.replacedOn !== null
          ? `Plan remplacé le ${formatDayMonthShort(season.replacedOn)}`
          : season.letter
            ? `Saison terminée · objectif ${season.letter}`
            : "Saison terminée"
        : eyebrow(weeks),
      title: race
        ? past
          ? race.name
          : race.targetSeconds !== null
            ? `${race.name} · cible ${formatClock(race.targetSeconds)}`
            : [countdown, race.name].filter(Boolean).join(" · ")
        : isArchivedSeason(season.id)
          ? season.name
          : seasons.length === 1
            ? state.plan.title
            : openSeasonName,
      summary: season.id === initial?.id ? input.summary : null,
      kpis: [...raceKpi, ...(past ? seasonKpis(weeks) : programKpis(weeks))],
      weeks,
      bands: programBands(weeks),
      milestones: programMilestones(state, weeks),
      races: input.races
        .flatMap((item) => {
          const week =
            item.date !== null && season.raceIds.includes(item.id)
              ? weekOf(item.date)
              : undefined;
          return week && item.date
            ? [{ item, date: item.date, number: week.number }]
            : [];
        })
        .sort((first, second) => first.date.localeCompare(second.date))
        .map(({ item, date, number }) => ({
          raceId: item.id,
          number,
          name: item.name,
          detail: [
            item.priority ? `Course ${item.priority}` : "Course",
            item.targetSeconds !== null
              ? `cible ${formatClock(item.targetSeconds)}`
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          when: formatDayMonthShort(date),
        })),
      link: seasonLink(seasons, season, today),
      next: next ? seasonLink(seasons, next, today) : null,
      defaultWeekKey:
        (past && season.raceDate ? weekOf(season.raceDate)?.weekKey : null) ??
        defaultWeek(weeks),
    };
  });
}

function readOnlyWeek(week: ProgramWeek): ProgramWeek {
  return {
    ...week,
    status: week.status === "current" ? "past" : week.status,
    days: week.days.map((day) => ({ ...day, isToday: false })),
  };
}

export function previousWeeks(
  input: ProgramInput,
  planId: string,
  weekStarts: string[],
): ProgramWeek[] {
  return buildProgram(input, [])
    .weeks.filter((week) => weekStarts.includes(week.weekStart))
    .map((week) => ({ ...readOnlyWeek(week), status: "past", planId }));
}

export type PreviousPlanProgram = {
  planId: string;
  weekStarts: string[];
  input: ProgramInput;
};

export function previousProgramWeeks(plans: PreviousPlanProgram[]) {
  return plans.flatMap((plan) =>
    previousWeeks(plan.input, plan.planId, plan.weekStarts),
  );
}

export function archivedProgram(
  input: ProgramInput,
  season: PlanSeason,
  next: ProgramSeasonLink | null,
  previous: ProgramWeek[] = [],
): SeasonProgram {
  const [program] = buildProgram(input, [season], previous).seasons;
  return {
    ...program,
    weeks: program.weeks.map(readOnlyWeek),
    next,
  };
}

export function chartDescription(weeks: ProgramWeek[]) {
  if (weeks.length === 0) return "Aucune semaine prévue";
  const durations = weeks.map((week) => week.easySeconds + week.qualitySeconds);
  const light = weeks.filter((week) => week.isLight).length;
  return `Volume hebdomadaire prévu sur ${plural(weeks.length, "semaine", "semaines")}, de ${formatDuration(Math.min(...durations))} à ${formatDuration(Math.max(...durations))}${light > 0 ? `, dont ${plural(light, "semaine allégée", "semaines allégées")}` : ""}`;
}

export type ProgramNavWeek = {
  weekStart: string;
  label: string;
  duration: string;
  status: WeekStatus;
  proposed: boolean;
};

export type ProgramNavBlock = {
  blockKey: string;
  name: string;
  months: string;
  status: WeekStatus;
  weeks: ProgramNavWeek[];
};

export type ProgramNav = { weekCount: number; blocks: ProgramNavBlock[] };

export function programNavigation(program: ProgramOverview): ProgramNav {
  return {
    weekCount: program.weeks.length,
    blocks: program.blocks.map((block) => ({
      blockKey: block.blockKey,
      name: block.name,
      months: block.months,
      status: block.current
        ? "current"
        : block.weeks.every((week) => week.status === "past")
          ? "past"
          : "future",
      weeks: block.weeks.map((week) => ({
        weekStart: week.weekStart,
        label: [`Semaine ${week.numberInBlock}`, week.sidebarLabel]
          .filter(Boolean)
          .join(" · "),
        duration: formatDuration(week.totals.durationSeconds),
        status: week.status,
        proposed: week.proposed,
      })),
    })),
  };
}
