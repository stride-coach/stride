import { describe, expect, it } from "vitest";
import type { ProgramOverview } from "@/features/plans/view/program";
import type { RaceSummary } from "@/features/races/race";
import {
  garminPredictions,
  type GarminPrediction,
} from "@/features/progress/garmin-predictions";
import {
  goalCard,
  goalSummary,
  nextKeySession,
  noPlanNote,
  preparationVerdict,
  raceGoalCard,
  ultraNote,
} from "@/features/progress/goal";
import { addDays } from "@/features/progress/period";

const today = "2026-10-14";

function race(values: Partial<RaceSummary> = {}): RaceSummary {
  return {
    id: "eco",
    name: "EcoTrail Paris 120K",
    kind: "trail",
    date: "2027-03-21",
    distanceKm: 120,
    elevationGainM: 1800,
    priority: "A",
    targetSeconds: 68_400,
    revision: 1,
    ...values,
  };
}

function program(currentWeekKey: string | null = "w3"): ProgramOverview {
  const blocks = [
    { blockKey: "lead", name: "Reprise", count: 2 },
    { blockKey: "volume", name: "Volume", count: 4 },
    { blockKey: "taper", name: "Affûtage", count: 2 },
  ];
  let number = 0;
  const built = blocks.map((block) => ({
    blockKey: block.blockKey,
    name: block.name,
    weeks: Array.from({ length: block.count }, (_, index) => {
      number += 1;
      return {
        weekKey: `w${number}`,
        weekStart: addDays("2026-09-28", 7 * (number - 1)),
        number,
        numberInBlock: index + 1,
        blockName: block.name,
      };
    }),
  }));
  return {
    programs: [],
    blocks: built,
    weeks: built.flatMap((block) => block.weeks),
    currentWeekKey,
  } as unknown as ProgramOverview;
}

const predictions: GarminPrediction[] = garminPredictions(
  [
    {
      metric: "race_prediction_10k_seconds",
      observed_on: "2026-10-13",
      value_numeric: 2_702,
    },
    {
      metric: "race_prediction_10k_seconds",
      observed_on: "2026-09-10",
      value_numeric: "2720",
    },
    {
      metric: "race_prediction_marathon_seconds",
      observed_on: "2026-10-13",
      value_numeric: 12_820,
    },
  ],
  today,
);

describe("Garmin predictions", () => {
  it("keeps the latest value and the one at least four weeks older", () => {
    expect(predictions.find((item) => item.key === "10k")).toMatchObject({
      label: "10K",
      seconds: 2_702,
      asOf: "2026-10-13",
      previous: { seconds: 2_720, asOf: "2026-09-10" },
    });
    expect(
      predictions.find((item) => item.key === "marathon")?.previous,
    ).toBeNull();
  });
});

describe("goal card", () => {
  const base = {
    today,
    predictions,
    longestRunMeters: 80_400,
    maxWeeklyGainMeters: 3_240,
    preparation: { done: 4, total: 6 },
    program: program(),
    blockKinds: { lead: "lead_in", volume: "build", taper: "taper" } as const,
  };

  it("follows trail preparation without a predicted time", () => {
    const card = goalCard({ ...base, races: [race()], primaryRaceId: null })!;
    expect(card).toMatchObject({
      name: "EcoTrail Paris 120K",
      date: "21 mars",
      countdown: "J-158",
      target: "19:00",
      road: null,
      preparation: {
        longest: "80",
        distance: "120",
        weeklyGain: "3\u202f240",
        preparation: { done: 4, total: 6 },
      },
      note: ultraNote,
    });
    expect(goalSummary(card)).toBe(
      "Plus longue sortie : 80 km sur 120. Objectif 19:00, préparation 4 sur 6.",
    );
  });

  it("reads the plan phase from the active plan weeks", () => {
    const card = goalCard({ ...base, races: [race()], primaryRaceId: null })!;
    expect(card.phase).toEqual({
      label: "Volume · semaine 3 sur 8",
      taper: "Affûtage le 9 novembre",
      segments: [
        { key: "lead", name: "Reprise", weeks: 2, state: "past", progress: 1 },
        {
          key: "volume",
          name: "Volume",
          weeks: 4,
          state: "current",
          progress: 0.25,
        },
        {
          key: "taper",
          name: "Affûtage",
          weeks: 2,
          state: "future",
          progress: 0,
        },
      ],
    });
  });

  it("compares a road goal with the Garmin prediction", () => {
    const road = race({
      id: "paris",
      name: "10 km de Paris",
      kind: "road",
      distanceKm: 10,
      targetSeconds: 2_700,
    });
    const card = goalCard({
      ...base,
      races: [road],
      primaryRaceId: null,
      program: null,
    })!;
    expect(card.road).toEqual({
      prediction: "45:02",
      verdict: "+0:02 sur ton objectif",
      tone: "warning",
    });
    expect(card.phase).toBeNull();
    expect(card.note).toBeNull();
    expect(
      goalCard({
        ...base,
        races: [{ ...road, targetSeconds: 2_760 }],
        primaryRaceId: null,
      })!.road?.verdict,
    ).toBe("Dans les temps");
  });

  it("prefers the plan goal and ignores C races and past races", () => {
    const races = [
      race({ id: "past", date: "2026-09-01" }),
      race({ id: "c", priority: "C", date: "2026-11-01" }),
      race({ id: "b", priority: "B", date: "2027-01-10" }),
    ];
    expect(goalCard({ ...base, races, primaryRaceId: null })?.id).toBe("b");
    expect(goalCard({ ...base, races, primaryRaceId: "c" })?.id).toBe("c");
    expect(
      goalCard({ ...base, races: races.slice(0, 2), primaryRaceId: null }),
    ).toBeNull();
  });

  it("tells a plan not started or finished apart from no plan", () => {
    const card = (value: ProgramOverview | null, day = today) =>
      goalCard({
        ...base,
        today: day,
        races: [race()],
        primaryRaceId: null,
        program: value,
      })!;
    expect(card(program()).planNote).toBeNull();
    expect(card(null).planNote).toBe(noPlanNote);
    expect(card(program(null), "2026-09-20").planNote).toBe(
      "Ton plan commence le 28 septembre.",
    );
    expect(card(program(null), "2026-12-01")).toMatchObject({
      phase: null,
      planNote: "Ton plan est terminé.",
    });
  });
});

describe("race goal card", () => {
  const inputs = {
    today,
    predictions,
    longestRunMeters: 80_400,
    longestRunDay: "2026-09-27",
    maxWeeklyGainMeters: 3_240,
    preparation: { done: 3, total: 6 },
    program: program(),
    blockKinds: { lead: "lead_in", volume: "build", taper: "taper" } as const,
  };

  it("matches the goal card picked for Progression", () => {
    const goal = race();
    expect(raceGoalCard({ ...goal, date: goal.date! }, inputs)).toEqual(
      goalCard({ ...inputs, races: [goal], primaryRaceId: null }),
    );
  });

  it("reads a trail race without inventing a finish time", () => {
    const goal = race({ elevationGainM: 1_585 });
    const card = raceGoalCard({ ...goal, date: goal.date! }, inputs);
    expect(card).toMatchObject({
      target: "19:00",
      road: null,
      gap: null,
      phaseShort: "Volume · S3 / 8",
      longestDay: "27 sept.",
      raceGain: "1\u202f585",
      gainCovered: true,
      verdict:
        "Sur la bonne voie. Le D+ de la course est déjà couvert en une semaine ; c’est la distance qu’il reste à construire.",
    });
  });

  it("states the signed gap between a road target and the prediction", () => {
    const road = race({
      kind: "road",
      distanceKm: 10,
      targetSeconds: 2_670,
      date: "2026-11-22",
    });
    const card = raceGoalCard({ ...road, date: road.date! }, inputs);
    expect(card.gap).toEqual({ label: "+0:32", tone: "warning" });
    expect(card.verdict).toBe(
      "+0:32 sur ton objectif. La prévision Garmin (45:02) reste au-dessus de 44:30.",
    );
    const ahead = raceGoalCard(
      { ...road, date: road.date!, targetSeconds: 2_760 },
      inputs,
    );
    expect(ahead.gap).toEqual({ label: "−0:58", tone: "success" });
    expect(ahead.verdict).toMatch(/^Dans les temps\./);
    const half = raceGoalCard(
      { ...road, date: road.date!, distanceKm: 21.1 },
      inputs,
    );
    expect(half.gap).toBeNull();
    expect(half.verdict).toBe(
      "Pas encore de prévision Garmin pour cette distance : ton objectif reste le repère.",
    );
  });

  it("shows no plan phase without an active plan", () => {
    const goal = race();
    const card = raceGoalCard(
      { ...goal, date: goal.date! },
      { ...inputs, program: null },
    );
    expect(card).toMatchObject({
      phase: null,
      phaseShort: null,
      planNote: noPlanNote,
    });
  });
});

describe("preparation verdict", () => {
  const base = {
    longestMeters: 80_000,
    distanceKm: 120,
    weeklyGainMeters: 3_000,
    raceGainM: 1_600,
  };

  it("names what is covered and what remains to build", () => {
    expect(preparationVerdict(base)).toMatch(
      /D\+ de la course est déjà couvert/,
    );
    expect(preparationVerdict({ ...base, longestMeters: 125_000 })).toBe(
      "Sur la bonne voie. La distance et le D+ de la course sont déjà couverts à l’entraînement.",
    );
    expect(
      preparationVerdict({
        ...base,
        longestMeters: 125_000,
        weeklyGainMeters: 900,
      }),
    ).toBe(
      "Sur la bonne voie. La distance est déjà couverte ; c’est le D+ qu’il reste à construire.",
    );
    expect(preparationVerdict({ ...base, weeklyGainMeters: 900 })).toBe(
      "La distance et le D+ de la course restent à construire d’ici le jour J.",
    );
    expect(preparationVerdict({ ...base, raceGainM: null })).toBe(
      "La distance de la course reste à construire d’ici le jour J.",
    );
    expect(
      preparationVerdict({
        ...base,
        longestMeters: null,
        weeklyGainMeters: null,
      }),
    ).toBe("Pas encore assez de sorties récentes pour juger ta préparation.");
  });
});

describe("next key session", () => {
  const session = (
    sessionKey: string,
    scheduledOn: string,
    isKey: boolean,
    kind = "long_run",
  ) => ({
    sessionKey,
    title: sessionKey,
    scheduledOn,
    isKey,
    kind,
    sport: "running",
  });

  it("picks the earliest key session from today on", () => {
    const sessions = [
      session("later", "2026-10-30", true),
      session("past", "2026-10-10", true),
      session("easy", "2026-10-15", false),
      session("next", "2026-10-14", true),
    ] as Parameters<typeof nextKeySession>[0];
    expect(nextKeySession(sessions, today)).toEqual({
      sessionKey: "next",
      title: "next",
      date: "14 oct.",
    });
    expect(nextKeySession(sessions.slice(1, 3), today)).toBeNull();
  });
});
