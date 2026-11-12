import { formatClock, formatDuration, formatHours, formatKm } from "./format";
import { walkPortions } from "./grade";
import { defaultStartMinutes, type RacePlan } from "./race";
import { settingBounds, type SimulationSetting } from "./simulation-settings";
import { simulate, type Simulation } from "./simulation";
import type { CourseModel, RacePlanModel } from "./workspace";

export const threatenedMarginSeconds = 30 * 60;

const minimumGainSeconds = 60;

export type Barrier = {
  waypointId: string;
  name: string;
  heading: string;
  at: string;
  before: string;
  distanceM: number;
  passage: string;
  cutoff: string;
  marginSeconds: number;
  margin: string;
  threatened: boolean;
};

export type SettingStep = {
  setting: SimulationSetting;
  value: number;
  previous: number;
};

export type CutoffRemedy = {
  key: "stops" | "walk" | "target";
  changes: SettingStep[];
  title: string;
  detail: string;
  marginSeconds: number;
  margin: string;
};

export type MarginWeight = {
  key: string;
  label: string;
  value: string;
  detail: string;
};

export type CutoffAlert = {
  barrier: Barrier;
  badge: string;
  reading: string;
  remedies: CutoffRemedy[];
  weights: MarginWeight[];
};

type Inputs = {
  model: CourseModel;
  planned: RacePlanModel;
  plan: RacePlan;
  paceFactors?: Readonly<Record<string, number>>;
};

type Overrides = {
  targetSeconds?: number;
  walkGrade?: number;
  aidStopSeconds?: number;
  waterStopSeconds?: number;
  walking?: boolean;
  paceFactors?: boolean;
};

export function formatMargin(seconds: number) {
  return seconds < 0
    ? `${formatDuration(-seconds)} de retard`
    : formatDuration(seconds);
}

function startOf(plan: RacePlan) {
  return plan.startMinutes ?? defaultStartMinutes;
}

function marginOf(
  simulation: Simulation,
  waypointId: string,
  plan: RacePlan,
): number | null {
  const passage = simulation.passages.find(
    (item) => item.waypointId === waypointId,
  );
  if (!passage) return null;
  if (passage.marginSeconds !== null) return passage.marginSeconds;
  const last = simulation.passages[simulation.passages.length - 1];
  return passage === last && plan.cutoffSeconds
    ? plan.cutoffSeconds - simulation.finishSeconds
    : null;
}

export function barriersOf({ model, planned, plan }: Inputs): Barrier[] {
  const start = startOf(plan);
  const passages = planned.simulation.passages;
  return model.waypoints.flatMap((waypoint, index) => {
    const passage = passages[index];
    const marginSeconds = marginOf(planned.simulation, waypoint.id, plan);
    if (!passage || marginSeconds === null) return [];
    const cutoffSeconds = passage.elapsedSeconds + marginSeconds;
    const finish = waypoint.kind === "finish";
    const elided = /^[aeiouyhâàéèêëîïôöûüœ]/i.test(waypoint.name);
    return [
      {
        waypointId: waypoint.id,
        name: waypoint.name,
        heading: finish
          ? "Barrière horaire à l’arrivée"
          : `Barrière horaire ${elided ? "d’" : "de "}${waypoint.name}`,
        at: finish ? "à l’arrivée" : `à ${waypoint.name}`,
        before: finish ? "avant l’arrivée" : `avant ${waypoint.name}`,
        distanceM: waypoint.distanceM,
        passage: formatClock(passage.clockMinutes),
        cutoff: formatClock(start + cutoffSeconds / 60),
        marginSeconds,
        margin: formatMargin(marginSeconds),
        threatened: marginSeconds < threatenedMarginSeconds,
      },
    ];
  });
}

function resimulate(
  { model, planned, plan, paceFactors }: Inputs,
  overrides: Overrides,
) {
  const portions =
    overrides.walking === false
      ? []
      : overrides.walkGrade === undefined
        ? model.portions
        : walkPortions(model.course, overrides.walkGrade, model.grades);
  return simulate(model.course, model.grades, portions, model.waypoints, {
    targetSeconds: overrides.targetSeconds ?? planned.scenario.seconds,
    walkPaceSecondsPerKm: plan.walkPaceSecondsPerKm,
    aidStopSeconds: overrides.aidStopSeconds ?? plan.aidStopSeconds,
    waterStopSeconds: overrides.waterStopSeconds ?? plan.waterStopSeconds,
    startMinutes: startOf(plan),
    paceFactors: overrides.paceFactors === false ? undefined : paceFactors,
  });
}

type Outcome = { targetSeconds: number; marginSeconds: number };

function outcome(
  inputs: Inputs,
  barrier: Barrier,
  overrides: Overrides,
  samePace: boolean,
): Outcome | null {
  let targetSeconds =
    overrides.targetSeconds ?? inputs.planned.scenario.seconds;
  if (samePace) {
    const probe = resimulate(inputs, overrides);
    if (probe.secondsPerCost <= 0) return null;
    const stops = probe.stops.reduce((sum, stop) => sum + stop.seconds, 0);
    const runCost =
      (targetSeconds - probe.walkSeconds - stops) / probe.secondsPerCost;
    targetSeconds =
      Math.round(
        (probe.walkSeconds +
          stops +
          inputs.planned.simulation.secondsPerCost * runCost) /
          60,
      ) * 60;
  }
  const simulation = resimulate(inputs, { ...overrides, targetSeconds });
  if (!simulation.feasible) return null;
  const marginSeconds = marginOf(simulation, barrier.waypointId, inputs.plan);
  return marginSeconds === null ? null : { targetSeconds, marginSeconds };
}

function bestOf(
  inputs: Inputs,
  barrier: Barrier,
  candidates: number[],
  overrides: (value: number) => Overrides,
  samePace: boolean,
) {
  let best: (Outcome & { value: number }) | null = null;
  for (const value of candidates) {
    const result = outcome(inputs, barrier, overrides(value), samePace);
    if (!result) continue;
    if (!best || result.marginSeconds > best.marginSeconds)
      best = { ...result, value };
    if (result.marginSeconds >= threatenedMarginSeconds)
      return { ...result, value };
  }
  return best &&
    best.marginSeconds - barrier.marginSeconds >= minimumGainSeconds
    ? best
    : null;
}

function range(from: number, to: number, step: number) {
  const values: number[] = [];
  for (let value = from; step > 0 ? value <= to : value >= to; value += step)
    values.push(value);
  return values;
}

function targetStep(inputs: Inputs, targetSeconds: number): SettingStep[] {
  const previous = inputs.planned.scenario.seconds;
  return targetSeconds === previous
    ? []
    : [{ setting: "target", value: targetSeconds, previous }];
}

function samePaceNote(inputs: Inputs, targetSeconds: number) {
  return targetSeconds === inputs.planned.scenario.seconds
    ? "Ton objectif ne change pas."
    : `Même allure de course, objectif ${formatHours(targetSeconds)}.`;
}

function stopRemedy(inputs: Inputs, barrier: Barrier): CutoffRemedy | null {
  const current = inputs.plan.aidStopSeconds;
  const stations = inputs.model.waypoints.filter(
    (waypoint) =>
      (waypoint.kind === "aid" || waypoint.kind === "base") &&
      waypoint.distanceM > 0 &&
      waypoint.distanceM < barrier.distanceM,
  ).length;
  if (stations === 0 || current < 120) return null;
  const floor = Math.max(60, Math.round(current / 120) * 60);
  const best = bestOf(
    inputs,
    barrier,
    range(Math.floor((current - 1) / 60) * 60, floor, -60),
    (value) => ({ aidStopSeconds: value }),
    true,
  );
  if (!best) return null;
  return {
    key: "stops",
    changes: [
      { setting: "aidStop", value: best.value, previous: current },
      ...targetStep(inputs, best.targetSeconds),
    ],
    title: "Raccourcir les arrêts aux ravitos",
    detail: `${formatDuration(current)} → ${formatDuration(best.value)} par ravito, ${stations === 1 ? "1 ravito" : `${stations} ravitos`} ${barrier.before}. ${samePaceNote(inputs, best.targetSeconds)}`,
    marginSeconds: best.marginSeconds,
    margin: `marge ${formatMargin(best.marginSeconds)}`,
  };
}

function walkRemedy(inputs: Inputs, barrier: Barrier): CutoffRemedy | null {
  const current = inputs.plan.walkGradePercent;
  const { max } = settingBounds.walkGrade;
  if (current >= max || inputs.model.portions.length === 0) return null;
  const best = bestOf(
    inputs,
    barrier,
    range(current + 1, Math.min(max, current + 5), 1),
    (value) => ({ walkGrade: value }),
    true,
  );
  if (!best) return null;
  return {
    key: "walk",
    changes: [
      { setting: "walkGrade", value: best.value, previous: current },
      ...targetStep(inputs, best.targetSeconds),
    ],
    title: `Marcher dès ${best.value} %`,
    detail: `Tu cours les côtes entre ${current} et ${best.value} %. ${samePaceNote(inputs, best.targetSeconds)}`,
    marginSeconds: best.marginSeconds,
    margin: `marge ${formatMargin(best.marginSeconds)}`,
  };
}

function targetRemedy(inputs: Inputs, barrier: Barrier): CutoffRemedy | null {
  const current = inputs.planned.scenario.seconds;
  const { step, min } = settingBounds.target;
  const first = Math.ceil(current / step) * step - step;
  const floor = Math.max(min, Math.round((current * 0.85) / step) * step);
  if (first < floor) return null;
  const best = bestOf(
    inputs,
    barrier,
    range(first, floor, -step),
    (value) => ({ targetSeconds: value }),
    false,
  );
  if (!best) return null;
  return {
    key: "target",
    changes: targetStep(inputs, best.value),
    title: `Viser ${formatHours(best.value)} au lieu de ${formatHours(current)}`,
    detail: `Tout le plan avance de ${formatDuration(current - best.value)}, en courant plus vite.`,
    marginSeconds: best.marginSeconds,
    margin: `marge ${formatMargin(best.marginSeconds)}`,
  };
}

function marginWeights(inputs: Inputs, barrier: Barrier): MarginWeight[] {
  const gainWith = (overrides: Overrides) => {
    const result = outcome(inputs, barrier, overrides, true);
    return result ? result.marginSeconds - barrier.marginSeconds : 0;
  };
  const before = (distanceM: number) => distanceM < barrier.distanceM;
  const stops = inputs.planned.simulation.stops.filter(
    (stop) => before(stop.distanceM) && stop.seconds > 0,
  );
  const walkedM = inputs.model.portions.reduce(
    (sum, portion) =>
      sum +
      Math.max(0, Math.min(portion.toM, barrier.distanceM) - portion.fromM),
    0,
  );
  const items: {
    key: string;
    label: string;
    seconds: number;
    detail: string;
  }[] = [];
  if (stops.length > 0)
    items.push({
      key: "stops",
      label: "Arrêts aux ravitos",
      seconds: gainWith({ aidStopSeconds: 0, waterStopSeconds: 0 }),
      detail: `${stops.length === 1 ? "1 arrêt" : `${stops.length} arrêts`} ${barrier.before}`,
    });
  if (walkedM > 0)
    items.push({
      key: "walk",
      label: "Côtes marchées",
      seconds: gainWith({ walking: false }),
      detail: `${formatKm(walkedM)} km marchés`,
    });
  if (inputs.paceFactors && Object.keys(inputs.paceFactors).length > 0)
    items.push({
      key: "strategy",
      label: "Consignes du stratège",
      seconds: gainWith({ paceFactors: false }),
      detail: "allure par tronçon",
    });
  return items
    .filter((item) => item.seconds >= minimumGainSeconds)
    .sort((a, b) => b.seconds - a.seconds)
    .map((item) => ({
      key: item.key,
      label: item.label,
      value: `+${formatDuration(item.seconds)}`,
      detail: item.detail,
    }));
}

const ways = ["une façon", "deux façons", "trois façons"];

export function cutoffAlert(inputs: Inputs): CutoffAlert | null {
  if (!inputs.planned.simulation.feasible) return null;
  const barrier = barriersOf(inputs)
    .filter((item) => item.threatened)
    .sort((a, b) => a.marginSeconds - b.marginSeconds)[0];
  if (!barrier) return null;
  const remedies =
    inputs.planned.scenario.key === "target"
      ? [
          stopRemedy(inputs, barrier),
          walkRemedy(inputs, barrier),
          targetRemedy(inputs, barrier),
        ].filter((item): item is CutoffRemedy => item !== null)
      : [];
  const late = barrier.marginSeconds < 0;
  const passing =
    barrier.at === "à l’arrivée"
      ? `Je te fais arriver à ${barrier.passage} pour une barrière à ${barrier.cutoff}.`
      : `Je te fais passer ${barrier.at} à ${barrier.passage} pour une barrière à ${barrier.cutoff}.`;
  const verdict = late
    ? `C’est ${formatDuration(-barrier.marginSeconds)} après la barrière.`
    : "C’est trop juste pour un imprévu.";
  const next = remedies.length
    ? `Voici ${ways[remedies.length - 1]} de retrouver de la marge.`
    : "Aucun réglage de la simulation ne suffit à retrouver de la marge.";
  return {
    barrier,
    badge: late
      ? `Hors délai de ${formatDuration(-barrier.marginSeconds)}`
      : `Marge de ${formatDuration(barrier.marginSeconds)}`,
    reading: `${passing} ${verdict} ${next}`,
    remedies,
    weights: marginWeights(inputs, barrier),
  };
}
