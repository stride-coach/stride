import { nutritionThresholds as t } from "@/features/nutrition/thresholds";

export type FuelingRange = { min: number; max: number };

export const fuelingDefaults = {
  carbsPerHourG: 60,
  waterMlPerHour: 450,
  sodiumMgPerHour: 500,
} as const;

export type FuelingTargets = {
  carbsPerHourG: number;
  waterMlPerHour: number;
  sodiumMgPerHour: number;
};

export type FuelingRace = {
  id: string;
  name: string;
  kind: "road" | "trail";
  date: string;
  targets: FuelingTargets;
};

export type FuelingBase = {
  source: "race" | "stride";
  race: FuelingRace | null;
  carbsPerHourG: FuelingRange;
  waterMlPerHour: number;
  sodiumMgPerHour: number;
};

export function fuelsDuring(durationSeconds: number) {
  return durationSeconds >= t.fuelingMinimumSeconds;
}

export function nextFuelingRace(
  races: readonly FuelingRace[],
  date: string,
): FuelingRace | null {
  return (
    races
      .filter((race) => race.date >= date)
      .sort((first, second) => first.date.localeCompare(second.date))[0] ?? null
  );
}

export function fuelingBase(
  race: FuelingRace | null,
  ultra: boolean,
): FuelingBase {
  if (race)
    return {
      source: "race",
      race,
      carbsPerHourG: {
        min: race.targets.carbsPerHourG,
        max: race.targets.carbsPerHourG,
      },
      waterMlPerHour: race.targets.waterMlPerHour,
      sodiumMgPerHour: race.targets.sodiumMgPerHour,
    };
  const range = ultra ? t.ultraFuelingGPerHour : t.fuelingGPerHour;
  return {
    source: "stride",
    race: null,
    carbsPerHourG: { min: range.min, max: range.max },
    waterMlPerHour: fuelingDefaults.waterMlPerHour,
    sodiumMgPerHour: fuelingDefaults.sodiumMgPerHour,
  };
}

export function fuelingTotal(
  range: FuelingRange,
  durationSeconds: number,
): FuelingRange {
  const hours = durationSeconds / 3_600;
  return {
    min: Math.round(range.min * hours),
    max: Math.round(range.max * hours),
  };
}

export function raceNutritionHref(race: Pick<FuelingRace, "id" | "kind">) {
  return race.kind === "trail"
    ? `/races/${race.id}/nutrition`
    : `/races/${race.id}`;
}

export type FuelingRehearsalSession = {
  sessionKey: string;
  date: string;
  title: string;
  durationSeconds: number;
};

export type FuelingRehearsal = FuelingRehearsalSession & {
  carbsG: FuelingRange;
};

export const fuelingRehearsalLimit = 3;

export function fuelingRehearsals({
  sessions,
  from,
  race,
}: {
  sessions: readonly FuelingRehearsalSession[];
  from: string;
  race: FuelingRace | null;
}): FuelingRehearsal[] {
  return sessions
    .filter(
      (session) =>
        session.date >= from &&
        (!race || session.date < race.date) &&
        fuelsDuring(session.durationSeconds),
    )
    .sort(
      (first, second) =>
        first.date.localeCompare(second.date) ||
        first.sessionKey.localeCompare(second.sessionKey),
    )
    .slice(0, fuelingRehearsalLimit)
    .map((session) => ({
      ...session,
      carbsG: fuelingTotal(
        fuelingBase(race, session.durationSeconds > t.ultraSeconds)
          .carbsPerHourG,
        session.durationSeconds,
      ),
    }));
}
