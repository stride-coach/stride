import { formatClock, formatHours, formatPace } from "./format";
import type { RacePlan, RaceSummary } from "./race";
import type { RaceTimeline } from "./timeline";
import {
  planModel,
  type CourseModel,
  type RacePlanModel,
  type Scenario,
  type ScenarioKey,
} from "./workspace";

export type ScenarioCard = {
  key: ScenarioKey;
  label: string;
  target: string;
  finish: string;
  finishDetail: string | null;
  pace: string;
  walk: string;
  margin: { value: string; detail: string; tight: boolean } | null;
  feasible: boolean;
  isTarget: boolean;
  shown: boolean;
  seconds: number;
};

export type PassageRow = {
  id: string;
  name: string;
  distance: string;
  clocks: { key: ScenarioKey; clock: string }[];
};

export type ScenarioComparison = {
  reading: string;
  cards: ScenarioCard[];
  passages: PassageRow[];
  missing: ScenarioKey[];
};

const order: ScenarioKey[] = ["cautious", "target", "ambitious"];

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function delta(seconds: number) {
  const minutes = Math.round(Math.abs(seconds) / 60);
  return minutes >= 60 ? formatHours(Math.abs(seconds)) : `${minutes} min`;
}

export function compareScenarios({
  model,
  race,
  plan,
  scenarios,
  shown,
  timeZone,
  timeline,
  paceFactors,
}: {
  model: CourseModel;
  race: RaceSummary;
  plan: RacePlan;
  scenarios: Scenario[];
  shown: ScenarioKey;
  timeZone: string;
  timeline: RaceTimeline;
  paceFactors?: Readonly<Record<string, number>>;
}): ScenarioComparison {
  const runs = [...scenarios]
    .sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
    .map((scenario) => ({
      scenario,
      planned: planModel({
        model,
        race,
        plan,
        scenario,
        timeZone,
        paceFactors,
      }) as RacePlanModel,
    }));
  const start = runs[0]?.planned.simulation.passages[0]?.clockMinutes ?? 0;
  const walkedM = model.portions.reduce(
    (sum, portion) => sum + portion.toM - portion.fromM,
    0,
  );
  const names = new Map(
    model.waypoints.map((waypoint) => [waypoint.id, waypoint.name]),
  );
  const cards = runs.map(({ scenario, planned }): ScenarioCard => {
    const { simulation } = planned;
    const finishMinutes = start + simulation.finishSeconds / 60;
    const margins = [
      ...simulation.passages.flatMap((passage) =>
        passage.marginSeconds === null
          ? []
          : [
              {
                seconds: passage.marginSeconds,
                detail: names.get(passage.waypointId) ?? "barrière",
              },
            ],
      ),
      ...(plan.cutoffSeconds
        ? [
            {
              seconds: plan.cutoffSeconds - simulation.finishSeconds,
              detail: "à l’arrivée",
            },
          ]
        : []),
    ];
    const tightest = margins.sort((a, b) => a.seconds - b.seconds)[0];
    return {
      key: scenario.key,
      label: capitalize(scenario.label),
      target: formatHours(scenario.seconds),
      finish: formatClock(finishMinutes),
      finishDetail: finishMinutes >= 1440 ? "le lendemain" : null,
      pace: `${formatPace(scenario.seconds / (model.course.distanceM / 1000))} /km`,
      walk: `dès ${plan.walkGradePercent} % · ${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(walkedM / 1000)} km`,
      margin: tightest
        ? {
            value: formatHours(Math.max(0, tightest.seconds)),
            detail: tightest.detail,
            tight: tightest.seconds < 30 * 60,
          }
        : null,
      feasible: simulation.feasible,
      isTarget: scenario.key === "target",
      shown: scenario.key === shown,
      seconds: scenario.seconds,
    };
  });
  const passages: PassageRow[] = timeline.stations
    .filter((station) => station.kind !== "start")
    .map((station) => ({
      id: station.id,
      name: station.name,
      distance: new Intl.NumberFormat("fr-FR", {
        maximumFractionDigits: 1,
      }).format(station.distanceM / 1000),
      clocks: runs.map(({ scenario, planned }) => {
        const passage = planned.simulation.passages.find(
          (item) => item.waypointId === station.id,
        );
        return {
          key: scenario.key,
          clock: passage ? formatClock(passage.clockMinutes) : "—",
        };
      }),
    }));
  const target = runs.find((run) => run.scenario.key === "target");
  const early = runs.find((run) => run.scenario.key === "ambitious");
  const late = runs.find((run) => run.scenario.key === "cautious");
  const reading = !target
    ? "Ajoute un objectif pour comparer tes scénarios."
    : !early && !late
      ? `Ton objectif de ${formatHours(target.scenario.seconds)} te fait arriver à ${cards.find((card) => card.isTarget)!.finish}. Ajoute un scénario prudent et un ambitieux pour l’encadrer.`
      : [
          `Ton objectif de ${formatHours(target.scenario.seconds)} te fait arriver à ${cards.find((card) => card.isTarget)!.finish}.`,
          late
            ? `Le prudent arrive ${delta(late.scenario.seconds - target.scenario.seconds)} plus tard.`
            : null,
          early
            ? `L’ambitieux te demande ${delta(target.scenario.seconds - early.scenario.seconds)} de moins.`
            : null,
        ]
          .filter(Boolean)
          .join(" ");
  return {
    reading,
    cards,
    passages,
    missing: (["cautious", "ambitious"] as const).filter(
      (key) => !scenarios.some((scenario) => scenario.key === key),
    ),
  };
}
