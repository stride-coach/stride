import { formatInteger, formatKm } from "./format";
import { rainWindows, type RaceWeather, type WeatherSlot } from "./weather";
import type { RacePlanModel } from "./workspace";

export type GearRange = { fromM: number; toM: number };

export type WeatherGear = {
  key: "jacket" | "warm" | "sun" | "torch";
  label: string;
  reason: string;
  where: string;
  ranges: GearRange[];
};

const coldCelsius = 8;
const hotCelsius = 22;

function km(meters: number) {
  return meters < 10_000 ? formatKm(meters) : formatInteger(meters / 1000);
}

function where(ranges: GearRange[], distanceM: number) {
  const first = ranges[0];
  const last = ranges.at(-1)!;
  if (first.fromM <= 0 && last.toM >= distanceM) return "tout le parcours";
  if (first.fromM <= 0) return `jusqu’au km ${km(last.toM)}`;
  if (last.toM >= distanceM) return `dès le km ${km(first.fromM)}`;
  return `km ${km(first.fromM)} à ${km(last.toM)}`;
}

function slotRanges(
  slots: WeatherSlot[],
  distanceM: number,
  test: (slot: WeatherSlot) => boolean,
) {
  const ranges: GearRange[] = [];
  slots.forEach((slot, index) => {
    if (!test(slot)) return;
    const toM = slots[index + 1]?.distanceM ?? distanceM;
    const last = ranges.at(-1);
    if (last && last.toM >= slot.distanceM) last.toM = toM;
    else ranges.push({ fromM: slot.distanceM, toM });
  });
  return ranges.filter((range) => range.toM > range.fromM);
}

export function weatherGear({
  weather,
  planned,
  distanceM,
}: {
  weather: RaceWeather | null;
  planned: RacePlanModel;
  distanceM: number;
}): WeatherGear[] {
  const items: WeatherGear[] = [];
  if (weather) {
    const rain = rainWindows(weather.slots).map((window) => ({
      fromM: window.from.distanceM,
      toM:
        weather.slots[weather.slots.indexOf(window.to) + 1]?.distanceM ??
        distanceM,
    }));
    if (rain.length > 0)
      items.push({
        key: "jacket",
        label: "Veste imperméable",
        reason: weather.mode === "forecast" ? "averses" : "pluie probable",
        where: where(rain, distanceM),
        ranges: rain,
      });
    const cold = slotRanges(
      weather.slots,
      distanceM,
      (slot) => slot.temperature < coldCelsius,
    );
    if (cold.length > 0) {
      const low = Math.min(...weather.slots.map((slot) => slot.temperature));
      items.push({
        key: "warm",
        label: "Gants et couche chaude",
        reason: `${Math.round(low)} °C`,
        where: where(cold, distanceM),
        ranges: cold,
      });
    }
    const hot = slotRanges(
      weather.slots,
      distanceM,
      (slot) => slot.temperature >= hotCelsius,
    );
    if (hot.length > 0) {
      const high = Math.max(...weather.slots.map((slot) => slot.temperature));
      items.push({
        key: "sun",
        label: "Casquette et crème solaire",
        reason: `${Math.round(high)} °C`,
        where: where(hot, distanceM),
        ranges: hot,
      });
    }
  }
  const night = planned.nightKm.filter((range) => range.toM > range.fromM);
  if (night.length > 0)
    items.push({
      key: "torch",
      label: "Frontale",
      reason: "nuit",
      where: where(night, distanceM),
      ranges: night,
    });
  return items;
}
