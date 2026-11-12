import type { Series } from "@/features/activities/track";
import { elapsedAtDistance } from "./after-race";
import { formatKm } from "./format";
import type { RaceSummary } from "./race";
import { formatResultDelta, formatResultTime } from "./results";

const distanceTolerance = 0.15;
const yearPattern = /\b(19|20)\d{2}\b/g;

export function editionKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(yearPattern, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function raceEditions(
  races: RaceSummary[],
  race: RaceSummary,
  today: string,
) {
  const key = editionKey(race.name);
  return races
    .filter(
      (item): item is RaceSummary & { date: string } =>
        item.id !== race.id &&
        item.date !== null &&
        item.date < today &&
        item.kind === race.kind &&
        editionKey(item.name) === key &&
        (race.distanceKm === null ||
          item.distanceKm === null ||
          Math.abs(item.distanceKm - race.distanceKm) <=
            race.distanceKm * distanceTolerance),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
}

export type EditionRun = {
  year: string;
  seconds: number;
  distanceMeters: number;
  averageHeartRate: number | null;
  series: Series | null;
};

export type EditionSection = {
  label: string;
  previous: string | null;
  current: string | null;
  delta: string | null;
  deltaSeconds: number | null;
};

export type EditionComparison = {
  reading: string;
  figures: {
    key: string;
    label: string;
    current: string;
    previous: string;
    delta: string | null;
  }[];
  sections: EditionSection[];
};

function boundaries(distanceM: number, stations: number[]) {
  const inside = stations
    .filter((meters) => meters > 0 && meters < distanceM)
    .sort((a, b) => a - b);
  if (inside.length > 0) return [0, ...inside, distanceM];
  return Array.from({ length: 6 }, (_, index) => (distanceM * index) / 5);
}

function sectionTime(
  run: EditionRun,
  fromM: number,
  toM: number,
  last: boolean,
) {
  if (!run.series) return null;
  const from = fromM === 0 ? 0 : elapsedAtDistance(run.series, fromM);
  const to = last ? run.seconds : elapsedAtDistance(run.series, toM);
  return from === null || to === null ? null : to - from;
}

function km(meters: number) {
  return Math.round(meters / 1000);
}

export function compareEditions({
  current,
  previous,
  stations = [],
}: {
  current: EditionRun;
  previous: EditionRun;
  stations?: { name: string; distanceM: number }[];
}): EditionComparison {
  const distanceM = Math.min(current.distanceMeters, previous.distanceMeters);
  const marks = boundaries(
    distanceM,
    stations.map((station) => station.distanceM),
  );
  const names = new Map(
    stations.map((station) => [station.distanceM, station.name]),
  );
  const label = (meters: number, index: number) =>
    index === 0
      ? "Départ"
      : index === marks.length - 1
        ? "Arrivée"
        : (names.get(meters) ?? `km ${km(meters)}`);
  const sections = marks.slice(1).map((toM, index): EditionSection => {
    const fromM = marks[index];
    const last = index === marks.length - 2;
    const before = sectionTime(previous, fromM, toM, last);
    const after = sectionTime(current, fromM, toM, last);
    const deltaSeconds =
      before === null || after === null ? null : after - before;
    return {
      label: `${label(fromM, index)} → ${label(toM, index + 1)}`,
      previous: before === null ? null : formatResultTime(before),
      current: after === null ? null : formatResultTime(after),
      delta: deltaSeconds === null ? null : formatResultDelta(deltaSeconds),
      deltaSeconds,
    };
  });
  const gap = current.seconds - previous.seconds;
  const measured = sections.filter((section) => section.deltaSeconds !== null);
  const biggest = [...measured].sort(
    (a, b) => Math.abs(b.deltaSeconds!) - Math.abs(a.deltaSeconds!),
  )[0];
  const pace = (run: EditionRun) => run.seconds / (run.distanceMeters / 1000);
  const paceText = (seconds: number) => {
    const total = Math.round(seconds);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")} /km`;
  };
  const figures = [
    {
      key: "time",
      label: "Temps",
      current: formatResultTime(current.seconds),
      previous: formatResultTime(previous.seconds),
      delta: formatResultDelta(gap),
    },
    {
      key: "pace",
      label: "Allure moyenne",
      current: paceText(pace(current)),
      previous: paceText(pace(previous)),
      delta: formatResultDelta(pace(current) - pace(previous)),
    },
    ...(current.averageHeartRate !== null && previous.averageHeartRate !== null
      ? [
          {
            key: "heart",
            label: "FC moyenne",
            current: `${Math.round(current.averageHeartRate)} bpm`,
            previous: `${Math.round(previous.averageHeartRate)} bpm`,
            delta: `${current.averageHeartRate >= previous.averageHeartRate ? "+" : "−"}${Math.abs(Math.round(current.averageHeartRate - previous.averageHeartRate))} bpm`,
          },
        ]
      : []),
    {
      key: "distance",
      label: "Distance",
      current: `${formatKm(current.distanceMeters)} km`,
      previous: `${formatKm(previous.distanceMeters)} km`,
      delta: null,
    },
  ];
  const verdict =
    gap === 0
      ? `Même temps qu’en ${previous.year}.`
      : `${formatResultDelta(Math.abs(gap)).replace("+", "")} ${gap < 0 ? "gagnées" : "perdues"} depuis ${previous.year}.`;
  return {
    reading:
      biggest && Math.abs(biggest.deltaSeconds!) >= 60
        ? `${verdict} Le plus grand écart se joue entre ${biggest.label.replace(" → ", " et ")} : ${biggest.delta}.`
        : verdict,
    figures,
    sections,
  };
}

export function nextEditionDate(date: string, today: string) {
  let next = new Date(`${date}T00:00:00Z`);
  do next = new Date(next.getTime() + 364 * 86_400_000);
  while (next.toISOString().slice(0, 10) < today);
  return next.toISOString().slice(0, 10);
}
