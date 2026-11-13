import { formatClock } from "./format";
import type { PlanNotice } from "./plan-notices";
import { addDays } from "./sun";
import type { RaceWeather, WeatherSlot } from "./weather";

export type WeatherSnapshot = {
  observedOn: string;
  weather: RaceWeather;
  adopted: boolean;
};

export type WeatherChange = {
  temperature: {
    delta: number;
    clockMinutes: number;
    distanceM: number;
  } | null;
  rain: boolean;
};

const temperatureThreshold = 5;
const rainThreshold = 50;
const freezeDays = 2;
const matchSeconds = 3600;

function nearest(slots: WeatherSlot[], elapsedSeconds: number) {
  let best: WeatherSlot | null = null;
  for (const slot of slots)
    if (
      Math.abs(slot.elapsedSeconds - elapsedSeconds) <= matchSeconds &&
      (!best ||
        Math.abs(slot.elapsedSeconds - elapsedSeconds) <
          Math.abs(best.elapsedSeconds - elapsedSeconds))
    )
      best = slot;
  return best;
}

export function weatherChange(
  current: RaceWeather,
  reference: RaceWeather,
): WeatherChange | null {
  let temperature: WeatherChange["temperature"] = null;
  for (const slot of current.slots) {
    const before = nearest(reference.slots, slot.elapsedSeconds);
    if (!before) continue;
    const delta = Math.round(slot.temperature - before.temperature);
    if (
      Math.abs(delta) >= temperatureThreshold &&
      (!temperature || Math.abs(delta) > Math.abs(temperature.delta))
    )
      temperature = {
        delta,
        clockMinutes: slot.clockMinutes,
        distanceM: slot.distanceM,
      };
  }
  const wet = (weather: RaceWeather) =>
    weather.slots.some((slot) => slot.precipitationProbability > rainThreshold);
  const rain = wet(current) && !wet(reference);
  return temperature || rain ? { temperature, rain } : null;
}

export function weatherChangeNotice(
  change: WeatherChange,
  since: "yesterday" | "freeze",
): PlanNotice {
  const parts = [
    change.temperature
      ? `Jusqu’à ${Math.abs(change.temperature.delta)} °C de ${change.temperature.delta < 0 ? "moins" : "plus"} vers ${formatClock(change.temperature.clockMinutes)}, au km ${Math.round(change.temperature.distanceM / 1000)}.`
      : null,
    change.rain ? "La pluie passe au-dessus de 50 %." : null,
    since === "yesterday"
      ? "Vérifie ta tenue."
      : "Le plan garde la météo de J-2 tant que tu ne prends pas la nouvelle.",
  ];
  return {
    key: "weather",
    title:
      since === "yesterday"
        ? "La météo a changé depuis hier"
        : "La météo a changé depuis le gel du plan",
    text: parts.filter(Boolean).join(" "),
  };
}

export function previousSnapshot(snapshots: WeatherSnapshot[], today: string) {
  return (
    snapshots
      .filter((snapshot) => snapshot.observedOn < today)
      .sort((a, b) => b.observedOn.localeCompare(a.observedOn))[0] ?? null
  );
}

export function frozenReference(
  snapshots: WeatherSnapshot[],
  raceDate: string,
  today: string,
) {
  const from = addDays(raceDate, -freezeDays);
  if (today < from || today > raceDate) return null;
  const week = snapshots
    .filter(
      (snapshot) => snapshot.observedOn >= from && snapshot.observedOn <= today,
    )
    .sort((a, b) => a.observedOn.localeCompare(b.observedOn));
  return week.filter((snapshot) => snapshot.adopted).at(-1) ?? week[0] ?? null;
}
