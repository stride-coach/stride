import {
  nearestIndex,
  paceFromSpeed,
  type ActivityTrack,
  type RouteBand,
} from "./track";

export const chartWidth = 900;
export const chartHeight = 160;
const topPadding = 14;
const bottomPadding = 10;
const reliefTop = 0.72;

export const dataSeriesKeys = [
  "pace",
  "heartRate",
  "power",
  "cadence",
  "elevation",
] as const;
export type DataSeriesKey = (typeof dataSeriesKeys)[number];

export const dataSeriesLabels: Record<DataSeriesKey, string> = {
  pace: "Allure",
  heartRate: "FC",
  power: "Puissance",
  cadence: "Cadence",
  elevation: "Altitude",
};

export const defaultDataSeries: readonly DataSeriesKey[] = [
  "pace",
  "heartRate",
];

export type ChartBand = { x: number; width: number; label: string };

export type DataSeries = {
  key: DataSeriesKey;
  label: string;
  unit: string;
  path: string;
  ys: (number | null)[];
  values: (string | null)[];
};

export type ChartsView = {
  axis: "elapsed time" | "sample position";
  timeLabels: [string, string, string];
  bands: ChartBand[];
  relief: string | null;
  xs: number[];
  positions: string[];
  routeIndex: (number | null)[];
  series: DataSeries[];
};

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function formatElapsed(seconds: number) {
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  return hours > 0
    ? `${hours}:${formatClock(total % 3600).padStart(5, "0")}`
    : formatClock(total);
}

function percentile(sorted: readonly number[], ratio: number) {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function domainOf(values: (number | null)[], trim: boolean) {
  const present = values
    .filter((value): value is number => value !== null)
    .sort((a, b) => a - b);
  if (present.length < 2) return null;
  const low = trim ? percentile(present, 0.04) : present[0];
  const high = trim ? percentile(present, 0.96) : present[present.length - 1];
  const span = high - low || 1;
  return { min: low - span * 0.05, max: high + span * 0.05 };
}

function round(value: number) {
  return Math.round(value * 10) / 10;
}

function scale(
  value: number,
  domain: { min: number; max: number },
  range: { top: number; bottom: number },
  invert: boolean,
) {
  const ratio =
    (Math.min(domain.max, Math.max(domain.min, value)) - domain.min) /
    (domain.max - domain.min || 1);
  return range.top + (invert ? ratio : 1 - ratio) * (range.bottom - range.top);
}

function pathOf(xs: readonly number[], ys: readonly (number | null)[]) {
  let drawing = false;
  let data = "";
  ys.forEach((y, index) => {
    if (y === null) {
      drawing = false;
      return;
    }
    data += `${drawing ? "L" : "M"}${round(xs[index])},${y}`;
    drawing = true;
  });
  return data;
}

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const kilometers = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function buildChartsView(
  track: ActivityTrack,
  options: {
    bands: RouteBand[];
    running?: boolean;
    cycling?: boolean;
    routeFractions?: readonly number[] | null;
  },
): ChartsView | null {
  if (track.length < 2) return null;
  const elapsed = track.series.elapsed_s;
  const completeElapsed =
    elapsed?.length === track.length &&
    elapsed.every(
      (value): value is number => value !== null && Number.isFinite(value),
    ) &&
    elapsed[0] >= 0 &&
    elapsed.every(
      (value, index) => index === 0 || value >= elapsed[index - 1]!,
    );
  const duration =
    completeElapsed && elapsed.at(-1)! > elapsed[0] ? elapsed.at(-1)! : null;
  const xs = Array.from(
    { length: track.length },
    (_, index) =>
      (duration !== null
        ? elapsed![index]! / duration
        : index / (track.length - 1)) * chartWidth,
  );
  const distance = track.series.distance_m;
  let lastDistance = 0;
  const covered = Array.from({ length: track.length }, (_, index) => {
    const value = distance?.[index] ?? null;
    if (value !== null && value >= lastDistance) lastDistance = value;
    return distance ? lastDistance : null;
  });
  const totalDistance = lastDistance;
  const positions = xs.map((_, index) =>
    [
      duration !== null
        ? formatElapsed(elapsed![index]!)
        : `Échantillon ${index + 1} sur ${track.length}`,
      covered[index] !== null
        ? `${kilometers.format(covered[index]! / 1000)} km`
        : null,
    ]
      .filter(Boolean)
      .join(" · "),
  );
  const route = options.routeFractions;
  const routeIndex = xs.map((_, index) => {
    if (!route || route.length === 0) return null;
    const fraction =
      totalDistance > 0 && covered[index] !== null
        ? covered[index]! / totalDistance
        : index / (track.length - 1);
    return nearestIndex(route, fraction);
  });
  const range = { top: topPadding, bottom: chartHeight - bottomPadding };
  const seriesOf = (
    key: DataSeriesKey,
    values: (number | null)[] | undefined,
    unit: string,
    format: (value: number) => string,
    { trim = false, invert = false } = {},
  ): DataSeries | null => {
    if (!values) return null;
    const domain = domainOf(values, trim);
    if (!domain) return null;
    const ys = values.map((value) =>
      value === null ? null : round(scale(value, domain, range, invert)),
    );
    return {
      key,
      label: dataSeriesLabels[key],
      unit,
      path: pathOf(xs, ys),
      ys,
      values: values.map((value) => (value === null ? null : format(value))),
    };
  };
  const paceValues =
    options.running === false || !track.series.speed_mps
      ? undefined
      : track.series.speed_mps.map(paceFromSpeed);
  const elevation = track.series.elevation_m;
  const reliefDomain = elevation ? domainOf(elevation, false) : null;
  const relief =
    elevation && reliefDomain
      ? (() => {
          const ys = elevation.map((value) =>
            value === null
              ? null
              : round(
                  scale(
                    value,
                    reliefDomain,
                    { top: chartHeight * reliefTop, bottom: chartHeight },
                    false,
                  ),
                ),
          );
          const line = pathOf(xs, ys);
          const first = ys.findIndex((y) => y !== null);
          const last = ys.findLastIndex((y) => y !== null);
          return line && first !== last
            ? `${line}L${round(xs[last])},${chartHeight}L${round(xs[first])},${chartHeight}Z`
            : null;
        })()
      : null;
  const series = [
    seriesOf("pace", paceValues, "/km", formatClock, {
      trim: true,
      invert: true,
    }),
    seriesOf("heartRate", track.series.heart_rate, "bpm", (value) =>
      integer.format(value),
    ),
    seriesOf("power", track.series.power_w, "W", (value) =>
      integer.format(value),
    ),
    seriesOf(
      "cadence",
      track.series.cadence,
      options.cycling ? "tr/min" : "pas/min",
      (value) => integer.format(value),
    ),
    seriesOf("elevation", elevation, "m", (value) => integer.format(value)),
  ].filter((item): item is DataSeries => item !== null);
  if (series.length === 0) return null;
  return {
    axis: duration !== null ? "elapsed time" : "sample position",
    timeLabels:
      duration !== null
        ? ["0:00", formatElapsed(duration / 2), formatElapsed(duration)]
        : ["0 %", "50 %", "100 %"],
    bands: (duration !== null ? options.bands : []).map((band) => ({
      x: round(band.from * chartWidth),
      width: round((band.to - band.from) * chartWidth),
      label: band.label,
    })),
    relief,
    xs: xs.map(round),
    positions,
    routeIndex,
    series,
  };
}

export const curveWidth = 700;
export const curveHeight = 120;

export type HeartRateCurve = {
  path: string;
  averageY: number;
  average: number;
  peak: number;
  duration: string;
};

export function buildHeartRateCurve(
  track: ActivityTrack,
  average: number | null,
): HeartRateCurve | null {
  const values = track.series.heart_rate;
  const elapsed = track.series.elapsed_s;
  if (!values || !elapsed || track.length < 2) return null;
  const present = values.filter((value): value is number => value !== null);
  const duration = elapsed.at(-1);
  if (present.length < 2 || !duration || duration <= 0) return null;
  const mean =
    average ?? present.reduce((sum, value) => sum + value, 0) / present.length;
  const domain = domainOf(values, false)!;
  const range = { top: 10, bottom: curveHeight - 10 };
  const xs = elapsed.map((value) =>
    value === null ? 0 : (value / duration) * curveWidth,
  );
  const ys = values.map((value, index) =>
    value === null || elapsed[index] === null
      ? null
      : round(scale(value, domain, range, false)),
  );
  return {
    path: pathOf(xs, ys),
    averageY: round(scale(mean, domain, range, false)),
    average: Math.round(mean),
    peak: Math.round(Math.max(...present)),
    duration: formatElapsed(duration),
  };
}
