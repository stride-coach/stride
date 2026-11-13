import { describe, expect, it } from "vitest";
import {
  lessonInputSchema,
  lessonSource,
  lessonSuggestions,
  type RaceLesson,
} from "@/features/races/lessons";
import type { PassageCheck } from "@/features/races/after-race";
import type { RaceSummary } from "@/features/races/race";

function passage(name: string, deltaSeconds: number): PassageCheck {
  return {
    id: name,
    name,
    distance: "0",
    planned: "",
    actual: "",
    delta: "",
    deltaSeconds,
  };
}

function race(id: string, name: string, date: string | null): RaceSummary {
  return {
    id,
    name,
    date,
    kind: "trail",
    distanceKm: 30,
  } as RaceSummary;
}

function lesson(body: string, kind: RaceLesson["kind"] = "keep"): RaceLesson {
  return { id: body, kind, body, position: 0 };
}

describe("lesson suggestions", () => {
  const passages = [
    passage("Buc", -180),
    passage("Chaville", -60),
    passage("Meudon", 900),
    passage("Arrivée", 720),
  ];

  it("keeps the section won on the plan and changes the one lost", () => {
    expect(
      lessonSuggestions({
        passages,
        resultSeconds: 21_000,
        targetSeconds: 20_400,
        saved: [],
      }),
    ).toEqual([
      { kind: "keep", body: "Départ → Buc : −3 min sur le plan." },
      { kind: "change", body: "Chaville → Meudon : +16 min sur le plan." },
    ]);
  });

  it("keeps the target when it was held", () => {
    expect(
      lessonSuggestions({
        passages: [passage("Arrivée", -300)],
        resultSeconds: 20_100,
        targetSeconds: 20_400,
        saved: [],
      }),
    ).toEqual([
      { kind: "keep", body: "Départ → Arrivée : −5 min sur le plan." },
      { kind: "keep", body: "L’objectif de 5h40, tenu en 5h35." },
    ]);
  });

  it("leaves out what is already kept", () => {
    expect(
      lessonSuggestions({
        passages,
        resultSeconds: 21_000,
        targetSeconds: 20_400,
        saved: [lesson("Départ → Buc : −3 min sur le plan.")],
      }).map((item) => item.kind),
    ).toEqual(["change"]);
  });
});

describe("lesson input", () => {
  it("trims the text and refuses an empty one", () => {
    const raceId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    expect(
      lessonInputSchema.parse({ raceId, kind: "change", body: "  Nuit  " }),
    ).toEqual({ raceId, kind: "change", body: "Nuit" });
    expect(
      lessonInputSchema.safeParse({ raceId, kind: "keep", body: " " }).success,
    ).toBe(false);
  });
});

describe("lesson source", () => {
  const next = race("next", "EcoTrail Paris 2027", "2027-03-20");
  const last = race("last", "EcoTrail Paris 2026", "2026-03-21");
  const other = race("other", "Maxicross", "2026-10-01");
  const today = "2026-11-14";

  it("prefers the previous edition of the same race", () => {
    expect(
      lessonSource({
        races: [next, last, other],
        race: next,
        today,
        lessons: { last: [lesson("a")], other: [lesson("b")] },
      }),
    ).toMatchObject({ race: { id: "last" }, edition: true });
  });

  it("falls back on the latest past race with lessons", () => {
    expect(
      lessonSource({
        races: [next, last, other],
        race: next,
        today,
        lessons: { other: [lesson("b")] },
      }),
    ).toMatchObject({ race: { id: "other" }, edition: false });
    expect(
      lessonSource({ races: [next, last], race: next, today, lessons: {} }),
    ).toBeNull();
  });
});
