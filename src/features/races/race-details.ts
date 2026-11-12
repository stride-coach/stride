import { z } from "zod";
import {
  raceExpectations,
  racePoles,
  type RaceExpectation,
  type RaceKind,
  type RacePoles,
} from "@/features/onboarding/goals";
import { kmEffort } from "./calendar";
import { formatHours } from "./format";

export type RaceDetails = {
  location: string | null;
  poles: RacePoles | null;
  expectation: RaceExpectation | null;
  testItems: string[];
};

export const emptyRaceDetails: RaceDetails = {
  location: null,
  poles: null,
  expectation: null,
  testItems: [],
};

export const raceDetailColumns = "location, poles, expectation, test_items";

const detailsRowSchema = z.object({
  location: z.string().nullable().optional(),
  poles: z.enum(racePoles).nullable().optional().catch(null),
  expectation: z.enum(raceExpectations).nullable().optional().catch(null),
  test_items: z.array(z.string()).nullable().optional().catch(null),
});

export function raceDetailsOf(row: unknown): RaceDetails {
  const parsed = detailsRowSchema.safeParse(row);
  if (!parsed.success) return emptyRaceDetails;
  return {
    location: parsed.data.location ?? null,
    poles: parsed.data.poles ?? null,
    expectation: parsed.data.expectation ?? null,
    testItems: parsed.data.test_items ?? [],
  };
}

export const poleLabels: Record<RacePoles, string> = {
  allowed: "Autorisés",
  forbidden: "Interdits",
  unknown: "Je ne sais pas",
};

export const expectationLabels: Record<RaceExpectation, string> = {
  performance: "Performance",
  rehearsal: "Répétition générale",
  fun: "Plaisir",
};

export function testSuggestions(kind: RaceKind) {
  return kind === "trail"
    ? [
        "Alimentation de course",
        "Départ de nuit",
        "Frontale et batterie",
        "Sac de course",
        "Allure objectif",
        "Marche dans les côtes",
        "Bâtons",
        "Chaussures de course",
      ]
    : [
        "Alimentation de course",
        "Allure objectif",
        "Chaussures de course",
        "Échauffement",
        "Tenue de course",
      ];
}

export type ReferenceRace = {
  name: string;
  date: string;
  kind: RaceKind;
  distanceKm: number;
  elevationGainM: number | null;
  seconds: number;
};

const riegel = 1.06;
const spread = 0.05;
const nearest = { min: 0.4, max: 2.5 };
const month = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: "UTC",
});

export function targetEstimate(
  references: ReferenceRace[],
  race: {
    kind: RaceKind;
    distanceKm: number | null;
    elevationGainM: number | null;
  },
) {
  if (!race.distanceKm || race.distanceKm <= 0) return null;
  const effort = kmEffort(race.distanceKm, race.elevationGainM, race.kind);
  const candidates = references
    .map((reference) => {
      const referenceEffort = kmEffort(
        reference.distanceKm,
        reference.elevationGainM,
        reference.kind,
      );
      return { reference, ratio: effort / referenceEffort };
    })
    .filter(
      (item) =>
        Number.isFinite(item.ratio) &&
        item.ratio >= nearest.min &&
        item.ratio <= nearest.max,
    )
    .sort(
      (a, b) =>
        Number(b.reference.kind === race.kind) -
          Number(a.reference.kind === race.kind) ||
        Math.abs(Math.log(a.ratio)) - Math.abs(Math.log(b.ratio)) ||
        b.reference.date.localeCompare(a.reference.date),
    );
  const best = candidates[0];
  if (!best) return null;
  const seconds = best.reference.seconds * best.ratio ** riegel;
  const round = (value: number) => Math.round(value / 300) * 300;
  const label = `${best.reference.name} de ${month.format(new Date(`${best.reference.date}T00:00:00Z`))}`;
  return {
    low: round(seconds * (1 - spread)),
    high: round(seconds * (1 + spread)),
    text: `Stride estime ${formatHours(round(seconds * (1 - spread)))} – ${formatHours(round(seconds * (1 + spread)))} d’après ton ${label}.`,
  };
}
