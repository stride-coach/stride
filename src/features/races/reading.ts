import {
  formatClock,
  formatDecimal,
  formatDuration,
  formatElapsed,
  formatKm,
  formatPace,
} from "./format";
import { productCarbs } from "./nutrition";
import { isStation } from "./waypoints";
import type { CourseModel, RacePlanModel } from "./workspace";

export type StrategyItem = { title: string; body: string };

function plural(count: number, word: string) {
  return `${count} ${word}${count > 1 ? "s" : ""}`;
}

function stationBefore(model: CourseModel, distanceM: number) {
  return [...model.waypoints]
    .reverse()
    .find(
      (waypoint) => isStation(waypoint.kind) && waypoint.distanceM <= distanceM,
    );
}

export function raceStrategy({
  model,
  planned,
  walkGrade,
  walkPaceSecondsPerKm,
}: {
  model: CourseModel;
  planned: RacePlanModel;
  walkGrade: number;
  walkPaceSecondsPerKm: number;
}): StrategyItem[] {
  const { simulation } = planned;
  const items: StrategyItem[] = [];
  const first = simulation.segments[0];
  const firstStop = model.waypoints.find(
    (waypoint) => waypoint.id === first?.toId,
  );
  if (first && firstStop)
    items.push({
      title: "Pars à l’allure prévue.",
      body: `Jusqu’au ${firstStop.name} (km ${formatKm(firstStop.distanceM)}), la simulation compte ${formatPace(first.paceSecondsPerKm)} /km en moyenne. Partir plus vite se paie en fin de course.`,
    });
  const walk = model.walkByThreshold.find(
    (item) => item.threshold === walkGrade,
  );
  if (walk && walk.count > 0)
    items.push({
      title: `Marche dès ${walkGrade} %.`,
      body: `${plural(walk.count, "portion")}, ${formatDecimal(walk.distanceM / 1000)} km, comptées à ${formatPace(walkPaceSecondsPerKm)} /km. Relance dès que ça s’aplatit.`,
    });
  const evening = planned.night?.windows.find(
    (window) => window.fromSeconds > 0,
  );
  if (evening && planned.night) {
    const index = planned.night.windows.indexOf(evening);
    const from = planned.nightKm[index].fromM;
    const before = stationBefore(model, from);
    items.push({
      title: before
        ? `Prépare la nuit avant le ${before.name}.`
        : "Prépare la nuit.",
      body: `La nuit tombe vers ${formatClock(simulation.passages[0].clockMinutes + evening.fromSeconds / 60)} (km ${Math.round(from / 1000)}). Frontale prête et couche chaude accessible avant ce point.`,
    });
  }
  const tight = simulation.passages
    .map((passage, index) => ({ passage, waypoint: model.waypoints[index] }))
    .filter(({ passage }) => passage.marginSeconds !== null)
    .sort((a, b) => a.passage.marginSeconds! - b.passage.marginSeconds!)[0];
  if (tight && tight.passage.marginSeconds! < 3600)
    items.push({
      title: `Surveille la barrière du ${tight.waypoint.name}.`,
      body:
        tight.passage.marginSeconds! < 0
          ? `Avec cet objectif, tu y arrives ${formatElapsed(-tight.passage.marginSeconds!)} après la barrière.`
          : `La marge prévue n’est que de ${formatElapsed(tight.passage.marginSeconds!)}.`,
    });
  const last = simulation.segments[simulation.segments.length - 1];
  if (
    last &&
    last.gainM !== null &&
    last.gainM / ((last.toM - last.fromM) / 1000) < 8
  ) {
    const from = model.waypoints.find(
      (waypoint) => waypoint.id === last.fromId,
    );
    items.push({
      title: "Gagne les portions plates de la fin.",
      body: `${from && from.kind !== "start" ? `Après le ${from.name}, il` : "Il"} reste ${formatKm(last.toM - last.fromM)} km presque plats (+${last.gainM} m), prévus à ${formatPace(last.paceSecondsPerKm)} /km.`,
    });
  }
  return items.slice(0, 4);
}

export function nutritionReading(
  planned: RacePlanModel,
  carbsPerHourG: number,
) {
  const moving = planned.nutrition.reduce(
    (sum, segment) => sum + segment.movingSeconds,
    0,
  );
  const night = planned.nutrition.filter(
    (segment) => segment.items.caffeineGels > 0,
  ).length;
  return [
    `Pour ${formatDuration(moving)} d’effort en mouvement, ${carbsPerHourG} g/h représentent ${planned.nutritionTotals.carbsG} g de glucides, soit l’équivalent de ${planned.nutritionTotals.gelEquivalents} gels de ${productCarbs.gel} g.`,
    "Les quantités suivent la durée prévue de chaque tronçon : un tronçon plus long demande plus de réserves.",
    night > 0
      ? `Sur ${plural(night, "tronçon")} de nuit, un gel est remplacé par un gel caféiné.`
      : null,
    "Teste ce rythme sur tes sorties longues avant le jour J.",
  ]
    .filter(Boolean)
    .join(" ");
}
