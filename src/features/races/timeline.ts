import { formatDuration } from "./format";
import type { ProfileData } from "./profile";
import { isNightAt, nightOverlap } from "./night";
import { describeItems } from "./nutrition";
import type { RaceStrategy } from "./proposals";
import { glyphFor, iconFor, type Glyph, type RaceWeather } from "./weather";
import {
  isSegmentBoundary,
  type Waypoint,
  type WaypointKind,
} from "./waypoints";
import type { CourseModel, RacePlanModel } from "./workspace";

export type StationWeather = {
  temperature: number;
  sky: string | null;
  glyph: Glyph;
};

export type TimelineStation = {
  id: string;
  name: string;
  kind: WaypointKind;
  distanceM: number;
  clockMinutes: number;
  elapsedSeconds: number;
  cutoffMinutes: number | null;
  marginSeconds: number | null;
  night: boolean;
  weather: StationWeather | null;
  refill: string | null;
  stopSeconds: number;
};

export type TimelineSegment = {
  index: number;
  id: string;
  fromName: string;
  toName: string;
  fromM: number;
  toM: number;
  gainM: number | null;
  lossM: number | null;
  walkM: number;
  movingSeconds: number;
  runPaceSecondsPerKm: number | null;
  night: boolean;
  carbsG: number;
  items: string | null;
  note: string | null;
};

export type TimelineTotals = {
  finishClockMinutes: number;
  finishCutoffMinutes: number | null;
  finishMarginSeconds: number | null;
  runSeconds: number;
  walkSeconds: number;
  stopSeconds: number;
  nightSeconds: number;
};

export type RaceTimeline = {
  stations: TimelineStation[];
  segments: TimelineSegment[];
  totals: TimelineTotals;
};

export type TimelineFueling = {
  segments: Record<string, { carbsG: number; items: string | null }>;
  stations: Record<string, string | null>;
};

export type PlanProfileStation = {
  distanceM: number;
  tone: "start" | "finish" | "aid" | "water" | "base";
};

export type PlanProfileData = {
  distanceM: number;
  elevation: [distanceM: number, ele: number][];
  night: { fromM: number; toM: number }[];
  rain: { fromM: number; toM: number }[];
  stations: PlanProfileStation[];
  segments: { index: number; fromM: number; toM: number; route: string }[];
  label: string;
};

const profilePoints = 160;

export function planProfile(
  profile: ProfileData,
  timeline: RaceTimeline,
): PlanProfileData {
  const stride = Math.max(
    1,
    Math.ceil(profile.elevation.length / profilePoints),
  );
  const elevation = profile.elevation.filter(
    (_, index) =>
      index % stride === 0 || index === profile.elevation.length - 1,
  );
  const night = profile.night.map(({ fromM, toM }) => ({ fromM, toM }));
  const firstNight = night.find((range) => range.fromM > 0);
  return {
    distanceM: profile.distanceM,
    elevation,
    night,
    rain: profile.rain,
    stations: timeline.stations.map((station) => ({
      distanceM: station.distanceM,
      tone:
        station.kind === "start" ||
        station.kind === "finish" ||
        station.kind === "aid" ||
        station.kind === "water" ||
        station.kind === "base"
          ? station.kind
          : "aid",
    })),
    segments: timeline.segments.map((segment) => ({
      index: segment.index,
      fromM: segment.fromM,
      toM: segment.toM,
      route: `${segment.fromName} → ${segment.toName}`,
    })),
    label: [
      "Profil du parcours avec les tronçons",
      firstNight
        ? `la nuit à partir du km ${Math.round(firstNight.fromM / 1000)}`
        : null,
    ]
      .filter(Boolean)
      .join(", "),
  };
}

const skyLabels: Record<ReturnType<typeof iconFor>, string> = {
  clear: "dégagé",
  partly: "éclaircies",
  cloudy: "couvert",
  fog: "brouillard",
  rain: "pluie",
  showers: "averses",
  snow: "neige",
  storm: "orage",
};

export function stationWeather(
  weather: RaceWeather | null,
  elapsedSeconds: number,
  night: boolean,
): StationWeather | null {
  if (!weather?.slots.length) return null;
  const slot = weather.slots.reduce((best, item) =>
    Math.abs(item.elapsedSeconds - elapsedSeconds) <
    Math.abs(best.elapsedSeconds - elapsedSeconds)
      ? item
      : best,
  );
  const temperature = Math.round(slot.temperature);
  if (weather.mode !== "forecast")
    return {
      temperature,
      sky: night ? "nuit" : null,
      glyph: night ? "moon" : "sun",
    };
  const icon = iconFor(slot.code);
  const wet =
    icon === "rain" ||
    icon === "showers" ||
    icon === "storm" ||
    icon === "snow";
  const sky =
    icon === "clear" && night
      ? "nuit"
      : wet && slot.precipitationProbability > 0
        ? `${skyLabels[icon]} ${Math.round(slot.precipitationProbability)} %`
        : skyLabels[icon];
  return { temperature, sky, glyph: glyphFor(slot.code, night) };
}

function stopOf(
  waypoint: Waypoint,
  stops: { aidStopSeconds: number; waterStopSeconds: number },
) {
  if (waypoint.kind === "water") return stops.waterStopSeconds;
  if (waypoint.kind === "start" || waypoint.kind === "finish") return 0;
  return stops.aidStopSeconds;
}

function sentence(parts: (string | null | undefined | false)[]) {
  const text = parts.filter(Boolean).join(" · ");
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : null;
}

export function genericFueling(
  model: CourseModel,
  planned: RacePlanModel,
): TimelineFueling {
  const segments: TimelineFueling["segments"] = {};
  const stations: TimelineFueling["stations"] = {};
  const { simulation } = planned;
  simulation.segments.forEach((segment, index) => {
    const nutrition = planned.nutrition[index];
    segments[segment.toId] = {
      carbsG: nutrition?.carbsG ?? 0,
      items: nutrition ? describeItems(nutrition.items) || null : null,
    };
  });
  for (const waypoint of model.waypoints) {
    if (!isSegmentBoundary(waypoint.kind) || waypoint.kind === "finish")
      continue;
    const next = simulation.segments.findIndex(
      (segment) => segment.fromId === waypoint.id,
    );
    const items = next >= 0 ? describeItems(planned.nutrition[next].items) : "";
    stations[waypoint.id] =
      waypoint.kind === "start"
        ? items
          ? `${items} en poche`
          : null
        : waypoint.kind === "water"
          ? "remplis les flasques d’eau"
          : items
            ? `reprends ${items}`
            : null;
  }
  return { segments, stations };
}

export function raceTimeline({
  model,
  planned,
  weather,
  strategy,
  fueling,
  stops,
  walkPaceSecondsPerKm,
}: {
  model: CourseModel;
  planned: RacePlanModel;
  weather: RaceWeather | null;
  strategy: RaceStrategy | null;
  fueling: TimelineFueling;
  stops: { aidStopSeconds: number; waterStopSeconds: number };
  walkPaceSecondsPerKm: number;
}): RaceTimeline {
  const { simulation, night } = planned;
  const names = new Map(model.waypoints.map((point) => [point.id, point.name]));
  const passages = new Map(
    simulation.passages.map((passage) => [passage.waypointId, passage]),
  );
  const stations = model.waypoints
    .filter((waypoint) => isSegmentBoundary(waypoint.kind))
    .map((waypoint): TimelineStation => {
      const passage = passages.get(waypoint.id)!;
      const isNight = night ? isNightAt(night, passage.elapsedSeconds) : false;
      const stopSeconds = stopOf(waypoint, stops);
      const raceCutoff =
        waypoint.kind === "finish" &&
        waypoint.cutoffMinutes === null &&
        planned.finishMarginSeconds !== null;
      return {
        id: waypoint.id,
        name: waypoint.name,
        kind: waypoint.kind,
        distanceM: waypoint.distanceM,
        clockMinutes: passage.clockMinutes,
        elapsedSeconds: passage.elapsedSeconds,
        cutoffMinutes: raceCutoff
          ? passage.clockMinutes + planned.finishMarginSeconds! / 60
          : waypoint.cutoffMinutes,
        marginSeconds: raceCutoff
          ? planned.finishMarginSeconds
          : passage.marginSeconds,
        night: isNight,
        weather: stationWeather(weather, passage.elapsedSeconds, isNight),
        refill: sentence([
          fueling.stations[waypoint.id],
          waypoint.nutritionNote,
          waypoint.todo,
          waypoint.kind === "base" &&
            stopSeconds > 0 &&
            `${formatDuration(stopSeconds)} d’arrêt`,
        ]),
        stopSeconds,
      };
    });
  const segments = simulation.segments.map(
    (segment, index): TimelineSegment => {
      const end = segment.arrival.elapsedSeconds;
      const begin = end - segment.movingSeconds;
      const runM = segment.toM - segment.fromM - segment.walkM;
      const runSeconds =
        segment.movingSeconds - (segment.walkM / 1000) * walkPaceSecondsPerKm;
      return {
        index: index + 1,
        id: segment.toId,
        fromName: names.get(segment.fromId) ?? "",
        toName: names.get(segment.toId) ?? "",
        fromM: segment.fromM,
        toM: segment.toM,
        gainM: segment.gainM,
        lossM: segment.lossM,
        walkM: segment.walkM,
        movingSeconds: segment.movingSeconds,
        runPaceSecondsPerKm:
          runM > 50 && runSeconds > 0 ? runSeconds / (runM / 1000) : null,
        night: night
          ? nightOverlap(night, begin, end) >= segment.movingSeconds / 2
          : false,
        carbsG: fueling.segments[segment.toId]?.carbsG ?? 0,
        items: fueling.segments[segment.toId]?.items ?? null,
        note: strategy?.segments[segment.toId]?.note ?? null,
      };
    },
  );
  const walkSeconds = segments.reduce(
    (sum, segment) => sum + (segment.walkM / 1000) * walkPaceSecondsPerKm,
    0,
  );
  const moving = segments.reduce(
    (sum, segment) => sum + segment.movingSeconds,
    0,
  );
  const finish = stations[stations.length - 1];
  const finishCutoffSeconds =
    simulation.passages[simulation.passages.length - 1]?.cutoffSeconds ?? null;
  const start = simulation.passages[0]?.clockMinutes ?? 0;
  return {
    stations,
    segments,
    totals: {
      finishClockMinutes: finish?.clockMinutes ?? start,
      finishCutoffMinutes:
        finishCutoffSeconds !== null
          ? start + finishCutoffSeconds / 60
          : planned.finishMarginSeconds !== null
            ? start +
              (simulation.finishSeconds + planned.finishMarginSeconds) / 60
            : null,
      finishMarginSeconds: planned.finishMarginSeconds,
      runSeconds: Math.max(0, moving - walkSeconds),
      walkSeconds,
      stopSeconds: simulation.stops.reduce(
        (sum, stop) => sum + stop.seconds,
        0,
      ),
      nightSeconds: night?.totalSeconds ?? 0,
    },
  };
}
