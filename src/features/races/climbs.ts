import { elevationBetween, indexAt } from "./course";
import { formatClock, formatInteger, formatKm, formatPace } from "./format";
import { walkPortions, walkSummary, type WalkPortion } from "./grade";
import type { RaceSummary } from "./race";
import {
  elapsedAt,
  simulate,
  type Simulation,
  type SimulationSettings,
} from "./simulation";
import type { RaceTimeline } from "./timeline";
import type { CourseModel, RacePlanModel } from "./workspace";

export const climbThresholds = [6, 8, 10, 12, 15] as const;

export function thresholdOptions(current: number) {
  return [...new Set<number>([...climbThresholds, current])].sort(
    (a, b) => a - b,
  );
}

export type ClimbRow = {
  number: number;
  fromM: number;
  toM: number;
  instruction: string;
  km: string;
  section: string | null;
  length: string;
  gain: string;
  average: string;
  max: string;
  passage: string;
};

export type ClimbStats = {
  count: number;
  walked: string;
  gain: string;
  runPace: string | null;
};

export type ThresholdRow = {
  threshold: number;
  count: number;
  walked: string;
  share: number;
  shareLabel: string;
  runPace: string | null;
  current: boolean;
};

function km(meters: number) {
  return `${formatKm(meters)} km`;
}

function portionGain(model: CourseModel, portion: WalkPortion) {
  return elevationBetween(model.course, portion.fromM, portion.toM).gain ?? 0;
}

export function runPaceSeconds(
  simulation: Simulation,
  walkPaceSecondsPerKm: number,
) {
  const runM = simulation.segments.reduce(
    (sum, segment) => sum + (segment.toM - segment.fromM - segment.walkM),
    0,
  );
  const runSeconds = simulation.segments.reduce(
    (sum, segment) =>
      sum +
      segment.movingSeconds -
      (segment.walkM / 1000) * walkPaceSecondsPerKm,
    0,
  );
  return runM > 0 ? runSeconds / (runM / 1000) : null;
}

export function climbRows({
  model,
  planned,
  timeline,
}: {
  model: CourseModel;
  planned: RacePlanModel;
  timeline: RaceTimeline;
}): ClimbRow[] {
  const start = planned.simulation.passages[0]?.clockMinutes ?? 0;
  return model.portions.map((portion, index) => {
    const length = portion.toM - portion.fromM;
    const gain = portionGain(model, portion);
    const from = indexAt(model.course, portion.fromM);
    const to = indexAt(model.course, portion.toM);
    const steepest = Math.max(...model.grades.slice(from, to + 1));
    const segment = timeline.segments.find(
      (item) => portion.fromM >= item.fromM && portion.fromM < item.toM,
    );
    return {
      number: index + 1,
      fromM: portion.fromM,
      toM: portion.toM,
      instruction: "Marche",
      km: formatKm(portion.fromM),
      section: segment ? `${segment.fromName} → ${segment.toName}` : null,
      length: km(length),
      gain: `+${formatInteger(gain)} m`,
      average: `${formatInteger(length > 0 ? (gain / length) * 100 : 0)} %`,
      max: `${formatInteger(steepest)} %`,
      passage: formatClock(
        start + elapsedAt(model.course, planned.simulation, portion.fromM) / 60,
      ),
    };
  });
}

export function climbStats({
  model,
  planned,
  walkPaceSecondsPerKm,
}: {
  model: CourseModel;
  planned: RacePlanModel;
  walkPaceSecondsPerKm: number;
}): ClimbStats {
  const summary = walkSummary(model.portions);
  const pace = runPaceSeconds(planned.simulation, walkPaceSecondsPerKm);
  return {
    count: summary.count,
    walked: km(summary.distanceM),
    gain: `+${formatInteger(
      model.portions.reduce(
        (sum, portion) => sum + portionGain(model, portion),
        0,
      ),
    )} m`,
    runPace: pace === null ? null : `${formatPace(pace)} /km`,
  };
}

export function thresholdComparison({
  model,
  kind,
  settings,
  current,
}: {
  model: CourseModel;
  kind: RaceSummary["kind"];
  settings: SimulationSettings;
  current: number;
}): ThresholdRow[] {
  return thresholdOptions(current).map((threshold) => {
    const portions =
      kind === "road"
        ? []
        : walkPortions(model.course, threshold, model.grades);
    const simulation = simulate(
      model.course,
      model.grades,
      portions,
      model.waypoints,
      settings,
    );
    const pace = runPaceSeconds(simulation, settings.walkPaceSecondsPerKm);
    const summary = walkSummary(portions);
    const share =
      model.course.distanceM > 0
        ? summary.distanceM / model.course.distanceM
        : 0;
    return {
      threshold,
      count: summary.count,
      walked: km(summary.distanceM),
      share,
      shareLabel: `${formatInteger(share * 100)} %`,
      runPace: pace === null ? null : `${formatPace(pace)} /km`,
      current: threshold === current,
    };
  });
}
