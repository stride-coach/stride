import { describe, expect, test } from "vitest";
import {
  barriersOf,
  cutoffAlert,
  threatenedMarginSeconds,
  type CutoffRemedy,
} from "@/features/races/cutoff-alert";
import type { RacePlan } from "@/features/races/race";
import { courseModel, planModel } from "@/features/races/workspace";
import {
  ids,
  plan,
  race,
  stored,
  target,
  waypoints,
} from "./race-course-fixture";

function setup(cutoffMinutes: number, overrides: Partial<RacePlan> = {}) {
  const tightPlan = { ...plan, ...overrides };
  const tight = waypoints.map((waypoint) =>
    waypoint.id === ids.aid
      ? { ...waypoint, cutoffMinutes: null }
      : waypoint.id === ids.water
        ? { ...waypoint, name: "Point d’eau", cutoffMinutes }
        : waypoint,
  );
  const model = courseModel(stored, tight, tightPlan, race.kind);
  const plannedFor = (
    planOverrides: Partial<RacePlan> = {},
    seconds = 5 * 3600,
  ) =>
    planModel({
      model: courseModel(
        stored,
        tight,
        { ...tightPlan, ...planOverrides },
        race.kind,
      ),
      race,
      plan: { ...tightPlan, ...planOverrides },
      scenario: { key: "target", label: "objectif", seconds },
      timeZone: stored.timeZone,
    });
  return { model, plan: tightPlan, planned: plannedFor(), plannedFor };
}

function applied(
  remedy: CutoffRemedy,
  plannedFor: ReturnType<typeof setup>["plannedFor"],
) {
  const value = (setting: string) =>
    remedy.changes.find((change) => change.setting === setting)?.value;
  const planned = plannedFor(
    {
      aidStopSeconds: value("aidStop") ?? plan.aidStopSeconds,
      walkGradePercent: value("walkGrade") ?? plan.walkGradePercent,
    },
    value("target") ?? 5 * 3600,
  );
  return planned.simulation.passages.find(
    (passage) => passage.waypointId === ids.water,
  )!.marginSeconds!;
}

describe("cutoff alert", () => {
  test("stays silent while every cutoff keeps 30 minutes of margin", () => {
    expect(
      barriersOf({ model: setup(11 * 60).model, planned: target, plan }),
    ).toHaveLength(1);
    const roomy = setup(10 * 60);
    expect(cutoffAlert(roomy)).toBeNull();
    expect(barriersOf(roomy)).toEqual([
      expect.objectContaining({
        name: "Point d’eau",
        passage: "09:06",
        cutoff: "10:00",
        margin: "54 min",
        threatened: false,
      }),
    ]);
  });

  test("names the threatened cutoff and offers remedies that the simulation confirms", () => {
    const tight = setup(9 * 60 + 20);
    const alert = cutoffAlert(tight)!;
    expect(alert.badge).toBe("Marge de 14 min");
    expect(alert.barrier.heading).toBe("Barrière horaire de Point d’eau");
    expect(alert.reading).toBe(
      "Je te fais passer à Point d’eau à 09:06 pour une barrière à 09:20. C’est trop juste pour un imprévu. Voici trois façons de retrouver de la marge.",
    );
    expect(alert.remedies.map((remedy) => remedy.key)).toEqual([
      "stops",
      "walk",
      "target",
    ]);
    for (const remedy of alert.remedies) {
      expect(remedy.marginSeconds).toBeGreaterThan(alert.barrier.marginSeconds);
      expect(applied(remedy, tight.plannedFor)).toBe(remedy.marginSeconds);
    }
    const goal = alert.remedies.find((remedy) => remedy.key === "target")!;
    expect(goal.marginSeconds).toBeGreaterThanOrEqual(threatenedMarginSeconds);
    expect(goal.title).toMatch(/^Viser 4h\d\d au lieu de 5h00$/);
    const stops = alert.remedies.find((remedy) => remedy.key === "stops")!;
    expect(stops.detail).toMatch(
      /^5 min → [1-4] min par ravito, 1 ravito avant Point d’eau\. Même allure de course, objectif 4h5\d\.$/,
    );
    expect(stops.changes.map((change) => change.setting)).toEqual([
      "aidStop",
      "target",
    ]);
  });

  test("says when the plan passes after the cutoff", () => {
    const alert = cutoffAlert(setup(9 * 60))!;
    expect(alert.badge).toBe("Hors délai de 6 min");
    expect(alert.reading).toContain("C’est 6 min après la barrière.");
    expect(alert.barrier.margin).toBe("6 min de retard");
  });

  test("reads the race cutoff at the finish", () => {
    const alert = cutoffAlert(
      setup(12 * 60, { cutoffSeconds: 5 * 3600 + 600 }),
    )!;
    expect(alert.barrier.waypointId).toBe(ids.finish);
    expect(alert.barrier.heading).toBe("Barrière horaire à l’arrivée");
    expect(alert.reading).toMatch(
      /^Je te fais arriver à 11:00 pour une barrière à 11:10\./,
    );
    expect(alert.badge).toBe("Marge de 10 min");
    expect(alert.remedies.map((remedy) => remedy.key)).toContain("target");
  });

  test("weighs what the stops and walked climbs cost at the cutoff", () => {
    const alert = cutoffAlert(setup(9 * 60 + 20))!;
    expect(alert.weights.map((weight) => weight.key)).toContain("stops");
    for (const weight of alert.weights)
      expect(weight.value).toMatch(/^\+\d+ min$|^\+\dh\d\d$/);
  });
});
