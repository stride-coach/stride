import { z } from "zod";
import { formatClock, formatKm } from "./format";
import { isStation, type Waypoint } from "./waypoints";
import type { CourseModel, RacePlanModel } from "./workspace";

export type CrewPoint = {
  id: string;
  name: string;
  distance: string;
  planned: string;
  window: string | null;
  access: string | null;
  prepare: string | null;
  editable: boolean;
};

export type CrewGap = {
  id: string;
  name: string;
  distance: string;
  reason: string | null;
  editable: boolean;
};

export type CrewPlan = {
  reading: string;
  points: CrewPoint[];
  gaps: CrewGap[];
  windows: boolean;
};

const counts = [
  "",
  "un ravito",
  "deux ravitos",
  "trois ravitos",
  "quatre ravitos",
  "cinq ravitos",
  "six ravitos",
  "sept ravitos",
  "huit ravitos",
  "neuf ravitos",
];

const crewText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable();

export const crewDetailsSchema = z.strictObject({
  access: crewText(120),
  prepare: crewText(200),
  reason: crewText(120),
});

export type CrewDetails = z.output<typeof crewDetailsSchema>;

function clockOf(planned: RacePlanModel | null, id: string) {
  const passage = planned?.simulation.passages.find(
    (item) => item.waypointId === id,
  );
  return passage ? passage.clockMinutes : null;
}

function withCrew(point: Waypoint) {
  return (
    point.kind === "finish" ||
    (isStation(point.kind) && point.services.includes("assistance"))
  );
}

export function crewPlan({
  model,
  planned,
  ambitious,
  cautious,
}: {
  model: CourseModel;
  planned: RacePlanModel;
  ambitious: RacePlanModel | null;
  cautious: RacePlanModel | null;
}): CrewPlan {
  const early = ambitious ?? (cautious ? planned : null);
  const late = cautious ?? (ambitious ? planned : null);
  const points = model.waypoints.filter(withCrew).map((point): CrewPoint => {
    const target = clockOf(planned, point.id);
    const from = clockOf(early, point.id);
    const to = clockOf(late, point.id);
    return {
      id: point.id,
      name: point.name,
      distance: `km ${formatKm(point.distanceM)}`,
      planned: target === null ? "—" : formatClock(target),
      window:
        from === null || to === null
          ? null
          : `${formatClock(from)} – ${formatClock(to)}`,
      access: point.crewAccess,
      prepare: point.crewPrepare,
      editable: !point.id.startsWith("virtual-"),
    };
  });
  const gaps = model.waypoints
    .filter((point) => isStation(point.kind) && !withCrew(point))
    .map((point): CrewGap => ({
      id: point.id,
      name: point.name,
      distance: `km ${formatKm(point.distanceM)}`,
      reason: point.crewReason,
      editable: !point.id.startsWith("virtual-"),
    }));
  const stations = points.length - 1;
  const where =
    stations <= 0
      ? "Ton assistance peut te retrouver à l’arrivée : aucun ravito ne lui est ouvert."
      : `Ton assistance peut te voir à ${counts[stations] ?? `${stations} ravitos`} et à l’arrivée.`;
  const windows = early !== null && late !== null;
  return {
    reading: windows
      ? `${where} La fenêtre va de ton scénario ambitieux au prudent : qu’elle arrive au début.`
      : `${where} Ajoute un scénario prudent ou ambitieux pour lui donner une fenêtre de passage.`,
    points,
    gaps,
    windows,
  };
}
