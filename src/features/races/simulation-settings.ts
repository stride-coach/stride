import {
  formatClock,
  formatDuration,
  formatHours,
  formatInteger,
  formatKm,
} from "./format";
import type { RaceTimeline } from "./timeline";
import type { RacePlanModel } from "./workspace";

export type SimulationSetting = "target" | "walkGrade" | "aidStop";

export const settingBounds: Record<
  SimulationSetting,
  { step: number; min: number; max: number }
> = {
  target: { step: 300, min: 600, max: 1_209_000 },
  walkGrade: { step: 1, min: 5, max: 20 },
  aidStop: { step: 60, min: 0, max: 3600 },
};

export function stepSetting(
  setting: SimulationSetting,
  value: number,
  direction: 1 | -1,
) {
  const { step, min, max } = settingBounds[setting];
  const next = Math.round(value / step) * step + direction * step;
  return Math.min(max, Math.max(min, next));
}

export function settingValue(setting: SimulationSetting, value: number) {
  if (setting === "target") return formatHours(value);
  if (setting === "walkGrade") return `${value} %`;
  return formatDuration(value);
}

export type SimulationSummary = {
  finish: { value: string; detail: string | null };
  walk: { value: string; detail: string | null };
  night: { value: string; detail: string | null } | null;
  margin: { value: string; detail: string | null; tight: boolean } | null;
  stops: { count: number; total: string };
};

const longDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
}

function km(meters: number) {
  return meters < 10_000
    ? `${formatKm(meters)} km`
    : `${formatInteger(meters / 1000)} km`;
}

export function simulationSummary({
  planned,
  timeline,
  distanceM,
  raceDate,
  startMinutes,
}: {
  planned: RacePlanModel;
  timeline: RaceTimeline;
  distanceM: number;
  raceDate: string | null;
  startMinutes: number;
}): SimulationSummary {
  const { simulation } = planned;
  const finishMinutes = startMinutes + simulation.finishSeconds / 60;
  const dayOffset = Math.floor(finishMinutes / 1440);
  const walkM = timeline.segments.reduce(
    (sum, segment) => sum + segment.walkM,
    0,
  );
  const nightM = planned.nightKm.reduce(
    (sum, range) => sum + Math.max(0, range.toM - range.fromM),
    0,
  );
  const firstNight = planned.nightKm.find((range) => range.toM > range.fromM);
  const tightest = timeline.stations
    .filter((station) => station.marginSeconds !== null)
    .sort((a, b) => a.marginSeconds! - b.marginSeconds!)[0];
  const stopSeconds = simulation.stops.reduce(
    (sum, stop) => sum + stop.seconds,
    0,
  );
  return {
    finish: {
      value: formatClock(timeline.totals.finishClockMinutes),
      detail:
        raceDate && dayOffset > 0
          ? longDay.format(addDays(raceDate, dayOffset))
          : null,
    },
    walk: {
      value: km(walkM),
      detail:
        distanceM > 0
          ? `${formatInteger((walkM / distanceM) * 100)} % du parcours`
          : null,
    },
    night:
      nightM >= 100 && firstNight
        ? {
            value: km(nightM),
            detail:
              firstNight.fromM <= 0
                ? "dès le départ"
                : `dès le km ${formatInteger(firstNight.fromM / 1000)}`,
          }
        : null,
    margin: tightest
      ? {
          value: formatDuration(Math.max(0, tightest.marginSeconds!)),
          detail:
            tightest.kind === "finish"
              ? "barrière à l’arrivée"
              : `barrière de ${tightest.name}`,
          tight: tightest.marginSeconds! < 30 * 60,
        }
      : null,
    stops: {
      count: simulation.stops.length,
      total: formatDuration(stopSeconds),
    },
  };
}
