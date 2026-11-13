import { buildCourse } from "./course";
import { parseGpx } from "./gpx";
import type { RaceKind } from "./calendar";
import { guessKind } from "./waypoints";

export type GpxSummary = {
  name: string | null;
  distanceM: number;
  elevationGainM: number | null;
  aidStations: number;
};

const stationKinds = new Set(["aid", "water", "base"]);
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function gpxSummary(xml: string): GpxSummary | null {
  const parsed = parseGpx(xml);
  if (typeof parsed === "string") return null;
  const course = buildCourse(parsed.points);
  if (!course) return null;
  return {
    name: parsed.name,
    distanceM: course.distanceM,
    elevationGainM: course.elevationGainM,
    aidStations: parsed.waypoints.filter((point) =>
      stationKinds.has(
        guessKind(point.name, point.description, point.type) ?? "",
      ),
    ).length,
  };
}

export function formatRaceDateField(iso: string) {
  return shortDate.format(new Date(`${iso}T00:00:00Z`));
}

function shortRaceName(name: string) {
  return name.replace(/\s+\d+(?:[.,]\d+)?\s*(?:k|km)$/i, "").trim() || name;
}

export function tailoredTests(
  kind: RaceKind,
  primary: { name: string; kind: RaceKind } | null,
  base: string[],
) {
  if (!primary || primary.kind !== kind) return base;
  const name = shortRaceName(primary.name);
  return kind === "trail"
    ? [
        "Alimentation de course",
        "Départ de nuit",
        "Frontale et batterie",
        `Sac ${name}`,
        `Allure ${name} sur le plat`,
        "Marche dans les côtes",
        "Bâtons",
        "Chaussures de course",
      ]
    : [
        "Alimentation de course",
        `Allure ${name}`,
        "Chaussures de course",
        "Échauffement",
        "Tenue de course",
      ];
}

export function priorityComment(
  priority: "A" | "B" | "C",
  primaryName: string | null,
) {
  if (priority === "A")
    return "Une course A structure tout le plan : le coach te proposera la préparation à relire avant de l’appliquer.";
  if (priority === "B")
    return primaryName
      ? `Bon choix pour une B : 2 à 3 jours plus légers avant, une récupération après, et une vraie répétition avant ${shortRaceName(primaryName)}.`
      : "Bon choix pour une B : 2 à 3 jours plus légers avant et une récupération après.";
  return "Une C se court comme une séance, sans affûtage : garde-la pour tester ce qui compte.";
}
