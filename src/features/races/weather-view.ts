import type { Course } from "./course";
import { formatClock, formatInteger, formatKm } from "./format";
import { distanceAtElapsed } from "./simulation";
import type { RaceTimeline } from "./timeline";
import {
  cardinal,
  rainWindows,
  type RaceWeather,
  type WeatherSlot,
} from "./weather";
import type { RacePlanModel, Scenario } from "./workspace";

export type WeatherKpi = { key: string; value: string; label: string };
export type WeatherAdjustment = { topic: string; text: string; where: string };
export type WeatherAlternative = {
  key: Scenario["key"];
  label: string;
  finish: string;
  rain: string;
  current: boolean;
};
export type WeatherRange = { fromM: number; toM: number };

export type WeatherView = {
  mode: RaceWeather["mode"];
  reading: string;
  kpis: WeatherKpi[];
  rain: WeatherRange[];
  adjustments: WeatherAdjustment[];
  alternatives: WeatherAlternative[];
  source: string;
};

const coldCelsius = 8;
const hotCelsius = 22;
const windyKmh = 30;

function km(meters: number) {
  return meters < 10_000 ? formatKm(meters) : formatInteger(meters / 1000);
}

function degrees(value: number) {
  return `${Math.round(value)} °C`;
}

function rainSpans(weather: RaceWeather, finishSeconds: number) {
  return rainWindows(weather.slots).map((window) => {
    const next = weather.slots[weather.slots.indexOf(window.to) + 1];
    return {
      from: window.from,
      toSeconds: next ? next.elapsedSeconds : finishSeconds,
      toM: next ? next.distanceM : null,
    };
  });
}

function rainDistance(
  course: Course,
  planned: RacePlanModel,
  spans: { from: WeatherSlot; toSeconds: number }[],
) {
  const finish = planned.simulation.finishSeconds;
  return spans.reduce((sum, span) => {
    const from = Math.min(span.from.elapsedSeconds, finish);
    const to = Math.min(span.toSeconds, finish);
    return (
      sum +
      Math.max(
        0,
        distanceAtElapsed(course, planned.simulation, to) -
          distanceAtElapsed(course, planned.simulation, from),
      )
    );
  }, 0);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function weatherView({
  weather,
  course,
  planned,
  timeline,
  startMinutes,
  alternatives = [],
}: {
  weather: RaceWeather;
  course: Course;
  planned: RacePlanModel;
  timeline: RaceTimeline;
  startMinutes: number;
  alternatives?: { scenario: Scenario; planned: RacePlanModel }[];
}): WeatherView {
  const slots = weather.slots;
  const clock = (elapsedSeconds: number) =>
    formatClock(startMinutes + elapsedSeconds / 60);
  const temperatures = slots.map((slot) => slot.temperature);
  const low = Math.min(...temperatures);
  const high = Math.max(...temperatures);
  const finish = slots.at(-1)!;
  const spans = rainSpans(weather, planned.simulation.finishSeconds);
  const rain: WeatherRange[] = spans.map((span) => ({
    fromM: span.from.distanceM,
    toM: span.toM ?? course.distanceM,
  }));
  const rainM = rain.reduce((sum, range) => sum + range.toM - range.fromM, 0);
  const windiest = slots
    .filter((slot) => slot.windKmh !== null)
    .sort((a, b) => b.windKmh! - a.windKmh!)[0];
  const nightRange = planned.nightKm.find((range) => range.toM > range.fromM);
  const nightWindow = planned.night?.windows.find(
    (window) => window.toSeconds > window.fromSeconds,
  );
  const finishedAtNight = planned.night
    ? planned.night.windows.some(
        (window) =>
          planned.simulation.finishSeconds >= window.fromSeconds &&
          planned.simulation.finishSeconds <= window.toSeconds,
      )
    : false;
  const normals = weather.mode === "normals";

  const kpis: WeatherKpi[] = [
    {
      key: "temperature",
      value:
        Math.round(low) === Math.round(high)
          ? degrees(low)
          : `${Math.round(low)} → ${Math.round(high)} °C`,
      label: normals ? "Température · normales" : "Température",
    },
    rain.length > 0
      ? {
          key: "rain",
          value: `km ${km(rain[0].fromM)} à ${km(rain.at(-1)!.toM)}`,
          label: normals ? "Pluie probable" : "Averses",
        }
      : { key: "rain", value: "Sec", label: "Pluie" },
    ...(rain.length > 0
      ? [{ key: "wet", value: `${km(rainM)} km`, label: "Sous la pluie" }]
      : []),
    ...(windiest
      ? [
          {
            key: "wind",
            value: `${Math.round(windiest.windKmh!)} km/h`,
            label:
              windiest.windDirection === null
                ? "Vent"
                : `Vent · ${cardinal(windiest.windDirection)}`,
          },
        ]
      : []),
    ...(nightRange && nightWindow
      ? [
          nightRange.fromM <= 0
            ? { key: "night", value: "Départ", label: "Nuit dès le départ" }
            : {
                key: "night",
                value: clock(nightWindow.fromSeconds),
                label: `Nuit · km ${km(nightRange.fromM)}`,
              },
        ]
      : []),
    { key: "finish", value: degrees(finish.temperature), label: "À l’arrivée" },
  ];

  const sentences = [
    rain.length > 0
      ? `${normals ? "Les normales annoncent de la pluie" : "Tu traverses la pluie"} entre le km ${km(rain[0].fromM)} et le km ${km(rain.at(-1)!.toM)}, de ${clock(spans[0].from.elapsedSeconds)} à ${clock(spans.at(-1)!.toSeconds)}.`
      : normals
        ? "Les normales de saison ne laissent pas attendre de pluie."
        : "Pas de pluie prévue sur ton parcours.",
    `Il fera ${degrees(finish.temperature)} à l’arrivée${finishedAtNight ? ", de nuit" : ""}.`,
  ];

  const adjustments: WeatherAdjustment[] = [];
  if (rain.length > 0)
    adjustments.push({
      topic: "Équipement",
      text: "Veste imperméable sur toi avant la première averse.",
      where: `km ${km(rain[0].fromM)}`,
    });
  const cold = slots.find((slot) => slot.temperature < coldCelsius);
  if (cold)
    adjustments.push({
      topic: "Couches",
      text: `Couche chaude et gants à portée : il fera jusqu’à ${degrees(low)}.`,
      where: cold.distanceM <= 0 ? "dès le départ" : `km ${km(cold.distanceM)}`,
    });
  if (nightRange) {
    const station = [...timeline.stations]
      .filter((item) => item.distanceM <= nightRange.fromM)
      .at(-1);
    adjustments.push({
      topic: "Lumière",
      text:
        nightRange.fromM <= 0 || !station || station.kind === "start"
          ? "Frontale sur la tête dès le départ, batterie de rechange dans le sac."
          : `Frontale sur la tête à ${station.name} : la nuit tombe au km ${km(nightRange.fromM)}.`,
      where:
        nightRange.fromM <= 0 || !station
          ? "dès le départ"
          : `km ${km(station.distanceM)}`,
    });
  }
  if (high >= hotCelsius) {
    const hottest = slots.find((slot) => slot.temperature === high)!;
    adjustments.push({
      topic: "Boisson",
      text: `Il fera jusqu’à ${degrees(high)} : bois davantage aux heures chaudes.`,
      where: `vers ${clock(hottest.elapsedSeconds)}`,
    });
  }
  if (windiest && windiest.windKmh! >= windyKmh)
    adjustments.push({
      topic: "Vent",
      text: `Vent jusqu’à ${Math.round(windiest.windKmh!)} km/h : garde une couche coupe-vent accessible.`,
      where: `km ${km(windiest.distanceM)}`,
    });

  return {
    mode: weather.mode,
    reading: sentences.join(" "),
    kpis,
    rain,
    adjustments,
    alternatives:
      rain.length > 0 && alternatives.length > 1
        ? alternatives.map((item) => {
            const meters = rainDistance(course, item.planned, spans);
            return {
              key: item.scenario.key,
              label: capitalize(item.scenario.label),
              finish: clock(item.planned.simulation.finishSeconds),
              rain: meters > 0 ? `${km(meters)} km sous la pluie` : "au sec",
              current: item.scenario.key === planned.scenario.key,
            };
          })
        : [],
    source: weather.source,
  };
}
