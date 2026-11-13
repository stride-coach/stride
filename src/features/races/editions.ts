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

export type EditionKpi = { key: string; value: string; label: string };

export type EditionChange = {
  key: string;
  label: string;
  value: string;
  detail: string | null;
};

export type EditionSetting = {
  walkGradePercent: number | null;
  carbsPerHourG: number | null;
  runSeconds: number | null;
};

export type EditionDay = { year: string; temperatureC: number; dry: boolean };

export type EditionComparison = {
  reading: string;
  kpis: EditionKpi[];
  startM: number;
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
  const sameCourse =
    Math.abs(current.distanceMeters - previous.distanceMeters) <=
    0.05 * previous.distanceMeters;
  const kpis: EditionKpi[] = [
    {
      key: "time",
      value: formatResultTime(current.seconds),
      label: `${current.year} · ${formatResultTime(previous.seconds)} en ${previous.year}`,
    },
    {
      key: "gap",
      value: formatResultDelta(gap),
      label: sameCourse ? "Sur le même parcours" : "Sur un parcours différent",
    },
    ...figures
      .filter((figure) => figure.key === "pace" || figure.key === "heart")
      .map((figure) => ({
        key: figure.key,
        value: figure.current,
        label: `${figure.label} · ${figure.previous} en ${previous.year}`,
      })),
  ];
  return {
    kpis,
    startM: marks[1],
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

function signed(value: number) {
  const rounded = Math.round(value);
  return rounded === 0 ? "±0" : rounded > 0 ? `+${rounded}` : `−${-rounded}`;
}

function startHeartRate(run: EditionRun, startM: number) {
  const distances = run.series?.distance_m;
  const hearts = run.series?.heart_rate;
  if (!distances || !hearts) return null;
  const values = distances.flatMap((distance, index) => {
    const heart = hearts[index];
    return distance !== null && distance <= startM && heart != null
      ? [heart]
      : [];
  });
  return values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;
}

export function editionChanges({
  current,
  previous,
  startM,
  settings,
}: {
  current: EditionRun;
  previous: EditionRun;
  startM: number;
  settings: { current: EditionSetting; previous: EditionSetting };
}): EditionChange[] {
  const changes: EditionChange[] = [];
  const heartNow = startHeartRate(current, startM);
  const heartBefore = startHeartRate(previous, startM);
  if (heartNow !== null && heartBefore !== null)
    changes.push({
      key: "start",
      label: "Départ",
      value: `${signed(heartNow - heartBefore)} bpm`,
      detail: `sur ${Math.round(startM / 1000)} km`,
    });
  const now = settings.current;
  const before = settings.previous;
  if (now.carbsPerHourG !== null && before.carbsPerHourG !== null)
    changes.push({
      key: "carbs",
      label: "Glucides prévus",
      value: `${signed(now.carbsPerHourG - before.carbsPerHourG)} g/h`,
      detail: `${before.carbsPerHourG} g/h en ${previous.year}`,
    });
  if (now.walkGradePercent !== null && before.walkGradePercent !== null)
    changes.push({
      key: "walk",
      label: "Marche",
      value: `dès ${now.walkGradePercent} %`,
      detail:
        now.walkGradePercent === before.walkGradePercent
          ? `comme en ${previous.year}`
          : `${before.walkGradePercent} % en ${previous.year}`,
    });
  if (now.runSeconds !== null && before.runSeconds)
    changes.push({
      key: "volume",
      label: "Volume",
      value: `${signed(((now.runSeconds - before.runSeconds) / before.runSeconds) * 100)} %`,
      detail: "sur 16 semaines",
    });
  return changes;
}

export function editionConditions(days: EditionDay[]) {
  const rows = days.map((day) => ({
    year: day.year,
    temperature: `${Math.round(day.temperatureC)} °C`,
    sky: day.dry ? "sec" : "pluie",
  }));
  const [before, now] = days;
  const difference =
    before && now
      ? Math.round(now.temperatureC) - Math.round(before.temperatureC)
      : 0;
  return {
    rows,
    reading:
      Math.abs(difference) >= 3
        ? `Il faisait ${Math.abs(difference)} degrés de ${difference < 0 ? "moins" : "plus"} en ${now.year}.`
        : null,
  };
}
