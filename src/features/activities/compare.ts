import { efficiencyPace } from "@/features/progress/measures";
import type { SessionFamily } from "@/features/plans/view/program";
import {
  formatDistance,
  formatPace,
  formatActivityDate,
  type ActivityGroupKey,
} from "./activities";

export const similarCount = 3;
export const similarDistanceRatio = 0.25;
export const samePaceSeconds = 5;

export type CompareActivity = {
  id: string;
  date: string;
  startedAt: string;
  distanceMeters: number | null;
  durationSeconds: number | null;
  averageHeartRate: number | null;
  repPace: number | null;
};

export type CompareScope =
  | { kind: "planned"; family: SessionFamily }
  | { kind: "unplanned"; group: ActivityGroupKey };

export type ComparisonTone = "better" | "worse" | "same";

export type ComparisonColumn = "pace" | "heartRate" | "repPace" | "distance";

export type ComparisonRow = {
  id: string;
  current: boolean;
  date: string;
  cells: Record<ComparisonColumn, string | null>;
};

export type Comparison = {
  lead: string;
  emphasis: string;
  tail: string;
  tone: ComparisonTone;
  estimate: boolean;
  firstColumn: "Séance" | "Sortie";
  columns: { key: ComparisonColumn; label: string }[];
  rows: ComparisonRow[];
};

type Phrase = { one: string; many: (count: number) => string };

const sessions = (suffix: string): Phrase => ({
  one: `ta dernière séance ${suffix}`,
  many: (count) => `tes ${count} dernières séances ${suffix}`,
});

const familyPhrases: Partial<Record<SessionFamily, Phrase>> = {
  easy: {
    one: "ton dernier footing",
    many: (count) => `tes ${count} derniers footings`,
  },
  recovery: sessions("de récupération"),
  long: {
    one: "ta dernière sortie longue",
    many: (count) => `tes ${count} dernières sorties longues`,
  },
  long_trail: {
    one: "ta dernière sortie longue trail",
    many: (count) => `tes ${count} dernières sorties longues trail`,
  },
  tempo: sessions("à allure soutenue"),
  threshold: sessions("au seuil"),
  intervals: sessions("de fractionné"),
  hills: sessions("de côtes"),
  fartlek: sessions("de fartlek"),
  race_specific: sessions("spécifiques"),
  race: {
    one: "ta dernière course",
    many: (count) => `tes ${count} dernières courses`,
  },
};

const similarPhrase: Phrase = {
  one: "ta dernière sortie similaire",
  many: (count) => `tes ${count} dernières sorties similaires`,
};

function paceOf(activity: CompareActivity) {
  return activity.distanceMeters && activity.durationSeconds
    ? activity.durationSeconds / (activity.distanceMeters / 1000)
    : null;
}

function usable(activity: CompareActivity) {
  return (
    activity.distanceMeters !== null &&
    activity.distanceMeters >= 1000 &&
    activity.durationSeconds !== null &&
    activity.averageHeartRate !== null
  );
}

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function selectSimilar(
  current: CompareActivity,
  candidates: readonly CompareActivity[],
  scope: CompareScope,
) {
  return candidates
    .filter(
      (candidate) =>
        candidate.id !== current.id &&
        candidate.startedAt < current.startedAt &&
        usable(candidate) &&
        (scope.kind === "planned" ||
          (current.distanceMeters !== null &&
            Math.abs(candidate.distanceMeters! - current.distanceMeters) <=
              current.distanceMeters * similarDistanceRatio)),
    )
    .sort((first, second) => second.startedAt.localeCompare(first.startedAt))
    .slice(0, similarCount);
}

export function paceAtEqualHeartRate(
  activity: CompareActivity,
  reference: number,
  resting: number | null,
) {
  if (!usable(activity)) return null;
  return efficiencyPace(
    {
      activityId: activity.id,
      index: 0,
      distance: activity.distanceMeters!,
      duration: activity.durationSeconds!,
      heartRate: activity.averageHeartRate,
      gain: null,
      loss: null,
    },
    reference,
    resting,
  );
}

function sentence(
  current: CompareActivity,
  similar: CompareActivity[],
  resting: number | null,
): Pick<Comparison, "emphasis" | "tail" | "tone" | "estimate"> | null {
  const pace = paceOf(current)!;
  const previousPace = mean(similar.map((item) => paceOf(item)!));
  if (Math.abs(pace - previousPace) <= samePaceSeconds) {
    const delta = Math.round(
      current.averageHeartRate! -
        mean(similar.map((item) => item.averageHeartRate!)),
    );
    if (delta === 0)
      return {
        emphasis: "même allure, même FC",
        tail: "",
        tone: "same",
        estimate: false,
      };
    return {
      emphasis: `${Math.abs(delta)} bpm de ${delta < 0 ? "moins" : "plus"}`,
      tail: "",
      tone: delta < 0 ? "better" : "worse",
      estimate: false,
    };
  }
  const adjusted = similar
    .map((item) =>
      paceAtEqualHeartRate(item, current.averageHeartRate!, resting),
    )
    .filter((value): value is number => value !== null);
  if (adjusted.length === 0) return null;
  const delta = Math.round(mean(adjusted) - pace);
  if (delta === 0)
    return {
      emphasis: "même allure",
      tail: " à FC égale",
      tone: "same",
      estimate: true,
    };
  return {
    emphasis: `${Math.abs(delta)} s/km plus ${delta > 0 ? "vite" : "lentement"}`,
    tail: " à FC égale",
    tone: delta > 0 ? "better" : "worse",
    estimate: true,
  };
}

export function buildComparison({
  current,
  similar,
  scope,
  resting,
  today,
}: {
  current: CompareActivity;
  similar: CompareActivity[];
  scope: CompareScope;
  resting: number | null;
  today: string;
}): Comparison | null {
  if (!usable(current) || similar.length === 0) return null;
  const phrase =
    scope.kind === "planned"
      ? (familyPhrases[scope.family] ?? null)
      : similarPhrase;
  if (!phrase) return null;
  const result = sentence(current, similar, resting);
  if (!result) return null;
  const pace = paceOf(current)!;
  const previousPace = mean(similar.map((item) => paceOf(item)!));
  const samePace = Math.abs(pace - previousPace) <= samePaceSeconds;
  const lead = `Vs ${similar.length === 1 ? phrase.one : phrase.many(similar.length)} : ${samePace && result.tone !== "same" ? "même allure pour " : ""}`;
  const rows = [current, ...similar];
  const repPace = scope.kind === "planned" && current.repPace !== null;
  const columns: Comparison["columns"] = [
    { key: "pace", label: "Allure" },
    { key: "heartRate", label: "FC moy." },
    repPace
      ? { key: "repPace", label: "En rép." }
      : scope.kind === "unplanned"
        ? { key: "distance", label: "km" }
        : null,
  ].filter(
    (column): column is Comparison["columns"][number] => column !== null,
  );
  return {
    lead,
    ...result,
    firstColumn: scope.kind === "planned" ? "Séance" : "Sortie",
    columns,
    rows: rows.map((row) => ({
      id: row.id,
      current: row.id === current.id,
      date: formatActivityDate(row.date, today),
      cells: {
        pace:
          row.distanceMeters && row.durationSeconds
            ? formatPace(row.distanceMeters, row.durationSeconds)
            : null,
        heartRate:
          row.averageHeartRate !== null
            ? String(Math.round(row.averageHeartRate))
            : null,
        repPace: row.repPace !== null ? formatPace(1000, row.repPace) : null,
        distance:
          row.distanceMeters !== null
            ? formatDistance(row.distanceMeters)
            : null,
      },
    })),
  };
}

export function fastLapPace(
  laps: readonly {
    durationSeconds: number | null;
    distanceMeters: number | null;
  }[],
  overallPace: number | null,
) {
  if (overallPace === null || laps.length < 3) return null;
  const fast = laps.filter(
    (lap) =>
      lap.durationSeconds !== null &&
      lap.distanceMeters !== null &&
      lap.distanceMeters > 0 &&
      lap.durationSeconds >= 60 &&
      lap.durationSeconds / (lap.distanceMeters / 1000) <= overallPace * 0.92,
  );
  if (fast.length === 0 || fast.length === laps.length) return null;
  const seconds = fast.reduce((sum, lap) => sum + lap.durationSeconds!, 0);
  const meters = fast.reduce((sum, lap) => sum + lap.distanceMeters!, 0);
  return seconds / (meters / 1000);
}
