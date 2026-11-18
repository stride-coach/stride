import {
  baselineDays,
  restingRange,
  usualRange,
} from "@/features/progress/recovery";
import { addDays, daysBetween } from "@/features/progress/period";

export const recoveryHorizonDays = 14;
export const recoveryCautionBelow = 10;

export type WellnessDay = {
  day: string;
  hrv: number | null;
  restingHeartRate: number | null;
};

export type RecoveryMetric = "hrv" | "restingHeartRate";

export type RecoveryAlert = {
  metric: RecoveryMetric;
  range: { low: number; high: number };
};

export type RecoveryOutcome =
  | { metric: RecoveryMetric; state: "back"; days: number }
  | { metric: RecoveryMetric; state: "away" };

export type OutcomeMatch = {
  sessionKey: string;
  status: string;
  compliance: {
    duration: number | null;
    distance: number | null;
    intensity: number | null;
  };
};

const metricLabels: Record<RecoveryMetric, string> = {
  hrv: "VFC",
  restingHeartRate: "FC repos",
};

function valueOn(days: WellnessDay[], day: string, metric: RecoveryMetric) {
  return days.find((item) => item.day === day)?.[metric] ?? null;
}

function baselineValues(
  days: WellnessDay[],
  day: string,
  metric: RecoveryMetric,
) {
  const from = addDays(day, -baselineDays);
  return days.flatMap((item) =>
    item.day >= from && item.day < day && item[metric] !== null
      ? [item[metric]]
      : [],
  );
}

export function recoveryAlert(
  days: WellnessDay[],
  day: string,
): RecoveryAlert | null {
  const hrv = valueOn(days, day, "hrv");
  const hrvRange = usualRange(baselineValues(days, day, "hrv"));
  if (hrv !== null && hrvRange && hrv < hrvRange.low)
    return { metric: "hrv", range: hrvRange };
  const resting = valueOn(days, day, "restingHeartRate");
  const restingBand = restingRange(
    baselineValues(days, day, "restingHeartRate"),
  );
  if (resting !== null && restingBand && resting > restingBand.high)
    return { metric: "restingHeartRate", range: restingBand };
  return null;
}

export function recoveryOutcome(
  days: WellnessDay[],
  day: string,
  today: string,
): RecoveryOutcome | null {
  const alert = recoveryAlert(days, day);
  if (!alert) return null;
  const later = days
    .filter(
      (item) =>
        item.day > day &&
        daysBetween(day, item.day) <= recoveryHorizonDays &&
        item[alert.metric] !== null,
    )
    .sort((first, second) => first.day.localeCompare(second.day));
  const back = later.find((item) => {
    const value = item[alert.metric]!;
    return value >= alert.range.low && value <= alert.range.high;
  });
  if (back)
    return {
      metric: alert.metric,
      state: "back",
      days: daysBetween(day, back.day),
    };
  return daysBetween(day, today) >= recoveryHorizonDays
    ? { metric: alert.metric, state: "away" }
    : null;
}

export function recoveryLine(outcome: RecoveryOutcome) {
  const label = metricLabels[outcome.metric];
  if (outcome.state === "away")
    return `${label} toujours hors de ta plage après ${recoveryHorizonDays} jours`;
  return outcome.days === 1
    ? `${label} revenue dans ta plage le lendemain`
    : `${label} revenue dans ta plage après ${outcome.days} jours`;
}

export type RecoveryCase = { response: "accepted" | "rejected"; days: number };

export type RecoveryGroup = {
  kind: "accepted" | "rejected";
  label: string;
  cases: number;
  days: string;
};

export type RecoverySummary = {
  groups: RecoveryGroup[];
  caution: string | null;
};

const daysFormat = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function daysLabel(value: number) {
  return `${daysFormat.format(value)} ${value >= 2 ? "jours" : "jour"}`;
}

const cautionLead = [
  "",
  "Un seul cas",
  "Deux cas seulement",
  "Trois cas seulement",
  "Quatre cas seulement",
  "Cinq cas seulement",
  "Six cas seulement",
  "Sept cas seulement",
  "Huit cas seulement",
  "Neuf cas seulement",
];

export function recoverySummary(cases: RecoveryCase[]): RecoverySummary | null {
  if (cases.length === 0) return null;
  const groups = (
    [
      ["accepted", "Suivie"],
      ["rejected", "Refusée"],
    ] as const
  ).flatMap(([kind, label]) => {
    const own = cases.filter((item) => item.response === kind);
    if (own.length === 0) return [];
    const mean = own.reduce((sum, item) => sum + item.days, 0) / own.length;
    return [{ kind, label, cases: own.length, days: daysLabel(mean) }];
  });
  return {
    groups,
    caution:
      cases.length < recoveryCautionBelow
        ? `${cautionLead[cases.length]} : une tendance à surveiller, pas une preuve.`
        : null,
  };
}

export function sessionConformity(matches: OutcomeMatch[], sessionKey: string) {
  const match = matches.find(
    (item) =>
      item.sessionKey === sessionKey &&
      (item.status === "completed" || item.status === "partial"),
  );
  if (!match) return null;
  const ratios = [match.compliance.duration, match.compliance.distance].flatMap(
    (ratio) => (ratio === null ? [] : [ratio]),
  );
  if (ratios.length === 0) return null;
  const closeness =
    ratios.reduce(
      (sum, ratio) => sum + Math.max(0, 1 - Math.abs(ratio - 1)),
      0,
    ) / ratios.length;
  return Math.round(closeness * 100);
}
