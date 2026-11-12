import { z } from "zod";
import type { RoadbookRow, RoadbookTotals } from "./axis";
import { formatClock, formatHours, formatInteger, formatKm } from "./format";
import { formatRaceDate, type RaceSummary } from "./race";
import type { RaceTimeline } from "./timeline";
import type { RacePlanModel } from "./workspace";

export const roadbookFormats = ["a4", "a6", "band"] as const;
export type RoadbookFormat = (typeof roadbookFormats)[number];

export const roadbookFormatLabels: Record<RoadbookFormat, string> = {
  a4: "A4",
  a6: "A6 plié",
  band: "Bracelet",
};

const flag = z
  .enum(["0", "1"])
  .catch("1")
  .transform((value) => value === "1");

export const roadbookOptionsSchema = z.object({
  format: z.enum(roadbookFormats).catch("a4"),
  intake: flag,
  weather: flag,
  walk: flag,
});

export type RoadbookOptions = z.output<typeof roadbookOptionsSchema>;

export function roadbookQuery(options: RoadbookOptions) {
  return new URLSearchParams({
    format: options.format,
    intake: options.intake ? "1" : "0",
    weather: options.weather ? "1" : "0",
    walk: options.walk ? "1" : "0",
  }).toString();
}

export type BandStop = {
  id: string;
  name: string;
  distance: string;
  passage: string;
  cutoff: string | null;
};

export type PrintedRoadbook = {
  title: string;
  subtitle: string;
  facts: string[];
  rows: RoadbookRow[];
  totals: RoadbookTotals;
  barriers: string | null;
  rain: string | null;
  band: BandStop[];
  estimate: boolean;
};

function km(meters: number) {
  return formatKm(Math.round(meters / 100) * 100);
}

export function printedRoadbook({
  race,
  planned,
  timeline,
  rows,
  totals,
  walkGradePercent,
  rain,
  estimate,
}: {
  race: Pick<RaceSummary, "name" | "date">;
  planned: RacePlanModel;
  timeline: RaceTimeline;
  rows: RoadbookRow[];
  totals: RoadbookTotals;
  walkGradePercent: number;
  rain: { fromM: number; toM: number }[];
  estimate: boolean;
}): PrintedRoadbook {
  const start = timeline.stations[0];
  const mark = (value: string) => (estimate ? `≈ ${value}` : value);
  const subtitle = [
    race.date ? formatRaceDate(race.date) : null,
    start ? `départ ${formatClock(start.clockMinutes)}` : null,
    `objectif ${formatHours(planned.scenario.seconds)}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const clockAt = (seconds: number) =>
    formatClock((start?.clockMinutes ?? 0) + seconds / 60);
  const nights = (planned.night?.windows ?? []).map((window, index) =>
    window.fromSeconds <= 0
      ? `Nuit jusqu’à ${clockAt(window.toSeconds)}`
      : `Nuit dès ${clockAt(window.fromSeconds)}, km ${formatInteger((planned.nightKm[index]?.fromM ?? 0) / 1000)}`,
  );
  const walked = timeline.segments.reduce(
    (sum, segment) => sum + segment.walkM,
    0,
  );
  const facts = [
    walked > 0 ? `Marche dès ${walkGradePercent} %` : null,
    ...nights,
    `Arrivée ${mark(totals.finish)}`,
  ].filter((fact): fact is string => fact !== null);
  const cutoffs = timeline.stations.filter(
    (station) => station.cutoffMinutes !== null,
  );
  return {
    title: race.name,
    subtitle,
    facts,
    rows: rows.map((row) => ({ ...row, passage: mark(row.passage) })),
    totals: { ...totals, finish: mark(totals.finish) },
    barriers: cutoffs.length
      ? cutoffs
          .map(
            (station) =>
              `${station.name} ${formatClock(station.cutoffMinutes ?? 0)}`,
          )
          .join(" · ")
      : null,
    rain: rain.length
      ? rain
          .map((range) => `km ${km(range.fromM)} à ${km(range.toM)}`)
          .join(", ")
      : null,
    band: timeline.stations.slice(1).map((station) => ({
      id: station.id,
      name: station.name,
      distance: km(station.distanceM),
      passage: mark(formatClock(station.clockMinutes)),
      cutoff:
        station.cutoffMinutes === null
          ? null
          : formatClock(station.cutoffMinutes),
    })),
    estimate,
  };
}
