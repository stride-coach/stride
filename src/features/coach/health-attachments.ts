import { z } from "zod";

export const healthTopicIds = [
  "hrv",
  "sleep",
  "resting-heart-rate",
  "body-battery",
  "stress",
] as const;
export type HealthTopicId = (typeof healthTopicIds)[number];

export const healthTopicSchema = z.enum(healthTopicIds);

export const healthWindowDays = 14;

type HealthMetric = {
  key: string;
  label: string;
  unit: "seconds" | "ms" | "bpm" | "points";
};

export const healthTopics: Record<
  HealthTopicId,
  { label: string; metrics: readonly HealthMetric[] }
> = {
  sleep: {
    label: "Sommeil",
    metrics: [
      { key: "sleep_duration_seconds", label: "Durée", unit: "seconds" },
      { key: "sleep_score", label: "Score", unit: "points" },
    ],
  },
  hrv: {
    label: "VFC",
    metrics: [{ key: "hrv_last_night_ms", label: "VFC nocturne", unit: "ms" }],
  },
  "resting-heart-rate": {
    label: "FC de repos",
    metrics: [
      { key: "resting_heart_rate_bpm", label: "FC de repos", unit: "bpm" },
    ],
  },
  "body-battery": {
    label: "Body Battery",
    metrics: [{ key: "body_battery_wake", label: "Au réveil", unit: "points" }],
  },
  stress: {
    label: "Stress",
    metrics: [{ key: "average_stress", label: "Stress moyen", unit: "points" }],
  },
};

export const healthMetricKeys = healthTopicIds.flatMap((id) =>
  healthTopics[id].metrics.map((metric) => metric.key),
);

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function healthValueLabel(unit: HealthMetric["unit"], value: number) {
  if (unit === "seconds") {
    const minutes = Math.round(value / 60);
    const rest = minutes % 60;
    return `${Math.floor(minutes / 60)} h ${String(rest).padStart(2, "0")}`;
  }
  const rounded = number.format(value);
  if (unit === "ms") return `${rounded} ms`;
  if (unit === "bpm") return `${rounded} bpm`;
  return rounded;
}

export type HealthObservation = {
  metric: string;
  day: string;
  value: number;
};

export type HealthSeries = {
  id: HealthTopicId;
  title: string;
  latestDay: string | null;
  latest: string | null;
  days: { date: string; values: Record<string, number> }[];
};

export function healthSeries(
  id: HealthTopicId,
  observations: readonly HealthObservation[],
): HealthSeries {
  const topic = healthTopics[id];
  const keys = new Set(topic.metrics.map((metric) => metric.key));
  const byDay = new Map<string, Record<string, number>>();
  for (const item of observations) {
    if (!keys.has(item.metric) || !Number.isFinite(item.value)) continue;
    byDay.set(item.day, { ...byDay.get(item.day), [item.metric]: item.value });
  }
  const days = [...byDay.entries()]
    .map(([date, values]) => ({ date, values }))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-healthWindowDays);
  const last = days.at(-1) ?? null;
  const lead = topic.metrics.find(
    (metric) => last && metric.key in last.values,
  );
  return {
    id,
    title: topic.label,
    latestDay: last?.date ?? null,
    latest:
      last && lead ? healthValueLabel(lead.unit, last.values[lead.key]) : null,
    days,
  };
}
