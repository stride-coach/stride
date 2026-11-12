import { describe, expect, test } from "vitest";
import { buildCourse } from "@/features/races/course";
import { courseReplacement } from "@/features/races/course-replacement";
import { courseFromStored } from "@/features/races/workspace";
import type { Waypoint } from "@/features/races/waypoints";
import { stored, waypoints } from "./race-course-fixture";

const metersPerDegree = 111_195;

function line(fromM: number, lengthM: number) {
  return buildCourse(
    Array.from({ length: lengthM / 10 + 1 }, (_, index) => ({
      lat: 48.8 + (fromM + index * 10) / metersPerDegree,
      lon: 2.3,
      ele: 100 + 60 * Math.sin((fromM + index * 10) / 900),
    })),
  )!;
}

const current = courseFromStored(stored);
const [start, aid, , finish] = waypoints;

const fromGpx = (
  id: string,
  name: string,
  distanceM: number,
  extra: Partial<Waypoint> = {},
): Waypoint => ({
  ...aid,
  id,
  name,
  distanceM,
  kind: "summit",
  cutoffMinutes: null,
  services: [],
  todo: null,
  source: "gpx",
  ...extra,
});

const points = [
  start,
  fromGpx("00000000-0000-4000-8000-0000000000c1", "Col de la Croix", 10_000, {
    cutoffMinutes: 10 * 60,
  }),
  aid,
  fromGpx("00000000-0000-4000-8000-0000000000c2", "Ancien sommet", 20_000),
  finish,
];

describe("course replacement", () => {
  test("lists what changes and what is kept before replacing", () => {
    const next = line(1000, 38_000);
    const replacement = courseReplacement({
      current,
      next,
      waypoints: points,
      incoming: [
        { kind: "summit", name: "col de la croix", distance_m: 9000 },
        { kind: "water", name: "Nouveau point d’eau", distance_m: 30_000 },
      ],
      walkGradePercent: 5,
      road: false,
    });
    expect(replacement.rows.map((row) => [row.label, row.delta])).toEqual([
      ["Distance", "−2,0 km"],
      ["Dénivelé", expect.any(String)],
      ["Points de passage", "2 déplacés"],
      ["Côtes à marcher", expect.any(String)],
    ]);
    expect(replacement.rows[0]).toMatchObject({
      current: "40,0 km",
      next: "38,0 km",
    });
    expect(replacement.moves).toEqual([
      {
        name: "Col de la Croix",
        current: "km 10,0",
        next: "km 9,0",
        delta: "−1,0 km",
      },
      {
        name: "Ravito 1 · Trappes",
        current: "km 15,0",
        next: "km 14,0",
        delta: "−1,0 km",
      },
    ]);
    expect(replacement.removed).toEqual(["Ancien sommet"]);
    expect(replacement.added).toEqual(["Nouveau point d’eau"]);
    expect(replacement.carry).toEqual([
      {
        kind: "settings",
        from: "00000000-0000-4000-8000-0000000000c1",
        name: "col de la croix",
        waypointKind: "summit",
      },
      { kind: "move", id: aid.id, distanceM: 14_000 },
    ]);
    expect(replacement.kept).toBe(
      "Ton objectif, ton heure de départ, tes arrêts, ton seuil de marche et ton plan de ravitaillement sont gardés et recalés sur le nouveau tracé. Le point « Ravito 1 · Trappes » que tu as ajouté est replacé au plus près et passe « À vérifier ». Les réglages d’un point du GPX (barrière, services, notes) sont repris sur le nouveau.",
    );
  });

  test("keeps a point's kilometre when the new course no longer passes there", () => {
    const elsewhere = buildCourse(
      Array.from({ length: 3001 }, (_, index) => ({
        lat: 45,
        lon: 5 + (index * 10) / 78_000,
        ele: 300,
      })),
    )!;
    const replacement = courseReplacement({
      current,
      next: elsewhere,
      waypoints: [start, aid, finish],
      incoming: [],
      walkGradePercent: 10,
      road: false,
    });
    expect(replacement.carry).toEqual([
      { kind: "move", id: aid.id, distanceM: 15_000 },
    ]);
    expect(replacement.moves).toEqual([]);
    expect(replacement.rows.find((row) => row.key === "points")?.delta).toBe(
      "aucun déplacé",
    );
  });
});
