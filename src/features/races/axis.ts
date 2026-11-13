import { indexAt, positionAt } from "./course";
import {
  formatClock,
  formatDuration,
  formatInteger,
  formatKm,
  formatPace,
} from "./format";
import type { WalkPortion } from "./grade";
import { isNightAt, type NightPlan } from "./night";
import { elapsedAt } from "./simulation";
import type {
  PlanProfileData,
  RaceTimeline,
  TimelineSegment,
  TimelineStation,
} from "./timeline";
import { wet, type RaceWeather, type WeatherSlot } from "./weather";
import type { CourseModel, RacePlanModel } from "./workspace";

export type AxisFact = { value: string; detail: string | null };

export type AxisReading = {
  distanceM: number;
  clock: string;
  section: number;
  position: { lat: number; lon: number };
  terrain: AxisFact;
  instruction: AxisFact;
  weather: AxisFact | null;
  intake: AxisFact | null;
  light: AxisFact | null;
};

export type RoadbookRow = {
  index: number;
  fromM: number;
  toM: number;
  section: string;
  distance: string;
  gain: string | null;
  pace: string | null;
  walk: string;
  weather: string | null;
  intake: string | null;
  passage: string;
  cutoff: string | null;
  tight: boolean;
};

export type RoadbookTotals = {
  distance: string;
  gain: string | null;
  walk: string;
  carbs: string | null;
  finish: string;
};

export type AxisBand = { fromM: number; toM: number; label: string };

export type AxisLanes = {
  distanceM: number;
  elevation: [distanceM: number, ele: number][];
  elevationTicks: { ele: number; label: string }[];
  walk: { fromM: number; toM: number }[];
  night: AxisBand[];
  rain: AxisBand[];
  stations: {
    id: string;
    distanceM: number;
    name: string;
    clock: string;
    cutoff: string | null;
  }[];
  pace: {
    fromM: number;
    toM: number;
    secondsPerKm: number | null;
    label: string | null;
  }[];
  temperature: { distanceM: number; temperature: number; label: string }[];
  fueling: {
    fromM: number;
    toM: number;
    carbsG: number;
    perHour: number | null;
    label: string | null;
  }[];
  ticks: { distanceM: number; label: string }[];
  weatherNormals: boolean;
};

export const axisStepM = 500;
const tightMarginSeconds = 30 * 60;
const lightHorizonSeconds = 3 * 3600;
const slopePercent = 3;

function km(meters: number) {
  return meters < 10_000
    ? `${formatKm(meters)} km`
    : `${formatInteger(meters / 1000)} km`;
}

function segmentAt(segments: TimelineSegment[], distanceM: number) {
  return (
    segments.find(
      (segment) => distanceM >= segment.fromM && distanceM < segment.toM,
    ) ??
    segments.at(-1) ??
    null
  );
}

function portionAt(portions: WalkPortion[], distanceM: number) {
  return (
    portions.find(
      (portion) => distanceM >= portion.fromM && distanceM <= portion.toM,
    ) ?? null
  );
}

function terrainAt(
  model: CourseModel,
  portion: WalkPortion | null,
  distanceM: number,
): AxisFact {
  if (portion) {
    const from = indexAt(model.course, portion.fromM);
    const to = indexAt(model.course, portion.toM);
    const steepest = Math.max(...model.grades.slice(from, to + 1));
    return {
      value: `Côte à ${Math.round(steepest)} %`,
      detail: km(portion.toM - portion.fromM),
    };
  }
  const grade = model.grades[indexAt(model.course, distanceM)] ?? 0;
  if (grade >= slopePercent)
    return { value: `Montée à ${Math.round(grade)} %`, detail: null };
  if (grade <= -slopePercent)
    return { value: `Descente à ${Math.round(-grade)} %`, detail: null };
  return { value: "Plat", detail: null };
}

function nearestSlot(slots: WeatherSlot[], distanceM: number) {
  return slots.reduce<WeatherSlot | null>(
    (best, slot) =>
      !best ||
      Math.abs(slot.distanceM - distanceM) <
        Math.abs(best.distanceM - distanceM)
        ? slot
        : best,
    null,
  );
}

function rainy(slot: WeatherSlot) {
  return wet(slot.code) || slot.precipitationProbability >= 50;
}

function weatherAt(
  weather: RaceWeather | null,
  distanceM: number,
): AxisFact | null {
  const slot = weather ? nearestSlot(weather.slots, distanceM) : null;
  if (!weather || !slot) return null;
  return {
    value: `${Math.round(slot.temperature)} °C, ${rainy(slot) ? "pluie" : "sec"}`,
    detail:
      weather.mode === "normals"
        ? "moyenne de saison"
        : slot.windKmh !== null
          ? `vent ${Math.round(slot.windKmh)} km/h`
          : null,
  };
}

function lightAt(
  night: NightPlan | null,
  elapsedSeconds: number,
): AxisFact | null {
  if (!night) return null;
  const dark = isNightAt(night, elapsedSeconds);
  const change = dark
    ? night.windows.find(
        (window) =>
          elapsedSeconds >= window.fromSeconds &&
          elapsedSeconds < window.toSeconds,
      )?.toSeconds
    : night.windows.find((window) => window.fromSeconds > elapsedSeconds)
        ?.fromSeconds;
  const wait = change === undefined ? null : change - elapsedSeconds;
  return {
    value: dark ? "Nuit" : "Jour",
    detail:
      wait !== null && wait > 0 && wait <= lightHorizonSeconds
        ? `${dark ? "jour" : "nuit"} dans ${formatDuration(wait)}`
        : null,
  };
}

export function axisReadings({
  model,
  planned,
  timeline,
  weather,
  walkPaceSecondsPerKm,
  stepM = axisStepM,
}: {
  model: CourseModel;
  planned: RacePlanModel;
  timeline: RaceTimeline;
  weather: RaceWeather | null;
  walkPaceSecondsPerKm: number;
  stepM?: number;
}): AxisReading[] {
  const { course } = model;
  const start = planned.simulation.passages[0]?.clockMinutes ?? 0;
  const distances = Array.from(
    { length: Math.floor(course.distanceM / stepM) + 1 },
    (_, index) => index * stepM,
  );
  if (distances.at(-1) !== course.distanceM) distances.push(course.distanceM);
  return distances.map((distanceM) => {
    const elapsed = elapsedAt(course, planned.simulation, distanceM);
    const segment = segmentAt(timeline.segments, distanceM);
    const portion = portionAt(model.portions, distanceM);
    return {
      distanceM,
      clock: formatClock(start + elapsed / 60),
      section: segment?.index ?? 0,
      position: (({ lat, lon }) => ({ lat, lon }))(
        positionAt(course, distanceM),
      ),
      terrain: terrainAt(model, portion, distanceM),
      instruction: portion
        ? { value: "Marche", detail: `${formatPace(walkPaceSecondsPerKm)} /km` }
        : {
            value: "Course",
            detail: segment?.runPaceSecondsPerKm
              ? `${formatPace(segment.runPaceSecondsPerKm)} /km`
              : null,
          },
      weather: weatherAt(weather, distanceM),
      intake: segment?.items
        ? {
            value: segment.items,
            detail: segment.carbsG
              ? `${formatInteger(segment.carbsG)} g sur la section`
              : null,
          }
        : null,
      light: lightAt(planned.night, elapsed),
    };
  });
}

function segmentWeather(weather: RaceWeather | null, segment: TimelineSegment) {
  const inside = weather
    ? weather.slots.filter(
        (slot) =>
          slot.distanceM >= segment.fromM && slot.distanceM <= segment.toM,
      )
    : [];
  const slots =
    inside.length > 0 || !weather
      ? inside
      : [nearestSlot(weather.slots, (segment.fromM + segment.toM) / 2)].filter(
          (slot): slot is WeatherSlot => slot !== null,
        );
  const parts: string[] = [];
  if (slots.length > 0) {
    const temperatures = slots.map((slot) => Math.round(slot.temperature));
    const low = Math.min(...temperatures);
    const high = Math.max(...temperatures);
    const first = Math.round(slots[0].temperature);
    const last = Math.round(slots.at(-1)!.temperature);
    parts.push(
      low === high
        ? `${low} °C`
        : `${first < last ? low : high}–${first < last ? high : low} °C`,
    );
    if (slots.some(rainy)) parts.push("pluie");
  }
  if (segment.night) parts.push("nuit");
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function roadbookRows(
  timeline: RaceTimeline,
  weather: RaceWeather | null,
): RoadbookRow[] {
  return timeline.segments.map((segment, position) => {
    const arrival = timeline.stations[position + 1] ?? null;
    return {
      index: segment.index,
      fromM: segment.fromM,
      toM: segment.toM,
      section: `${segment.fromName} → ${segment.toName}`,
      distance: km(segment.toM - segment.fromM),
      gain:
        segment.gainM === null ? null : `+${formatInteger(segment.gainM)} m`,
      pace:
        segment.runPaceSecondsPerKm === null
          ? null
          : formatPace(segment.runPaceSecondsPerKm),
      walk: `${formatKm(segment.walkM)} km`,
      weather: segmentWeather(weather, segment),
      intake: segment.items,
      passage: arrival ? formatClock(arrival.clockMinutes) : "—",
      cutoff:
        arrival?.cutoffMinutes !== null && arrival?.cutoffMinutes !== undefined
          ? `BH ${formatClock(arrival.cutoffMinutes)}`
          : null,
      tight:
        arrival?.marginSeconds !== null &&
        arrival?.marginSeconds !== undefined &&
        arrival.marginSeconds < tightMarginSeconds,
    };
  });
}

export function roadbookTotals(
  timeline: RaceTimeline,
  distanceM: number,
): RoadbookTotals {
  const gains = timeline.segments.map((segment) => segment.gainM);
  const carbs = timeline.segments.reduce(
    (sum, segment) => sum + segment.carbsG,
    0,
  );
  return {
    distance: km(distanceM),
    gain: gains.some((gain) => gain === null)
      ? null
      : `+${formatInteger(gains.reduce<number>((sum, gain) => sum + (gain ?? 0), 0))} m`,
    walk: `${formatKm(
      timeline.segments.reduce((sum, segment) => sum + segment.walkM, 0),
    )} km`,
    carbs: carbs > 0 ? `${formatInteger(carbs)} g de glucides` : null,
    finish: formatClock(timeline.totals.finishClockMinutes),
  };
}

export function clockAtDistance(
  stations: Pick<
    TimelineStation,
    "distanceM" | "clockMinutes" | "stopSeconds"
  >[],
  distanceM: number,
) {
  const first = stations[0];
  if (!first) return 0;
  for (let index = 1; index < stations.length; index += 1) {
    const from = stations[index - 1]!;
    const to = stations[index]!;
    if (distanceM > to.distanceM) continue;
    const leave = from.clockMinutes + from.stopSeconds / 60;
    const span = to.distanceM - from.distanceM;
    const ratio = span > 0 ? (distanceM - from.distanceM) / span : 0;
    return leave + Math.max(0, ratio) * (to.clockMinutes - leave);
  }
  return stations.at(-1)!.clockMinutes;
}

function hourLabel(minutes: number, round: (value: number) => number) {
  return `${((round(minutes / 60) % 24) + 24) % 24}h`;
}

export function rainLabel(fromMinutes: number, toMinutes: number) {
  const from = hourLabel(fromMinutes, Math.floor);
  const to = hourLabel(toMinutes, Math.ceil);
  return from === to ? `Averses vers ${from}` : `Averses ${from}–${to}`;
}

export function nightLabel(fromMinutes: number) {
  return `Nuit dès ${formatClock(fromMinutes)}`;
}

const tickSteps = [1, 2, 5, 10, 20, 25, 50, 100];

export function axisTicksBetween(fromM: number, toM: number, maxTicks = 7) {
  const kilometres = (toM - fromM) / 1000;
  const step =
    tickSteps.find((candidate) => kilometres / candidate <= maxTicks) ??
    tickSteps.at(-1)!;
  const ticks: { distanceM: number; label: string }[] = [];
  for (
    let value = Math.ceil(fromM / 1000 / step) * step;
    value * 1000 <= toM;
    value += step
  )
    ticks.push({ distanceM: value * 1000, label: `${value} km` });
  return ticks;
}

export function axisTicks(distanceM: number, maxTicks = 7) {
  return axisTicksBetween(0, distanceM, maxTicks);
}

export function elevationTicks(elevations: number[]) {
  if (elevations.length === 0) return [];
  const low = Math.min(...elevations);
  const high = Math.max(...elevations);
  const span = high - low;
  const step =
    [10, 20, 50, 100, 200, 250, 500, 1000].find(
      (candidate) => span / candidate <= 3,
    ) ?? 1000;
  const ticks: { ele: number; label: string }[] = [];
  for (let ele = Math.ceil(low / step) * step; ele <= high; ele += step)
    ticks.push({ ele, label: `${formatInteger(ele)} m` });
  return ticks;
}

function carbsPerHour(
  timeline: RaceTimeline,
  position: number,
  carbsG: number,
) {
  const from = timeline.stations[position];
  const to = timeline.stations[position + 1];
  if (!from || !to || carbsG <= 0) return null;
  const seconds = to.elapsedSeconds - (from.elapsedSeconds + from.stopSeconds);
  return seconds > 0 ? Math.round((carbsG / seconds) * 3600) : null;
}

export function axisLanes({
  profile,
  model,
  timeline,
  weather,
}: {
  profile: PlanProfileData;
  model: CourseModel;
  timeline: RaceTimeline;
  weather: RaceWeather | null;
}): AxisLanes {
  const clockAt = (distanceM: number) =>
    clockAtDistance(timeline.stations, distanceM);
  return {
    distanceM: profile.distanceM,
    elevation: profile.elevation,
    elevationTicks: elevationTicks(profile.elevation.map(([, ele]) => ele)),
    walk: model.portions.map(({ fromM, toM }) => ({ fromM, toM })),
    night: profile.night.map((band) => ({
      ...band,
      label: nightLabel(clockAt(band.fromM)),
    })),
    rain: profile.rain.map((band) => ({
      ...band,
      label: rainLabel(clockAt(band.fromM), clockAt(band.toM)),
    })),
    stations: timeline.stations.map((station) => ({
      id: station.id,
      distanceM: station.distanceM,
      name: station.name,
      clock: formatClock(station.clockMinutes),
      cutoff:
        station.cutoffMinutes === null
          ? null
          : `barrière ${formatClock(station.cutoffMinutes)}`,
    })),
    pace: timeline.segments.map((segment) => ({
      fromM: segment.fromM,
      toM: segment.toM,
      secondsPerKm: segment.runPaceSecondsPerKm,
      label:
        segment.runPaceSecondsPerKm === null
          ? null
          : formatPace(segment.runPaceSecondsPerKm),
    })),
    temperature: (weather?.slots ?? []).map((slot) => ({
      distanceM: slot.distanceM,
      temperature: slot.temperature,
      label: `${Math.round(slot.temperature)}°`,
    })),
    fueling: timeline.segments.map((segment, position) => {
      const perHour = carbsPerHour(timeline, position, segment.carbsG);
      return {
        fromM: segment.fromM,
        toM: segment.toM,
        carbsG: segment.carbsG,
        perHour,
        label: perHour === null ? null : `${formatInteger(perHour)} g/h`,
      };
    }),
    ticks: axisTicks(profile.distanceM),
    weatherNormals: weather?.mode === "normals",
  };
}
