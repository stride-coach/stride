import { describe, expect, it } from "vitest";
import { summarizeSession } from "../../src/components/stride/session-blocks";
import { describeProgress } from "../../src/components/stride/steps";

describe("session shape summary", () => {
  it("describes kept volume, peak zone and removed work", () => {
    expect(
      summarizeSession([
        { minutes: 15, zone: 2 },
        { minutes: 6, zone: 4 },
        { minutes: 2, zone: 1 },
        { minutes: 6, zone: 4 },
        { minutes: 8, zone: 5, removed: true },
        { minutes: 10, zone: 2 },
      ]),
    ).toBe(
      "Structure de la séance : 39 minutes, jusqu’en zone 4, 1 bloc retiré (8 minutes)",
    );
  });

  it("ignores negative durations and handles an empty session", () => {
    expect(summarizeSession([{ minutes: -5, zone: 3 }])).toBe(
      "Structure de la séance : 0 minute, jusqu’en zone 3",
    );
    expect(summarizeSession([])).toBe("Structure de la séance : 0 minute");
  });
});

describe("onboarding progress", () => {
  it("reports the current step even when an earlier step runs in the background", () => {
    expect(
      describeProgress([
        "done",
        "done",
        "background",
        "current",
        "upcoming",
        "upcoming",
      ]),
    ).toEqual({ position: 4, total: 6, label: "Étape 4 sur 6" });
  });

  it("falls back to the step after the completed ones", () => {
    expect(describeProgress(["done", "upcoming", "upcoming"]).label).toBe(
      "Étape 2 sur 3",
    );
    expect(describeProgress(["done", "done"]).label).toBe("Étape 2 sur 2");
  });
});
