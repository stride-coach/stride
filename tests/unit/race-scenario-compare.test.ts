import { describe, expect, it } from "vitest";
import {
  carbsStatus,
  compareScenarios,
  tenability,
} from "@/features/races/scenario-compare";
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

describe("scenario tenability", () => {
  it("is risky when out of reach or under 30 minutes of margin", () => {
    expect(
      tenability({
        feasible: false,
        marginSeconds: null,
        carbsAboveTested: false,
      }),
    ).toEqual({ label: "Risqué", level: "alert" });
    expect(
      tenability({
        feasible: true,
        marginSeconds: 20 * 60,
        carbsAboveTested: false,
      }),
    ).toEqual({ label: "Risqué", level: "alert" });
  });

  it("is only tenable under an hour of margin or above the tested carbs", () => {
    expect(
      tenability({
        feasible: true,
        marginSeconds: 45 * 60,
        carbsAboveTested: false,
      }).label,
    ).toBe("Tenable");
    expect(
      tenability({
        feasible: true,
        marginSeconds: null,
        carbsAboveTested: true,
      }).label,
    ).toBe("Tenable");
    expect(
      tenability({
        feasible: true,
        marginSeconds: 3 * 3600,
        carbsAboveTested: false,
      }).label,
    ).toBe("Très tenable");
  });

  it("says whether the carbs per hour were tested in training", () => {
    expect(carbsStatus(70, 60)).toEqual({
      value: "70 g/h",
      status: "à valider",
    });
    expect(carbsStatus(60, 60)?.status).toBe("validé");
    expect(carbsStatus(60, null)?.status).toBe("jamais testé");
  });
});

describe("custom scenarios", () => {
  const custom: Scenario = {
    key: "custom:11111111-1111-4111-8111-111111111111",
    label: "Sans bâtons",
    seconds: 5.5 * 3600,
    custom: {
      id: "11111111-1111-4111-8111-111111111111",
      name: "Sans bâtons",
      targetSeconds: 5.5 * 3600,
      walkGradePercent: 12,
      aidStopSeconds: 120,
      carbsPerHourG: 90,
      position: 0,
    },
  };
  const result = compareScenarios({
    model,
    race,
    plan: { ...plan, planB: custom.key },
    scenarios: [custom, ambitious, target, cautious],
    shown: "target",
    timeZone: stored.timeZone,
    timeline,
  });
  const card = result.cards.at(-1)!;

  it("comes after the built-in scenarios with its own settings", () => {
    expect(result.cards.map((item) => item.label)).toEqual([
      "Prudent",
      "Objectif",
      "Ambitieux",
      "Sans bâtons",
    ]);
    expect(card.customId).toBe("11111111-1111-4111-8111-111111111111");
    expect(card.settings).toEqual({
      walkGradePercent: 12,
      aidStopSeconds: 120,
      carbsPerHourG: 90,
    });
    expect(card.walk).toMatch(/^dès 12 %/);
    expect(card.carbs?.value).toBe("90 g/h");
  });

  it("walks less with a steeper walking threshold", () => {
    const walked = (value: string) =>
      Number(value.split("·")[1].replace(",", ".").replace("km", "").trim());
    const objective = result.cards.find((item) => item.isTarget)!;
    expect(walked(card.walk)).toBeLessThan(walked(objective.walk));
  });

  it("flags the scenario kept as plan B", () => {
    expect(result.cards.filter((item) => item.planB)).toEqual([card]);
  });
});
