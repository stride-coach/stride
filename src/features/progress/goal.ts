import type { PlanBlock, PlanSession } from "@/features/plans/model/plan";
import type { ProgramOverview } from "@/features/plans/view/program";
import type { RaceSummary } from "@/features/races/race";
import {
  formatClock,
  formatDayMonth,
  formatDayMonthShort,
  formatHoursMinutes,
  formatInteger,
} from "./format";
import type {
  GarminPrediction,
  GarminPredictionKey,
} from "./garmin-predictions";
import { daysBetween } from "./period";

export const preparationWindowDays = 182;

export const ultraNote =
  "Pas de prévision de temps fiable en ultra : Stride suit ta préparation.";

export const trailNote =
  "Pas de prévision de temps fiable en trail : Stride suit ta préparation.";

export const roadDistanceNote = "Pas de prévision Garmin pour cette distance.";

export const ultraDistanceKm = 60;

export type GoalPhaseSegment = {
  key: string;
  name: string;
  weeks: number;
  state: "past" | "current" | "future";
  progress: number;
};

export type GoalPhase = {
  label: string;
  taper: string | null;
  segments: GoalPhaseSegment[];
};

export type GoalRoad = {
  prediction: string | null;
  verdict: string;
  tone: "success" | "warning" | "muted";
};

export type GoalPreparation = {
  longest: string | null;
  distance: string | null;
  weeklyGain: string | null;
  preparation: { done: number; total: number } | null;
};

export type GoalCard = {
  id: string;
  name: string;
  priority: RaceSummary["priority"];
  date: string;
  countdown: string;
  target: string | null;
  road: GoalRoad | null;
  preparation: GoalPreparation | null;
  note: string | null;
  phase: GoalPhase | null;
  planNote: string | null;
  verdict: string | null;
  targetNote: string | null;
  gap: { label: string; tone: "success" | "warning" } | null;
  phaseShort: string | null;
  longestDay: string | null;
  raceGain: string | null;
  gainCovered: boolean | null;
};

export type GoalInputs = {
  today: string;
  predictions: GarminPrediction[];
  longestRunMeters: number | null;
  longestRunDay?: string | null;
  maxWeeklyGainMeters: number | null;
  preparation: { done: number; total: number } | null;
  program: ProgramOverview | null;
  blockKinds: Record<string, PlanBlock["kind"]>;
};

export type KeySession = { sessionKey: string; title: string; date: string };

export const noPlanNote =
  "Pas de plan actif : la phase d’entraînement apparaîtra avec ton plan.";

function planNote(program: ProgramOverview | null, today: string) {
  if (!program) return noPlanNote;
  if (program.currentWeekKey) return null;
  const first = program.weeks[0]?.weekStart;
  if (first && first > today)
    return `Ton plan commence le ${formatDayMonth(first)}.`;
  return "Ton plan est terminé.";
}

const priorityRank: Record<string, number> = { A: 0, B: 1, C: 2 };

const roadDistances: { key: GarminPredictionKey; km: number }[] = [
  { key: "5k", km: 5 },
  { key: "10k", km: 10 },
  { key: "half_marathon", km: 21.1 },
  { key: "marathon", km: 42.2 },
];

export function pickGoalRace(
  races: RaceSummary[],
  primaryRaceId: string | null,
  today: string,
) {
  const upcoming = races.filter(
    (race): race is RaceSummary & { date: string } =>
      race.date !== null && race.date >= today,
  );
  return (
    upcoming.find((race) => race.id === primaryRaceId) ??
    upcoming
      .filter((race) => race.priority === "A" || race.priority === "B")
      .sort(
        (a, b) =>
          priorityRank[a.priority] - priorityRank[b.priority] ||
          a.date.localeCompare(b.date),
      )[0] ??
    null
  );
}

export function roadPredictionKey(
  race: Pick<RaceSummary, "kind" | "distanceKm">,
) {
  if (race.kind !== "road" || race.distanceKm === null) return null;
  return (
    roadDistances.find(
      (item) => Math.abs(item.km - race.distanceKm!) <= item.km * 0.01,
    )?.key ?? null
  );
}

export function formatTarget(seconds: number) {
  return seconds >= 3600 && seconds % 60 === 0
    ? formatHoursMinutes(seconds)
    : formatClock(seconds);
}

function signedClock(seconds: number) {
  return `${seconds > 0 ? "+" : "−"}${formatClock(Math.abs(seconds))}`;
}

function roadCard(
  prediction: GarminPrediction | undefined,
  target: number | null,
): GoalRoad {
  if (!prediction)
    return {
      prediction: null,
      verdict: "Pas encore de prévision Garmin pour cette distance.",
      tone: "muted",
    };
  if (target === null)
    return {
      prediction: formatClock(prediction.seconds),
      verdict: "Prévision Garmin, sans temps objectif.",
      tone: "muted",
    };
  const gap = prediction.seconds - target;
  return {
    prediction: formatClock(prediction.seconds),
    verdict:
      gap <= 0 ? "Dans les temps" : `${signedClock(gap)} sur ton objectif`,
    tone: gap <= 0 ? "success" : "warning",
  };
}

function phase(
  program: ProgramOverview | null,
  blockKinds: Record<string, PlanBlock["kind"]>,
  today: string,
): GoalPhase | null {
  if (!program) return null;
  const current = program.weeks.find(
    (week) => week.weekKey === program.currentWeekKey,
  );
  if (!current) return null;
  const currentBlock = program.blocks.find((block) =>
    block.weeks.some((week) => week.weekKey === current.weekKey),
  );
  const taperBlock = program.blocks.find(
    (block) => blockKinds[block.blockKey] === "taper" && block.weeks.length,
  );
  const taperStart = taperBlock?.weeks[0]?.weekStart ?? null;
  const taper =
    taperBlock === currentBlock
      ? "Affûtage en cours"
      : taperStart && taperStart > today
        ? `Affûtage le ${formatDayMonth(taperStart)}`
        : null;
  const currentIndex = currentBlock ? program.blocks.indexOf(currentBlock) : -1;
  return {
    label: `${current.blockName} · semaine ${formatInteger(current.number)} sur ${formatInteger(program.weeks.length)}`,
    taper,
    segments: program.blocks
      .filter((block) => block.weeks.length > 0)
      .map((block) => {
        const index = program.blocks.indexOf(block);
        const state =
          index < currentIndex
            ? "past"
            : index === currentIndex
              ? "current"
              : "future";
        return {
          key: block.blockKey,
          name: block.name,
          weeks: block.weeks.length,
          state,
          progress:
            state === "past"
              ? 1
              : state === "current"
                ? current.numberInBlock / block.weeks.length
                : 0,
        };
      }),
  };
}

export function nextKeySession(
  sessions: Pick<
    PlanSession,
    "sessionKey" | "title" | "scheduledOn" | "isKey" | "kind" | "sport"
  >[],
  today: string,
): KeySession | null {
  const next = sessions
    .filter(
      (session) =>
        session.isKey &&
        session.kind !== "rest" &&
        session.sport !== "rest" &&
        session.scheduledOn >= today,
    )
    .sort((a, b) => a.scheduledOn.localeCompare(b.scheduledOn))[0];
  return next
    ? {
        sessionKey: next.sessionKey,
        title: next.title,
        date: formatDayMonthShort(next.scheduledOn),
      }
    : null;
}

export function preparationVerdict({
  longestMeters,
  distanceKm,
  weeklyGainMeters,
  raceGainM,
}: {
  longestMeters: number | null;
  distanceKm: number | null;
  weeklyGainMeters: number | null;
  raceGainM: number | null;
}) {
  const distance =
    distanceKm === null || longestMeters === null
      ? null
      : longestMeters >= distanceKm * 1000;
  const gain =
    !raceGainM || weeklyGainMeters === null
      ? null
      : weeklyGainMeters >= raceGainM;
  if (distance === null && gain === null) return null;
  if (gain === null)
    return distance
      ? "Sur la bonne voie. La distance de la course est déjà couverte à l’entraînement."
      : "La distance de la course reste à construire d’ici le jour J.";
  if (distance === null)
    return gain
      ? "Sur la bonne voie. Le D+ de la course est déjà couvert en une semaine."
      : "Le D+ de la course reste à construire d’ici le jour J.";
  if (gain && distance)
    return "Sur la bonne voie. La distance et le D+ de la course sont déjà couverts à l’entraînement.";
  if (gain)
    return "Sur la bonne voie. Le D+ de la course est déjà couvert en une semaine ; c’est la distance qu’il reste à construire.";
  if (distance)
    return "Sur la bonne voie. La distance est déjà couverte ; c’est le D+ qu’il reste à construire.";
  return "La distance et le D+ de la course restent à construire d’ici le jour J.";
}

function roadVerdict(
  prediction: GarminPrediction | undefined,
  target: number | null,
) {
  if (!prediction)
    return "Pas encore de prévision Garmin pour cette distance : ton objectif reste le repère.";
  const predicted = formatClock(prediction.seconds);
  if (target === null)
    return `Prévision Garmin ${predicted}, sans temps objectif pour comparer.`;
  const gap = prediction.seconds - target;
  return gap <= 0
    ? `Dans les temps. La prévision Garmin (${predicted}) est sous ton objectif.`
    : `${signedClock(gap)} sur ton objectif. La prévision Garmin (${predicted}) reste au-dessus de ${formatClock(target)}.`;
}

function phaseShort(program: ProgramOverview | null) {
  const current = program?.weeks.find(
    (week) => week.weekKey === program.currentWeekKey,
  );
  return current && program
    ? `${current.blockName} · S${formatInteger(current.number)} / ${formatInteger(program.weeks.length)}`
    : null;
}

export function raceGoalCard(
  race: RaceSummary & { date: string },
  {
    today,
    predictions,
    longestRunMeters,
    longestRunDay = null,
    maxWeeklyGainMeters,
    preparation,
    program,
    blockKinds,
  }: GoalInputs,
): GoalCard {
  const key = roadPredictionKey(race);
  const days = daysBetween(today, race.date);
  const prediction = key
    ? predictions.find((item) => item.key === key)
    : undefined;
  const gap =
    prediction && race.targetSeconds !== null
      ? prediction.seconds - race.targetSeconds
      : null;
  const raceGain = race.elevationGainM;
  const road = race.kind === "road";
  const ultra = (race.distanceKm ?? 0) >= ultraDistanceKm;
  return {
    id: race.id,
    name: race.name,
    priority: race.priority,
    date: formatDayMonth(race.date),
    countdown: days === 0 ? "Jour J" : `J-${formatInteger(days)}`,
    target: race.targetSeconds ? formatTarget(race.targetSeconds) : null,
    road: key ? roadCard(prediction, race.targetSeconds) : null,
    preparation: road
      ? null
      : {
          longest:
            longestRunMeters === null
              ? null
              : formatInteger(longestRunMeters / 1000),
          distance:
            race.distanceKm === null ? null : formatInteger(race.distanceKm),
          weeklyGain:
            maxWeeklyGainMeters === null
              ? null
              : formatInteger(maxWeeklyGainMeters),
          preparation,
        },
    note: road
      ? key
        ? null
        : roadDistanceNote
      : ultra
        ? ultraNote
        : trailNote,
    phase: phase(program, blockKinds, today),
    planNote: planNote(program, today),
    verdict: key
      ? roadVerdict(prediction, race.targetSeconds)
      : road
        ? roadDistanceNote
        : preparationVerdict({
            longestMeters: longestRunMeters,
            distanceKm: race.distanceKm,
            weeklyGainMeters: maxWeeklyGainMeters,
            raceGainM: raceGain,
          }),
    targetNote: road
      ? null
      : ultra
        ? "pas de prévision fiable en ultra"
        : "pas de prévision fiable en trail",
    gap:
      gap === null
        ? null
        : {
            label: gap === 0 ? "0:00" : signedClock(gap),
            tone: gap <= 0 ? "success" : "warning",
          },
    phaseShort: phaseShort(program),
    longestDay:
      longestRunMeters !== null && longestRunDay
        ? formatDayMonthShort(longestRunDay)
        : null,
    raceGain: raceGain ? formatInteger(raceGain) : null,
    gainCovered:
      road || !raceGain || maxWeeklyGainMeters === null
        ? null
        : maxWeeklyGainMeters >= raceGain,
  };
}

export function goalCard({
  races,
  primaryRaceId,
  ...inputs
}: GoalInputs & {
  races: RaceSummary[];
  primaryRaceId: string | null;
}): GoalCard | null {
  const race = pickGoalRace(races, primaryRaceId, inputs.today);
  return race ? raceGoalCard(race, inputs) : null;
}

export function goalSummary(goal: GoalCard) {
  const target = goal.target
    ? `Objectif ${goal.target}`
    : "Sans temps objectif";
  if (goal.road)
    return goal.road.prediction
      ? `Prévision Garmin ${goal.road.prediction}. ${target}.`
      : `${target}. ${goal.road.verdict}`;
  const prep = goal.preparation;
  const longest =
    prep?.longest && prep.distance
      ? `Plus longue sortie : ${prep.longest} km sur ${prep.distance}. `
      : prep?.longest
        ? `Plus longue sortie : ${prep.longest} km. `
        : "";
  const preparation = prep?.preparation
    ? `, préparation ${formatInteger(prep.preparation.done)} sur ${formatInteger(prep.preparation.total)}`
    : "";
  return `${longest}${target}${preparation}.`;
}
