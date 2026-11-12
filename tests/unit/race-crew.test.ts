import { describe, expect, test } from "vitest";
import { crewDetailsSchema, crewPlan } from "@/features/races/crew";
import { courseModel, planModel } from "@/features/races/workspace";
import { ids, plan, race, stored, waypoints } from "./race-course-fixture";

const crewed = waypoints.map((point) =>
  point.id === ids.aid
    ? {
        ...point,
        services: ["water" as const, "assistance" as const],
        crewAccess: "Parking du gymnase, 5 min à pied",
        crewPrepare: "2 flasques iso, 4 gels",
      }
    : point.id === ids.water
      ? { ...point, crewReason: "Pas d’accès en voiture" }
      : point,
);
const model = courseModel(stored, crewed, plan, race.kind);
const planned = (seconds: number) =>
  planModel({
    model,
    race,
    plan,
    scenario: { key: "target", label: "objectif", seconds },
    timeZone: stored.timeZone,
  });

describe("crew plan", () => {
  test("lists where and when the crew meets the athlete", () => {
    const crew = crewPlan({
      model,
      planned: planned(5 * 3600),
      ambitious: planned(4.5 * 3600),
      cautious: planned(5.5 * 3600),
    });
    expect(crew.reading).toBe(
      "Ton assistance peut te voir à un ravito et à l’arrivée. La fenêtre va de ton scénario ambitieux au prudent : qu’elle arrive au début.",
    );
    expect(crew.points.map((point) => point.name)).toEqual([
      "Ravito 1 · Trappes",
      ids.finish,
    ]);
    expect(crew.points[0]).toMatchObject({
      distance: "km 15,0",
      access: "Parking du gymnase, 5 min à pied",
      prepare: "2 flasques iso, 4 gels",
      window: expect.stringMatching(/^\d\d:\d\d – \d\d:\d\d$/),
    });
    expect(crew.points[1]).toMatchObject({
      planned: "11:00",
      window: "10:30 – 11:30",
    });
    expect(crew.gaps).toEqual([
      {
        id: ids.water,
        name: ids.water,
        distance: "km 25,0",
        reason: "Pas d’accès en voiture",
        editable: true,
      },
    ]);
  });

  test("asks for scenarios when there is no window", () => {
    const crew = crewPlan({
      model: courseModel(stored, waypoints, plan, race.kind),
      planned: planned(5 * 3600),
      ambitious: null,
      cautious: null,
    });
    expect(crew.windows).toBe(false);
    expect(crew.reading).toBe(
      "Ton assistance peut te retrouver à l’arrivée : aucun ravito ne lui est ouvert. Ajoute un scénario prudent ou ambitieux pour lui donner une fenêtre de passage.",
    );
    expect(crew.points.every((point) => point.window === null)).toBe(true);
  });

  test("clears empty crew notes", () => {
    expect(
      crewDetailsSchema.parse({
        access: "  ",
        prepare: "Veste ",
        reason: null,
      }),
    ).toEqual({ access: null, prepare: "Veste", reason: null });
  });
});
