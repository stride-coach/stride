import { describe, expect, it } from "vitest";
import { compareScenarios } from "@/features/races/scenario-compare";
import type { Scenario } from "@/features/races/workspace";
import { model, plan, race, stored, timeline } from "./race-course-fixture";

const target: Scenario = {
  key: "target",
  label: "objectif",
  seconds: 5 * 3600,
};
const cautious: Scenario = {
  key: "cautious",
  label: "prudent",
  seconds: 6 * 3600,
};
const ambitious: Scenario = {
  key: "ambitious",
  label: "ambitieux",
  seconds: 4.5 * 3600,
};

function compare(scenarios: Scenario[]) {
  return compareScenarios({
    model,
    race,
    plan,
    scenarios,
    shown: "target",
    timeZone: stored.timeZone,
    timeline,
  });
}

describe("scenario comparison", () => {
  const all = compare([ambitious, target, cautious]);

  it("orders prudent, target and ambitious with their finish and pace", () => {
    expect(
      all.cards.map((card) => [
        card.label,
        card.target,
        card.finish,
        card.pace,
      ]),
    ).toEqual([
      ["Prudent", "6h00", "12:00", "9:00 /km"],
      ["Objectif", "5h00", "11:00", "7:30 /km"],
      ["Ambitieux", "4h30", "10:30", "6:45 /km"],
    ]);
    expect(all.cards.find((card) => card.isTarget)?.shown).toBe(true);
    expect(all.missing).toEqual([]);
  });

  it("compares the passage times at each station", () => {
    expect(all.passages.map((row) => row.name)).toEqual(
      timeline.stations.slice(1).map((station) => station.name),
    );
    const [first] = all.passages;
    expect(first.clocks.map((item) => item.key)).toEqual([
      "cautious",
      "target",
      "ambitious",
    ]);
    expect(first.clocks[0].clock > first.clocks[2].clock).toBe(true);
  });

  it("shrinks the cutoff margin as the scenario slows down", () => {
    const [prudent, objective, quick] = all.cards;
    const minutes = (value: string | undefined) => {
      const [hours, rest] = (value ?? "0h00").split("h").map(Number);
      return hours * 60 + rest;
    };
    expect(minutes(prudent.margin?.value)).toBeLessThan(
      minutes(objective.margin?.value),
    );
    expect(minutes(objective.margin?.value)).toBeLessThan(
      minutes(quick.margin?.value),
    );
  });

  it("reads the spread and asks for the missing scenarios", () => {
    expect(all.reading).toBe(
      "Ton objectif de 5h00 te fait arriver à 11:00. Le prudent arrive 1h00 plus tard. L’ambitieux te demande 30 min de moins.",
    );
    const alone = compare([target]);
    expect(alone.missing).toEqual(["cautious", "ambitious"]);
    expect(alone.reading).toMatch(/Ajoute un scénario prudent et un ambitieux/);
  });
});
