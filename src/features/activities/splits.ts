import { formatPace } from "./activities";
import type { ActivityTrack } from "./track";

export const elevationNoiseMeters = 1;
export const fasterThanAverageSeconds = 5;
export const minimumPartialMeters = 50;

export type SplitColumn = "heartRate" | "gain" | "loss" | "cadence" | "power";

export type SplitRow = {
  key: string;
  label: string;
  pace: string;
  bar: { width: number; fast: boolean } | null;
  heartRate: string | null;
  gain: string | null;
  loss: string | null;
  cadence: string | null;
  power: string | null;
};

export type KmSplits = {
  columns: SplitColumn[];
  rows: SplitRow[];
  average: SplitRow;
};

type Sample = {
  distance: number;
  time: number;
  heartRate: number | null;
  elevation: number | null;
  cadence: number | null;
  power: number | null;
};

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const tenths = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function mean(values: (number | null)[]) {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0
    ? present.reduce((sum, value) => sum + value, 0) / present.length
    : null;
}

function format(value: number | null) {
  return value === null ? null : integer.format(value);
}

function samplesOf(track: ActivityTrack): Sample[] {
  const distance = track.series.distance_m;
  const elapsed = track.series.elapsed_s;
  if (!distance || !elapsed) return [];
  const samples: Sample[] = [];
  for (let index = 0; index < track.length; index++) {
    const meters = distance[index];
    const time = elapsed[index];
    if (meters === null || time === null || meters === undefined) continue;
    const last = samples.at(-1);
    if (last && (meters < last.distance || time < last.time)) continue;
    samples.push({
      distance: meters,
      time,
      heartRate: track.series.heart_rate?.[index] ?? null,
      elevation: track.series.elevation_m?.[index] ?? null,
      cadence: track.series.cadence?.[index] ?? null,
      power: track.series.power_w?.[index] ?? null,
    });
  }
  return samples;
}

function at(samples: Sample[], meters: number) {
  const after = samples.findIndex((sample) => sample.distance >= meters);
  if (after <= 0) return after === 0 ? samples[0] : samples.at(-1)!;
  const before = samples[after - 1];
  const next = samples[after];
  const span = next.distance - before.distance;
  const ratio = span > 0 ? (meters - before.distance) / span : 0;
  const mix = (first: number | null, second: number | null) =>
    first === null || second === null
      ? (first ?? second)
      : first + (second - first) * ratio;
  return {
    distance: meters,
    time: before.time + (next.time - before.time) * ratio,
    heartRate: null,
    elevation: mix(before.elevation, next.elevation),
    cadence: null,
    power: null,
  };
}

export function climb(elevations: (number | null)[]) {
  let reference: number | null = null;
  let gain = 0;
  let loss = 0;
  for (const value of elevations) {
    if (value === null) continue;
    if (reference === null) {
      reference = value;
      continue;
    }
    const delta = value - reference;
    if (Math.abs(delta) < elevationNoiseMeters) continue;
    if (delta > 0) gain += delta;
    else loss -= delta;
    reference = value;
  }
  return { gain, loss };
}

export function kmSplits(track: ActivityTrack): KmSplits | null {
  const samples = samplesOf(track);
  if (samples.length < 2) return null;
  const total = samples.at(-1)!.distance;
  const whole = Math.floor(total / 1000);
  const boundaries = Array.from({ length: whole + 1 }, (_, km) => km * 1000);
  const partial = total - whole * 1000;
  if (partial >= minimumPartialMeters) boundaries.push(total);
  if (boundaries.length < 2) return null;
  const hasElevation = samples.some((sample) => sample.elevation !== null);
  const segments = boundaries.slice(1).map((end, index) => {
    const start = boundaries[index];
    const first = at(samples, start);
    const last = at(samples, end);
    const inside = samples.filter(
      (sample) => sample.distance > start && sample.distance < end,
    );
    const meters = end - start;
    const seconds = last.time - first.time;
    const { gain, loss } = climb([
      first.elevation,
      ...inside.map((sample) => sample.elevation),
      last.elevation,
    ]);
    const window = samples.filter(
      (sample) => sample.distance >= start && sample.distance <= end,
    );
    return {
      label: meters >= 1000 ? String(index + 1) : tenths.format(meters / 1000),
      meters,
      seconds,
      pace: seconds > 0 ? seconds / (meters / 1000) : null,
      heartRate: mean(window.map((sample) => sample.heartRate)),
      cadence: mean(window.map((sample) => sample.cadence)),
      power: mean(window.map((sample) => sample.power)),
      gain: hasElevation ? gain : null,
      loss: hasElevation ? loss : null,
    };
  });
  if (segments.some((segment) => segment.pace === null)) return null;
  const totalSeconds = segments.reduce((sum, item) => sum + item.seconds, 0);
  const average = totalSeconds / (total / 1000);
  const fastest = Math.min(...segments.map((segment) => segment.pace!));
  const rows: SplitRow[] = segments.map((segment) => ({
    key: `km-${segment.label}`,
    label: segment.label,
    pace: formatPace(segment.meters, segment.seconds),
    bar: {
      width: Math.max(
        8,
        Math.round(100 - ((segment.pace! - fastest) / fastest) * 170),
      ),
      fast: segment.pace! < average - fasterThanAverageSeconds,
    },
    heartRate: format(segment.heartRate),
    gain:
      segment.gain === null
        ? null
        : segment.gain >= 0.5
          ? integer.format(segment.gain)
          : "—",
    loss:
      segment.loss === null
        ? null
        : segment.loss >= 0.5
          ? integer.format(segment.loss)
          : "—",
    cadence: format(segment.cadence),
    power: format(segment.power),
  }));
  const sum = (key: "gain" | "loss") =>
    hasElevation
      ? integer.format(
          segments.reduce((value, segment) => value + (segment[key] ?? 0), 0),
        )
      : null;
  const columns = (
    ["heartRate", "gain", "loss", "cadence", "power"] as const
  ).filter((key) => rows.some((row) => row[key] !== null));
  return {
    columns,
    rows,
    average: {
      key: "average",
      label: "Moyenne",
      pace: formatPace(total, totalSeconds),
      bar: null,
      heartRate: format(mean(samples.map((sample) => sample.heartRate))),
      gain: sum("gain"),
      loss: sum("loss"),
      cadence: format(mean(samples.map((sample) => sample.cadence))),
      power: format(mean(samples.map((sample) => sample.power))),
    },
  };
}
