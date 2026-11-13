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

export type GearSpan = { fromM: number; toM: number; state: "on" | "bag" };

export type GearRow = {
  key: string;
  label: string;
  spans: GearSpan[];
  changes: number[];
};

type GearStation = { name: string; kind: string; distanceM: number };

function spansFor(on: GearRange[], distanceM: number): GearSpan[] {
  const spans: GearSpan[] = [];
  let cursor = 0;
  for (const range of [...on].sort((left, right) => left.fromM - right.fromM)) {
    const fromM = Math.max(cursor, range.fromM);
    const toM = Math.min(distanceM, range.toM);
    if (fromM > cursor) spans.push({ fromM: cursor, toM: fromM, state: "bag" });
    if (toM > fromM) spans.push({ fromM, toM, state: "on" });
    cursor = Math.max(cursor, toM);
  }
  if (cursor < distanceM)
    spans.push({ fromM: cursor, toM: distanceM, state: "bag" });
  return spans;
}

function changesOf(spans: GearSpan[], distanceM: number) {
  return spans
    .slice(1)
    .map((span) => span.fromM)
    .filter((meters) => meters > 0 && meters < distanceM);
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function gearTimeline({
  items,
  distanceM,
  stations,
  mandatory,
}: {
  items: WeatherGear[];
  distanceM: number;
  stations: GearStation[];
  mandatory: string[];
}): GearRow[] {
  const rows: GearRow[] = items.map((item) => {
    const spans = spansFor(item.ranges, distanceM);
    return {
      key: item.key,
      label: item.label,
      spans,
      changes: changesOf(spans, distanceM),
    };
  });
  const jacket = items.find((item) => item.key === "jacket");
  const dryAt = jacket?.ranges.at(-1)?.toM;
  const change =
    dryAt === undefined
      ? undefined
      : stations.find(
          (station) =>
            station.distanceM >= dryAt &&
            station.kind !== "start" &&
            station.kind !== "finish",
        );
  if (change) {
    const spans = spansFor(
      [{ fromM: change.distanceM, toM: distanceM }],
      distanceM,
    );
    rows.push({
      key: "socks",
      label: "Chaussettes de rechange",
      spans,
      changes: [change.distanceM],
    });
  }
  if (mandatory.length > 0)
    rows.push({
      key: "mandatory",
      label: capitalize(
        mandatory
          .slice(0, 2)
          .map((label, index) => (index === 0 ? label : label.toLowerCase()))
          .join(", "),
      ),
      spans: [{ fromM: 0, toM: distanceM, state: "bag" }],
      changes: [],
    });
  return rows;
}

function stationBefore(stations: GearStation[], distanceM: number) {
  return stations
    .filter(
      (station) => station.distanceM <= distanceM && station.kind !== "finish",
    )
    .at(-1);
}

function at(station: GearStation | undefined) {
  return !station || station.kind === "start"
    ? "dès le départ"
    : `à ${station.name}`;
}

export function gearReading(items: WeatherGear[], stations: GearStation[]) {
  const moments: string[] = [];
  const jacket = items.find((item) => item.key === "jacket");
  const first = jacket?.ranges[0];
  if (first)
    moments.push(
      first.fromM <= 0
        ? "la veste sur toi dès le départ"
        : `la veste sur toi avant le km ${km(first.fromM)}`,
    );
  const torch = items.find((item) => item.key === "torch")?.ranges[0];
  if (torch)
    moments.push(
      `la frontale sur la tête ${at(stationBefore(stations, torch.fromM))}`,
    );
  const sentences: string[] = [];
  if (moments.length === 2)
    sentences.push(`Deux moments comptent : ${moments[0]}, et ${moments[1]}.`);
  else if (moments.length === 1)
    sentences.push(`Un moment compte : ${moments[0]}.`);
  const warm = items.find((item) => item.key === "warm");
  const cold = warm?.ranges[0];
  if (warm && cold && cold.fromM > 0)
    sentences.push(
      `Les gants t’attendent ${at(stationBefore(stations, cold.fromM))}, il fera ${warm.reason}.`,
    );
  return sentences.length > 0 ? sentences.join(" ") : null;
}
