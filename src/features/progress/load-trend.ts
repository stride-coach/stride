import { loadZone, productiveLoad } from "./health";
import type { LoadPoint } from "./history";
import { addDays, daysBetween } from "./period";
import type { LoadSignal } from "./recovery";

export type TrendLevel = "ok" | "watch" | "alert";

export type LoadTrend = {
  label: string;
  level: TrendLevel;
  description: string;
  band: string;
  line: string;
  peak: { x: number; y: number } | null;
  current: { x: number; y: number };
};

const weeks = 12;
const minimumWeeks = 4;
const sampleTolerance = 3;
const frame = { left: 4, right: 256, top: 8, bottom: 76 };

const zoneStatus = {
  low: { label: "Sous ta plage", level: "watch" },
  productive: { label: "Dans ta plage", level: "ok" },
  high: { label: "Au-dessus de ta plage", level: "watch" },
} as const;

function sample(series: LoadPoint[], day: string) {
  const point = [...series].reverse().find((item) => item.day <= day);
  return point &&
    point.chronic > 0 &&
    daysBetween(point.day, day) <= sampleTolerance
    ? point
    : null;
}

export function loadTrend(
  series: LoadPoint[],
  signal: LoadSignal | null,
  today: string,
): LoadTrend | null {
  if (!signal) return null;
  const samples = Array.from({ length: weeks }, (_, index) => {
    const point = sample(series, addDays(today, -7 * (weeks - 1 - index)));
    return point
      ? {
          index,
          acute: point.acute,
          low: point.chronic * productiveLoad.low,
          high: point.chronic * productiveLoad.high,
        }
      : null;
  }).filter((item) => item !== null);
  if (samples.length < minimumWeeks) return null;
  const values = samples.flatMap((item) => [item.acute, item.low, item.high]);
  const min = Math.min(...values);
  const span = Math.max(1, Math.max(...values) - min);
  const x = (index: number) =>
    frame.left + (index / (weeks - 1)) * (frame.right - frame.left);
  const y = (value: number) =>
    frame.bottom - ((value - min) / span) * (frame.bottom - frame.top);
  const coordinate = (index: number, value: number) =>
    `${x(index).toFixed(1)},${y(value).toFixed(1)}`;
  const above = samples.filter((item) => item.acute > item.high);
  const peak = above.reduce<(typeof samples)[number] | null>(
    (best, item) => (!best || item.acute > best.acute ? item : best),
    null,
  );
  const last = samples.at(-1)!;
  const status = zoneStatus[loadZone(signal.ratio)];
  return {
    ...status,
    description:
      above.length === 0
        ? "Charge sur 12 semaines, dans la zone prévue."
        : `Charge sur 12 semaines, ${above.length} ${above.length > 1 ? "semaines" : "semaine"} au-dessus de la zone prévue.`,
    band: [
      ...samples.map((item) => coordinate(item.index, item.high)),
      ...[...samples].reverse().map((item) => coordinate(item.index, item.low)),
    ].join(" "),
    line: samples.map((item) => coordinate(item.index, item.acute)).join(" "),
    peak: peak ? { x: x(peak.index), y: y(peak.acute) } : null,
    current: { x: x(last.index), y: y(last.acute) },
  };
}
