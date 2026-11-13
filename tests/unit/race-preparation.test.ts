import { describe, expect, it } from "vitest";
import {
  preparationRaces,
  raceKeySessions,
} from "@/features/races/preparation";

const session = (
  sessionKey: string,
  scheduledOn: string,
  isKey = true,
  kind: "run" | "race" | "rest" = "run",
) => ({
  sessionKey,
  title: `Séance ${sessionKey}`,
  purpose: `But ${sessionKey}`,
  scheduledOn,
  isKey,
  kind,
  sport: kind === "rest" ? "rest" : "run",
});

describe("key sessions for a race", () => {
  const sessions = [
    session("a", "2027-01-16"),
    session("b", "2027-01-24"),
    session("c", "2027-02-06"),
    session("d", "2027-02-07", false),
    session("e", "2027-03-20", true, "race"),
    session("f", "2026-10-03"),
  ] as Parameters<typeof raceKeySessions>[0]["sessions"];

  it("keeps the season's key sessions before the race with their state", () => {
    const result = raceKeySessions({
      sessions,
      statuses: new Map([
        ["a", "completed"],
        ["b", "partial"],
      ]),
      weekStarts: ["2027-01-11", "2027-01-18", "2027-02-01", "2027-03-15"],
      raceDate: "2027-03-20",
      today: "2027-02-01",
    });
    expect(result.items.map((item) => [item.sessionKey, item.state])).toEqual([
      ["a", "done"],
      ["b", "partial"],
      ["c", "upcoming"],
    ]);
    expect(result).toMatchObject({ done: 1, total: 3 });
    expect(result.items[0]).toMatchObject({
      date: "16 janv.",
      href: "/plan/sessions/a",
      purpose: "But a",
    });
  });

  it("marks a past key session without a match as missed", () => {
    const result = raceKeySessions({
      sessions,
      statuses: new Map(),
      weekStarts: ["2027-01-11"],
      raceDate: "2027-03-20",
      today: "2027-02-01",
    });
    expect(result.items.map((item) => item.state)).toEqual(["missed"]);
  });
});

describe("preparation races", () => {
  it("lists the races between today and the race", () => {
    const races = [
      { id: "a", name: "EcoTrail", priority: "A" as const, date: "2027-03-20" },
      { id: "c", name: "10K", priority: "C" as const, date: "2026-11-22" },
      {
        id: "b",
        name: "Chevreuse",
        priority: "B" as const,
        date: "2027-01-24",
      },
      { id: "old", name: "Semi", priority: "C" as const, date: "2026-04-12" },
      {
        id: "after",
        name: "Après",
        priority: "B" as const,
        date: "2027-06-13",
      },
      { id: "none", name: "Sans date", priority: "C" as const, date: null },
    ];
    expect(
      preparationRaces(races, races[0], "2026-11-12").map((race) => [
        race.id,
        race.date,
      ]),
    ).toEqual([
      ["c", "22 nov."],
      ["b", "24 janv."],
    ]);
  });
});
