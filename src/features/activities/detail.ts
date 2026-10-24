import { z } from "zod";
import {
  activityKind,
  formatDistance,
  formatDuration,
  formatPace,
  positiveMeasure,
  type ActivityKind,
} from "./activities";
import { feelLabels, type FeelValue } from "@/features/plans/debrief/debrief";

export const activityDetailColumns =
  "id, activity_type, activity_name, route_name, started_at, local_started_at, distance_meters, duration_seconds, elevation_gain_meters, elevation_loss_meters, average_heart_rate, max_heart_rate, average_cadence, average_power_watts, max_power_watts, aerobic_training_effect, anaerobic_training_effect, calories, workout_rpe, workout_feel, detail_imported_at";
export const segmentColumns =
  "segment_type, segment_index, started_at, distance_meters, duration_seconds, average_heart_rate, average_cadence, average_power_watts, elevation_gain_meters, elevation_loss_meters";

export const activityDetailRowSchema = z
  .object({
    id: z.string(),
    activity_type: z.string().nullable(),
    activity_name: z.string().nullable().optional(),
    route_name: z.string().nullable(),
    started_at: z.string(),
    local_started_at: z.string().nullable(),
    distance_meters: positiveMeasure,
    duration_seconds: positiveMeasure,
    elevation_gain_meters: positiveMeasure,
    elevation_loss_meters: positiveMeasure,
    average_heart_rate: positiveMeasure,
    max_heart_rate: positiveMeasure,
    average_cadence: positiveMeasure,
    average_power_watts: positiveMeasure,
    max_power_watts: positiveMeasure,
    aerobic_training_effect: positiveMeasure,
    anaerobic_training_effect: positiveMeasure,
    calories: positiveMeasure.optional().default(null),
    workout_rpe: positiveMeasure.optional().default(null),
    workout_feel: z
      .union([z.number(), z.string()])
      .nullable()
      .optional()
      .transform((value) => {
        if (value === null || value === undefined || value === "") return null;
        const parsed = Number(value);
        return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
          ? parsed
          : null;
      }),
    detail_imported_at: z.string().nullable(),
  })
  .transform((row) => {
    const local = row.local_started_at ?? row.started_at;
    return {
      id: row.id,
      startedAt: row.started_at,
      type: row.activity_type,
      name: row.activity_name?.trim() || null,
      routeName: row.route_name?.trim() || null,
      date: local.slice(0, 10),
      localTime: row.local_started_at
        ? row.local_started_at.slice(11, 16)
        : null,
      distanceMeters: row.distance_meters,
      durationSeconds: row.duration_seconds,
      elevationGainMeters: row.elevation_gain_meters,
      elevationLossMeters: row.elevation_loss_meters,
      averageHeartRate: row.average_heart_rate,
      maxHeartRate: row.max_heart_rate,
      averageCadence: row.average_cadence,
      averagePowerWatts: row.average_power_watts,
      maxPowerWatts: row.max_power_watts,
      aerobicTrainingEffect: row.aerobic_training_effect,
      anaerobicTrainingEffect: row.anaerobic_training_effect,
      calories: row.calories,
      perceivedEffort: row.workout_rpe,
      feel: row.workout_feel,
      detailImportedAt: row.detail_imported_at,
    };
  });

export const segmentRowSchema = z
  .object({
    segment_type: z.enum(["lap", "split"]),
    segment_index: z.number().int(),
    distance_meters: positiveMeasure,
    duration_seconds: positiveMeasure,
    average_heart_rate: positiveMeasure,
    average_cadence: positiveMeasure,
    average_power_watts: positiveMeasure,
    elevation_gain_meters: positiveMeasure,
    elevation_loss_meters: positiveMeasure,
  })
  .transform((row) => ({
    type: row.segment_type,
    index: row.segment_index,
    distanceMeters: row.distance_meters,
    durationSeconds: row.duration_seconds,
    averageHeartRate: row.average_heart_rate,
    averageCadence: row.average_cadence,
    averagePowerWatts: row.average_power_watts,
    elevationGainMeters: row.elevation_gain_meters,
    elevationLossMeters: row.elevation_loss_meters,
  }));

export type ActivityDetailData = z.output<typeof activityDetailRowSchema>;
export type ActivitySegment = z.output<typeof segmentRowSchema>;
export type DetailStat = {
  key: string;
  label: string;
  value: string;
  unit?: string;
};
export type LapColumnKey =
  | "duration"
  | "distance"
  | "pace"
  | "heartRate"
  | "cadence"
  | "elevation"
  | "elevationLoss"
  | "climb"
  | "power";
export type LapColumnDisplay = "all" | "wide" | "narrow";
export type LapColumn = {
  key: LapColumnKey;
  label: string;
  shortLabel: string;
  display: LapColumnDisplay;
};
export type LapRow = {
  key: string;
  label: string;
  cells: Record<LapColumnKey, string | null>;
};
export type LapTable = {
  title: string;
  columns: LapColumn[];
  rows: LapRow[];
};

export const minimumTableSegments = 2;

const effect = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const column = (
  key: LapColumnKey,
  label: string,
  display: LapColumnDisplay,
  shortLabel = label,
): LapColumn => ({ key, label, shortLabel, display });
const columns: LapColumn[] = [
  column("duration", "Temps", "all"),
  column("distance", "Dist.", "wide"),
  column("pace", "Allure", "all"),
  column("heartRate", "FC moy.", "all", "FC"),
  column("cadence", "Cad.", "wide"),
  column("elevation", "D+", "wide"),
  column("elevationLoss", "D−", "wide"),
  column("climb", "D+/D−", "narrow"),
  column("power", "Puiss.", "all", "W"),
];

function paceOf(
  kind: ActivityKind,
  distanceMeters: number | null,
  durationSeconds: number | null,
) {
  return kind !== "other" &&
    distanceMeters !== null &&
    distanceMeters >= 100 &&
    durationSeconds !== null
    ? formatPace(distanceMeters, durationSeconds)
    : null;
}

function cell(segment: ActivitySegment, kind: ActivityKind) {
  const {
    durationSeconds,
    distanceMeters,
    averageHeartRate,
    averageCadence,
    elevationGainMeters,
    elevationLossMeters,
    averagePowerWatts,
  } = segment;
  const gain =
    elevationGainMeters !== null ? integer.format(elevationGainMeters) : null;
  const loss =
    elevationLossMeters !== null ? integer.format(elevationLossMeters) : null;
  return {
    duration: durationSeconds !== null ? formatDuration(durationSeconds) : null,
    distance: distanceMeters !== null ? formatDistance(distanceMeters) : null,
    pace: paceOf(kind, distanceMeters, durationSeconds),
    heartRate:
      averageHeartRate !== null ? integer.format(averageHeartRate) : null,
    cadence: averageCadence !== null ? integer.format(averageCadence) : null,
    elevation: gain,
    elevationLoss: loss,
    climb:
      gain !== null || loss !== null ? `${gain ?? "—"}/${loss ?? "—"}` : null,
    power:
      averagePowerWatts !== null ? integer.format(averagePowerWatts) : null,
  } satisfies Record<LapColumnKey, string | null>;
}

export function lapTable(
  activity: ActivityDetailData,
  segments: ActivitySegment[],
): LapTable | null {
  const laps = segments.filter((segment) => segment.type === "lap");
  const chosen =
    laps.length >= minimumTableSegments
      ? laps
      : segments.filter((segment) => segment.type === "split");
  if (chosen.length < minimumTableSegments) return null;
  const kind = activityKind(activity.type);
  const ordered = [...chosen].sort((a, b) => a.index - b.index);
  const rows = ordered.map((segment, position) => ({
    key: `${segment.type}-${segment.index}`,
    label: String(position + 1),
    cells: cell(segment, kind),
  }));
  const present = columns.filter((item) =>
    rows.some((row) => row.cells[item.key] !== null),
  );
  if (present.length === 0) return null;
  return {
    title: chosen === laps ? "Tours" : "Segments",
    columns: present,
    rows,
  };
}

export function effortStats(
  activity: ActivityDetailData,
  feeling: { effort: number | null; feel: FeelValue | null } | null = null,
): DetailStat[] {
  const stats: (DetailStat | null)[] = [
    activity.calories !== null
      ? {
          key: "calories",
          label: "Calories",
          value: integer.format(activity.calories),
          unit: "kcal",
        }
      : null,
    feeling?.effort !== null && feeling?.effort !== undefined
      ? {
          key: "perceivedEffort",
          label: "Effort ressenti",
          value: integer.format(feeling.effort),
          unit: "/10",
        }
      : null,
    feeling?.feel !== null && feeling?.feel !== undefined
      ? { key: "feel", label: "Sensations", value: feelLabels[feeling.feel] }
      : null,
    activity.aerobicTrainingEffect !== null
      ? {
          key: "aerobic",
          label: "Effet aérobie",
          value: effect.format(activity.aerobicTrainingEffect),
        }
      : null,
    activity.anaerobicTrainingEffect !== null
      ? {
          key: "anaerobic",
          label: "Effet anaérobie",
          value: effect.format(activity.anaerobicTrainingEffect),
        }
      : null,
    activity.averagePowerWatts !== null
      ? {
          key: "power",
          label: "Puissance moy.",
          value: integer.format(activity.averagePowerWatts),
          unit: "W",
        }
      : null,
    activity.maxPowerWatts !== null
      ? {
          key: "maxPower",
          label: "Puissance max",
          value: integer.format(activity.maxPowerWatts),
          unit: "W",
        }
      : null,
    activity.averageCadence !== null
      ? {
          key: "cadence",
          label: "Cadence moy.",
          value: integer.format(activity.averageCadence),
          unit: "pas/min",
        }
      : null,
    activity.maxHeartRate !== null
      ? {
          key: "maxHeartRate",
          label: "FC max",
          value: integer.format(activity.maxHeartRate),
          unit: "bpm",
        }
      : null,
    activity.elevationLossMeters !== null
      ? {
          key: "elevationLoss",
          label: "D−",
          value: integer.format(activity.elevationLossMeters),
          unit: "m",
        }
      : null,
  ];
  return stats.filter((stat): stat is DetailStat => stat !== null);
}
