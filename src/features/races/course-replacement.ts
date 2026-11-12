import { haversine, pointDistance, positionAt, type Course } from "./course";
import { formatInteger, formatKm } from "./format";
import { walkPortions, walkSummary } from "./grade";
import type { Waypoint, WaypointKind } from "./waypoints";

export type IncomingWaypoint = {
  kind: WaypointKind;
  name: string;
  distance_m: number;
};

export type ReplacementRow = {
  key: string;
  label: string;
  current: string;
  next: string;
  delta: string;
};

export type ReplacementMove = {
  name: string;
  current: string;
  next: string;
  delta: string;
};

export type ReplacementCarry =
  | { kind: "move"; id: string; distanceM: number }
  | {
      kind: "settings";
      from: string;
      name: string;
      waypointKind: WaypointKind;
    };

export type CourseReplacement = {
  rows: ReplacementRow[];
  moves: ReplacementMove[];
  removed: string[];
  added: string[];
  kept: string;
  carry: ReplacementCarry[];
};

const movedThresholdM = 100;
const offCourseM = 250;

export function normalizedName(name: string) {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function signedKm(meters: number) {
  const value = formatKm(Math.abs(meters));
  return meters === 0
    ? "identique"
    : meters > 0
      ? `+${value} km`
      : `−${value} km`;
}

function signedMeters(meters: number) {
  const value = formatInteger(Math.abs(meters));
  return meters === 0
    ? "identique"
    : meters > 0
      ? `+${value} m`
      : `−${value} m`;
}

function reprojected(current: Course, next: Course, distanceM: number) {
  const { lat, lon } = positionAt(current, distanceM);
  const expected = (distanceM * next.distanceM) / current.distanceM;
  const window = Math.max(2000, next.distanceM * 0.15);
  let best: { distanceM: number; offsetM: number } | null = null;
  next.points.forEach((point, index) => {
    const along = pointDistance(next, index);
    if (Math.abs(along - expected) > window) return;
    const offsetM = haversine(
      { lat, lon, ele: null },
      { lat: point[0], lon: point[1], ele: null },
    );
    if (!best || offsetM < best.offsetM) best = { distanceM: along, offsetM };
  });
  const found = best as { distanceM: number; offsetM: number } | null;
  return found && found.offsetM <= offCourseM
    ? Math.round(found.distanceM * 10) / 10
    : Math.min(distanceM, next.distanceM);
}

function hasSettings(point: Waypoint) {
  return (
    point.cutoffMinutes !== null ||
    point.services.length > 0 ||
    point.watchLabel !== null ||
    point.voiceNote !== null ||
    point.nutritionNote !== null
  );
}

function walkedM(course: Course, threshold: number, road: boolean) {
  return road ? 0 : walkSummary(walkPortions(course, threshold)).distanceM;
}

export function courseReplacement({
  current,
  next,
  waypoints,
  incoming,
  walkGradePercent,
  road,
}: {
  current: Course;
  next: Course;
  waypoints: Waypoint[];
  incoming: IncomingWaypoint[];
  walkGradePercent: number;
  road: boolean;
}): CourseReplacement {
  const points = waypoints.filter(
    (point) => point.kind !== "start" && point.kind !== "finish",
  );
  const replaced = (point: Waypoint) =>
    point.source === "gpx" || point.source === "course";
  const fromGpx = points.filter(replaced);
  const kept = points.filter((point) => !replaced(point));
  const used = new Set<number>();
  const moves: ReplacementMove[] = [];
  const removed: string[] = [];
  const carry: ReplacementCarry[] = [];
  for (const point of fromGpx) {
    const index = incoming.findIndex(
      (item, position) =>
        !used.has(position) &&
        item.kind === point.kind &&
        normalizedName(item.name) === normalizedName(point.name),
    );
    if (index < 0) {
      removed.push(point.name);
      continue;
    }
    used.add(index);
    const match = incoming[index];
    if (Math.abs(match.distance_m - point.distanceM) >= movedThresholdM)
      moves.push({
        name: point.name,
        current: `km ${formatKm(point.distanceM)}`,
        next: `km ${formatKm(match.distance_m)}`,
        delta: signedKm(match.distance_m - point.distanceM),
      });
    if (hasSettings(point))
      carry.push({
        kind: "settings",
        from: point.id,
        name: match.name,
        waypointKind: match.kind,
      });
  }
  for (const point of kept) {
    const distanceM = reprojected(current, next, point.distanceM);
    carry.push({ kind: "move", id: point.id, distanceM });
    if (Math.abs(distanceM - point.distanceM) >= movedThresholdM)
      moves.push({
        name: point.name,
        current: `km ${formatKm(point.distanceM)}`,
        next: `km ${formatKm(distanceM)}`,
        delta: signedKm(distanceM - point.distanceM),
      });
  }
  const added = incoming
    .filter((_, index) => !used.has(index))
    .map((item) => item.name);
  const nextCount = kept.length + incoming.length;
  const currentWalk = walkedM(current, walkGradePercent, road);
  const nextWalk = walkedM(next, walkGradePercent, road);
  const rows: ReplacementRow[] = [
    {
      key: "distance",
      label: "Distance",
      current: `${formatKm(current.distanceM)} km`,
      next: `${formatKm(next.distanceM)} km`,
      delta: signedKm(next.distanceM - current.distanceM),
    },
  ];
  if (current.elevationGainM !== null && next.elevationGainM !== null)
    rows.push({
      key: "gain",
      label: "Dénivelé",
      current: `+${formatInteger(current.elevationGainM)} m`,
      next: `+${formatInteger(next.elevationGainM)} m`,
      delta: signedMeters(next.elevationGainM - current.elevationGainM),
    });
  rows.push({
    key: "points",
    label: "Points de passage",
    current: formatInteger(points.length),
    next: formatInteger(nextCount),
    delta:
      moves.length === 0
        ? "aucun déplacé"
        : moves.length === 1
          ? "1 déplacé"
          : `${moves.length} déplacés`,
  });
  if (!road)
    rows.push({
      key: "walk",
      label: "Côtes à marcher",
      current: `${formatKm(currentWalk)} km`,
      next: `${formatKm(nextWalk)} km`,
      delta: signedKm(Math.round((nextWalk - currentWalk) / 100) * 100),
    });
  const settings = carry.filter((item) => item.kind === "settings").length;
  const sentences = [
    "Ton objectif, ton heure de départ, tes arrêts, ton seuil de marche et ton plan de ravitaillement sont gardés et recalés sur le nouveau tracé.",
    kept.length === 1
      ? `Le point « ${kept[0].name} » que tu as ajouté est replacé au plus près et passe « À vérifier ».`
      : kept.length > 1
        ? `Les ${kept.length} points que tu as ajoutés sont replacés au plus près et passent « À vérifier ».`
        : null,
    settings === 1
      ? "Les réglages d’un point du GPX (barrière, services, notes) sont repris sur le nouveau."
      : settings > 1
        ? `Les réglages de ${settings} points du GPX (barrière, services, notes) sont repris sur les nouveaux.`
        : null,
  ];
  return {
    rows,
    moves,
    removed,
    added,
    kept: sentences.filter(Boolean).join(" "),
    carry,
  };
}
