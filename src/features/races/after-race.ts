import type { Series } from "@/features/activities/track";
import type { RecoveryNight } from "@/features/progress/recovery";
import { formatDuration, formatInteger, formatKm, formatPace } from "./format";
import type { RaceSummary } from "./race";
import {
  formatResultDelta,
  formatResultTime,
  type RaceResult,
} from "./results";
import type { TimelineStation } from "./timeline";

export type AfterKpi = { key: string; value: string; label: string };

export type PassageCheck = {
  id: string;
  name: string;
  distance: string;
  planned: string;
  actual: string;
  delta: string;
  deltaSeconds: number;
};

export type RecoveryDay = {
  day: string;
  label: string;
  restingHeartRate: { value: string; delta: string | null } | null;
  hrv: { value: string; delta: string | null } | null;
};

const baselineDays = 28;
const recoveryHorizon = 10;

export function elapsedAtDistance(series: Series, distanceM: number) {
  const distances = series.distance_m;
  const times = series.elapsed_s;
  if (!distances || !times) return null;
  let previous: { distance: number; time: number } | null = null;
  for (let index = 0; index < distances.length; index += 1) {
    const distance = distances[index];
    const time = times[index];
    if (distance === null || time === null) continue;
    if (distance >= distanceM) {
      if (!previous || distance === previous.distance) return time;
      const share =
        (distanceM - previous.distance) / (distance - previous.distance);
      return previous.time + share * (time - previous.time);
    }
    previous = { distance, time };
  }
  return null;
}

function clock(seconds: number) {
  return formatResultTime(seconds);
}

export function passageChecks({
  stations,
  series,
  finishSeconds,
}: {
  stations: TimelineStation[];
  series: Series | null;
  finishSeconds: number;
}): PassageCheck[] {
  return stations
    .filter((station) => station.kind !== "start")
    .flatMap((station) => {
      const actual =
        station.kind === "finish"
          ? finishSeconds
          : series
            ? elapsedAtDistance(series, station.distanceM)
            : null;
      if (actual === null) return [];
      const deltaSeconds = actual - station.elapsedSeconds;
      return [
        {
          id: station.id,
          name: station.name,
          distance: formatKm(station.distanceM),
          planned: clock(station.elapsedSeconds),
          actual: clock(actual),
          delta: formatResultDelta(deltaSeconds),
          deltaSeconds,
        },
      ];
    });
}

export function afterKpis({
  race,
  result,
  averageHeartRate,
  elevationGainM,
}: {
  race: Pick<RaceSummary, "targetSeconds">;
  result: RaceResult;
  averageHeartRate: number | null;
  elevationGainM: number | null;
}): AfterKpi[] {
  return [
    {
      key: "time",
      value: formatResultTime(result.seconds),
      label: race.targetSeconds
        ? `Temps · objectif ${formatDuration(race.targetSeconds)}`
        : "Temps",
    },
    {
      key: "pace",
      value: `${formatPace(result.seconds / (result.distanceMeters / 1000))} /km`,
      label: "Allure moyenne",
    },
    ...(averageHeartRate
      ? [
          {
            key: "heart",
            value: `${formatInteger(averageHeartRate)} bpm`,
            label: "FC moyenne",
          },
        ]
      : []),
    ...(elevationGainM
      ? [
          {
            key: "gain",
            value: `+${formatInteger(elevationGainM)} m`,
            label: "Dénivelé",
          },
        ]
      : []),
    {
      key: "distance",
      value: `${formatKm(result.distanceMeters)} km`,
      label: "Distance",
    },
  ];
}

export function afterReading({
  result,
  passages,
}: {
  result: RaceResult;
  passages: PassageCheck[];
}) {
  const verdict =
    result.deltaSeconds === null
      ? `Course terminée en ${formatResultTime(result.seconds)}.`
      : result.deltaSeconds <= 0
        ? `Course terminée en ${formatResultTime(result.seconds)}, ${formatResultDelta(result.deltaSeconds).replace("−", "")} sous ton objectif.`
        : `Course terminée en ${formatResultTime(result.seconds)}, ${formatResultDelta(result.deltaSeconds).replace("+", "")} au-dessus de ton objectif.`;
  if (passages.length < 2) return verdict;
  let worst: { from: string; to: string; seconds: number } | null = null;
  let previous = { name: "le départ", deltaSeconds: 0 };
  for (const passage of passages) {
    const lost = passage.deltaSeconds - previous.deltaSeconds;
    if (!worst || lost > worst.seconds)
      worst = { from: previous.name, to: passage.name, seconds: lost };
    previous = passage;
  }
  return worst && worst.seconds >= 120
    ? `${verdict} L’écart le plus grand avec le plan s’est creusé entre ${worst.from} et ${worst.to} : ${formatResultDelta(worst.seconds)}.`
    : `${verdict} Tu as suivi le plan de près à chaque passage.`;
}

function addDays(day: string, days: number) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : (sorted[middle - 1] + sorted[middle]) / 2;
}

function signed(value: number) {
  const rounded = Math.round(value);
  return rounded === 0 ? "±0" : rounded > 0 ? `+${rounded}` : `−${-rounded}`;
}

export function recoveryDays({
  nights,
  raceDate,
  today,
}: {
  nights: RecoveryNight[];
  raceDate: string;
  today: string;
}): { days: RecoveryDay[]; baseline: string | null } {
  const before = nights.filter(
    (night) =>
      night.day < raceDate && night.day >= addDays(raceDate, -baselineDays),
  );
  const restBase = median(
    before.flatMap((night) =>
      night.restingHeartRate === null ? [] : [night.restingHeartRate],
    ),
  );
  const hrvBase = median(
    before.flatMap((night) => (night.hrv === null ? [] : [night.hrv])),
  );
  const days = nights
    .filter(
      (night) =>
        night.day > raceDate &&
        night.day <= addDays(raceDate, recoveryHorizon) &&
        night.day <= today &&
        (night.restingHeartRate !== null || night.hrv !== null),
    )
    .map((night): RecoveryDay => {
      const offset = Math.round(
        (Date.parse(`${night.day}T00:00:00Z`) -
          Date.parse(`${raceDate}T00:00:00Z`)) /
          86_400_000,
      );
      return {
        day: night.day,
        label: `J+${offset}`,
        restingHeartRate:
          night.restingHeartRate === null
            ? null
            : {
                value: `${formatInteger(night.restingHeartRate)} bpm`,
                delta:
                  restBase === null
                    ? null
                    : signed(night.restingHeartRate - restBase),
              },
        hrv:
          night.hrv === null
            ? null
            : {
                value: `${formatInteger(night.hrv)} ms`,
                delta: hrvBase === null ? null : signed(night.hrv - hrvBase),
              },
      };
    });
  const parts = [
    restBase === null ? null : `FC repos ${formatInteger(restBase)} bpm`,
    hrvBase === null ? null : `VFC ${formatInteger(hrvBase)} ms`,
  ].filter(Boolean);
  return {
    days,
    baseline: parts.length
      ? `Ta base des ${baselineDays} jours avant la course : ${parts.join(", ")}.`
      : null,
  };
}
