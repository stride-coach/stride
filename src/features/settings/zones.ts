import type { HeartRateZones } from "@/features/onboarding/heart-rate-zones";
import { intensities, type Intensity } from "@/features/plans/model/structure";
import {
  intensityPaces,
  type PaceSourceKind,
  type TargetConfidence,
  type TrainingTargets,
} from "@/features/plans/targets/targets";
import { intensityLabels } from "@/features/plans/view/format";
import { formatPace } from "@/features/progress/format";

export const heartRateZoneNames = [
  "Récupération",
  "Endurance",
  "Tempo",
  "Seuil",
  "VO₂ max",
];

const paceSourceLabels: Record<PaceSourceKind, string> = {
  flat_laps: "Seuil mesuré sur tes tours à plat",
  garmin_lactate_threshold: "Seuil lactique Garmin",
  best_effort: "D’après ton meilleur effort récent",
  vo2max: "D’après ta VO₂ max Garmin",
};

const confidenceLabels: Record<TargetConfidence, string> = {
  high: "confiance élevée",
  medium: "confiance moyenne",
  low: "confiance faible",
};

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

function frenchDate(iso: string) {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

export function heartRateZoneSource(zones: HeartRateZones) {
  const maximum = `FC max ${integer.format(zones.maximum)}`;
  return zones.method === "karvonen" && zones.resting !== null
    ? `Karvonen · ${maximum} · FC repos ${integer.format(zones.resting)} sur 28 jours`
    : `% de la FC max · ${maximum}`;
}

export type PaceZoneRow = {
  intensity: Intensity;
  label: string;
  range: string;
};
export type PaceZones = {
  rows: PaceZoneRow[];
  threshold: string | null;
  source: string | null;
};

export function paceZones(targets: TrainingTargets): PaceZones | null {
  const rows = intensities.flatMap((intensity) => {
    const range = targets.intensities[intensity].paceRange;
    return range
      ? [
          {
            intensity,
            label: intensityLabels[intensity],
            range: `${formatPace(range.fastSecondsPerKm)}–${formatPace(range.slowSecondsPerKm)}`,
          },
        ]
      : [];
  });
  if (rows.length === 0) return null;
  const threshold = intensityPaces(targets).threshold;
  const source = intensities
    .map((intensity) => targets.intensities[intensity].paceSource)
    .find((item) => item !== null);
  return {
    rows,
    threshold: threshold === undefined ? null : formatPace(threshold),
    source: source
      ? `${paceSourceLabels[source.kind]} · ${frenchDate(source.asOf)} · ${confidenceLabels[source.confidence]}`
      : null,
  };
}
