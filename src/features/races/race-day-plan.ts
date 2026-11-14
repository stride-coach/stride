import type { RaceNutritionAllocation } from "@/features/fueling/allocation";
import { productName } from "@/features/fueling/products";
import { elevationBetween } from "./course";
import { formatInteger, formatKm } from "./format";
import type { RaceDayPlan } from "./race-day";
import { elapsedAt } from "./simulation";
import type { RaceTimeline } from "./timeline";
import type { Waypoint } from "./waypoints";
import type { CourseModel, RacePlanModel } from "./workspace";

const trackStepM = 500;

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function climbLabel(model: CourseModel, fromM: number, toM: number) {
  const length = toM - fromM;
  const gain = elevationBetween(model.course, fromM, toM).gain ?? 0;
  const grade = length > 0 ? (gain / length) * 100 : 0;
  return `Côte de ${formatKm(Math.max(100, Math.round(length / 100) * 100))} km à ${formatInteger(grade)} %`;
}

function todoOf(
  station: { id: string },
  waypoint: Pick<Waypoint, "todo" | "nutritionNote"> | undefined,
  allocation: RaceNutritionAllocation | null,
) {
  const fueling = allocation?.stations[station.id]?.text ?? null;
  return [
    ...(fueling ? fueling.split(" · ") : []),
    waypoint?.nutritionNote ?? null,
    waypoint?.todo ?? null,
  ]
    .map((item) => item?.trim() ?? "")
    .filter((item) => item.length > 0)
    .map(capitalize);
}

function intakesOf(
  timeline: RaceTimeline,
  allocation: RaceNutritionAllocation | null,
) {
  if (!allocation) return [];
  return timeline.segments.flatMap((segment) => {
    const fueling = allocation.segments.find((item) => item.id === segment.id);
    if (!fueling) return [];
    const units = fueling.items.flatMap((portion) =>
      Array.from({ length: portion.count }, () => productName(portion.product)),
    );
    const begin =
      (timeline.stations.find((station) => station.id === segment.id)
        ?.elapsedSeconds ?? 0) - segment.movingSeconds;
    return units.map((label, index) => ({
      atSeconds: Math.round(
        begin + (segment.movingSeconds * (index + 1)) / (units.length + 1),
      ),
      label,
    }));
  });
}

export function raceDayPlan({
  race,
  model,
  planned,
  timeline,
  allocation,
  timeZone,
}: {
  race: { id: string; name: string };
  model: CourseModel;
  planned: RacePlanModel;
  timeline: RaceTimeline;
  allocation: RaceNutritionAllocation | null;
  timeZone: string;
}): RaceDayPlan | null {
  if (planned.startEpochMs === null || timeline.stations.length < 2)
    return null;
  const { course } = model;
  const waypoints = new Map(model.waypoints.map((point) => [point.id, point]));
  const track: [number, number][] = [];
  for (let meters = 0; meters < course.distanceM; meters += trackStepM)
    track.push([
      Math.round(elapsedAt(course, planned.simulation, meters)),
      meters,
    ]);
  track.push([Math.round(planned.simulation.finishSeconds), course.distanceM]);
  return {
    raceId: race.id,
    name: race.name,
    timeZone,
    startEpochMs: planned.startEpochMs,
    distanceM: course.distanceM,
    stations: timeline.stations.map((station) => ({
      id: station.id,
      name: station.name,
      kind: station.kind,
      distanceM: station.distanceM,
      arrivalSeconds: Math.round(station.elapsedSeconds),
      stopSeconds: station.stopSeconds,
      cutoffSeconds:
        station.marginSeconds === null
          ? null
          : Math.round(station.elapsedSeconds + station.marginSeconds),
      todo: todoOf(station, waypoints.get(station.id), allocation),
    })),
    climbs: model.portions.map((portion) => ({
      fromM: portion.fromM,
      toM: portion.toM,
      label: climbLabel(model, portion.fromM, portion.toM),
    })),
    intakes: intakesOf(timeline, allocation),
    nights: (planned.night?.windows ?? []).map((window) => ({
      fromSeconds: Math.round(window.fromSeconds),
      toSeconds: Math.round(window.toSeconds),
    })),
    track,
  };
}
