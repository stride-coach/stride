import { z } from "zod";
import {
  nutritionTargetsSchema,
  raceNutritionPlanSchema,
  type NutritionTargets,
  type RaceNutritionPlan,
  type Serving,
} from "@/features/fueling/race-plan";
import { formatDuration, formatPace } from "./format";

export const paceFactorRange = { min: 0.8, max: 1.2 } as const;

const consigneSchema = z.string().trim().min(1).max(240);

export const segmentStrategySchema = z.strictObject({
  note: consigneSchema.optional(),
  paceFactor: z
    .number()
    .min(paceFactorRange.min)
    .max(paceFactorRange.max)
    .optional(),
});

export const raceStrategySchema = z.strictObject({
  consignes: z.array(consigneSchema).max(6),
  segments: z.record(z.uuid(), segmentStrategySchema),
});
export type RaceStrategy = z.infer<typeof raceStrategySchema>;
export type SegmentStrategy = z.infer<typeof segmentStrategySchema>;

export const emptyStrategy: RaceStrategy = { consignes: [], segments: {} };

export const strategyColumns = "consignes, segments, revision";

export const strategyRowSchema = z
  .object({
    consignes: z.unknown(),
    segments: z.unknown(),
    revision: z.number().int().positive(),
  })
  .transform((row) => {
    const parsed = raceStrategySchema.safeParse({
      consignes: row.consignes,
      segments: row.segments,
    });
    return {
      ...(parsed.data ?? emptyStrategy),
      revision: row.revision,
    };
  });
export type StoredStrategy = z.output<typeof strategyRowSchema>;

export function paceFactorsOf(strategy: RaceStrategy) {
  const factors: Record<string, number> = {};
  for (const [id, segment] of Object.entries(strategy.segments))
    if (segment.paceFactor !== undefined && segment.paceFactor !== 1)
      factors[id] = segment.paceFactor;
  return factors;
}

export const nutritionProposalSchema = z
  .strictObject({
    targets: nutritionTargetsSchema.optional(),
    plan: raceNutritionPlanSchema.optional(),
  })
  .refine((value) => value.targets || value.plan);
export type NutritionProposal = z.infer<typeof nutritionProposalSchema>;

export const raceProposalKinds = ["strategy", "nutrition"] as const;
export type RaceProposalKind = (typeof raceProposalKinds)[number];

export const raceProposalStatuses = [
  "ready",
  "accepted",
  "rejected",
  "superseded",
  "stale",
] as const;
export type RaceProposalStatus = (typeof raceProposalStatuses)[number];

export const raceProposalColumns =
  "id, race_id, kind, base_revision, title, summary, payload, status, coach_session_id, decided_at, created_at";

export type RaceProposal = {
  id: string;
  raceId: string;
  title: string;
  summary: string | null;
  status: RaceProposalStatus;
  baseRevision: number;
  createdAt: string;
  decidedAt: string | null;
} & (
  | { kind: "strategy"; payload: RaceStrategy }
  | { kind: "nutrition"; payload: NutritionProposal }
);

export const raceProposalRowSchema = z
  .object({
    id: z.uuid(),
    race_id: z.uuid(),
    kind: z.enum(raceProposalKinds),
    base_revision: z.number().int().min(0),
    title: z.string(),
    summary: z.string().nullable(),
    payload: z.unknown(),
    status: z.enum(raceProposalStatuses),
    decided_at: z.string().nullable(),
    created_at: z.string(),
  })
  .transform((row): RaceProposal | null => {
    const base = {
      id: row.id,
      raceId: row.race_id,
      title: row.title,
      summary: row.summary,
      status: row.status,
      baseRevision: row.base_revision,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
    };
    if (row.kind === "strategy") {
      const payload = raceStrategySchema.safeParse(row.payload);
      return payload.success
        ? { ...base, kind: "strategy", payload: payload.data }
        : null;
    }
    const payload = nutritionProposalSchema.safeParse(row.payload);
    return payload.success
      ? { ...base, kind: "nutrition", payload: payload.data }
      : null;
  });

export type ProposalChange = {
  key: string;
  label: string;
  before: string[];
  after: string[];
};

export type ReviewSegment = {
  id: string;
  label: string;
  currentSeconds: number | null;
  proposedSeconds: number | null;
  currentPace: number | null;
  proposedPace: number | null;
};

function sameList(a: readonly string[], b: readonly string[]) {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

function factorText(factor: number | undefined) {
  if (factor === undefined || factor === 1) return "Allure de la simulation";
  const percent = Math.round(Math.abs(factor - 1) * 100);
  return factor > 1 ? `${percent} % plus prudent` : `${percent} % plus rapide`;
}

function timeText(seconds: number | null, pace: number | null) {
  return seconds === null
    ? []
    : [
        `${formatDuration(seconds)}${pace === null ? "" : ` · ${formatPace(pace)} /km en courant`}`,
      ];
}

export function strategyChanges(
  current: RaceStrategy,
  proposed: RaceStrategy,
  segments: readonly ReviewSegment[],
): ProposalChange[] {
  const changes: ProposalChange[] = [];
  if (!sameList(current.consignes, proposed.consignes))
    changes.push({
      key: "consignes",
      label: "Consignes du stratège",
      before: current.consignes,
      after: proposed.consignes,
    });
  for (const segment of segments) {
    const before = current.segments[segment.id] ?? {};
    const after = proposed.segments[segment.id] ?? {};
    if ((before.note ?? null) !== (after.note ?? null))
      changes.push({
        key: `${segment.id}-note`,
        label: `${segment.label} · consigne`,
        before: before.note ? [before.note] : [],
        after: after.note ? [after.note] : [],
      });
    if ((before.paceFactor ?? 1) !== (after.paceFactor ?? 1))
      changes.push({
        key: `${segment.id}-pace`,
        label: `${segment.label} · allure`,
        before: [
          factorText(before.paceFactor),
          ...timeText(segment.currentSeconds, segment.currentPace),
        ],
        after: [
          factorText(after.paceFactor),
          ...timeText(segment.proposedSeconds, segment.proposedPace),
        ],
      });
  }
  return changes;
}

const targetLabels: Record<
  keyof NutritionTargets,
  { label: string; text: (value: never) => string }
> = {
  carbsPerHourG: {
    label: "Glucides par heure",
    text: (value: number) => `${value} g/h`,
  },
  waterMlPerHour: {
    label: "Eau par heure",
    text: (value: number) => `${value} ml/h`,
  },
  sodiumMgPerHour: {
    label: "Sodium par heure",
    text: (value: number) => `${value} mg/h`,
  },
  caffeineMaxMg: {
    label: "Caféine maximum",
    text: (value: number) => `${value} mg`,
  },
  nightCaffeine: {
    label: "Caféine la nuit",
    text: (value: boolean) => (value ? "Oui" : "Non"),
  },
  flaskMl: { label: "Flasques", text: (value: number) => `${value} ml` },
  flaskCount: {
    label: "Nombre de flasques",
    text: (value: number) => String(value),
  },
  bladderMl: {
    label: "Poche à eau",
    text: (value: number | null) => (value === null ? "Aucune" : `${value} ml`),
  },
};

function servingsText(
  servings: readonly Serving[] | undefined,
  names: ReadonlyMap<string, string>,
) {
  return (servings ?? []).map(
    (serving) =>
      `${serving.count} × ${names.get(serving.productId) ?? "Produit retiré"}`,
  );
}

export function nutritionChanges(
  current: { targets: Required<NutritionTargets>; plan: RaceNutritionPlan },
  proposed: NutritionProposal,
  segments: readonly Pick<ReviewSegment, "id" | "label">[],
  names: ReadonlyMap<string, string>,
): ProposalChange[] {
  const changes: ProposalChange[] = [];
  for (const [key, value] of Object.entries(proposed.targets ?? {}) as [
    keyof NutritionTargets,
    never,
  ][]) {
    const before = current.targets[key] as never;
    if (before === value) continue;
    const { label, text } = targetLabels[key];
    changes.push({
      key: `target-${key}`,
      label,
      before: [text(before)],
      after: [text(value)],
    });
  }
  const plan = proposed.plan;
  if (!plan) return changes;
  const startBefore = servingsText(current.plan.start?.pocket, names);
  const startAfter = servingsText(plan.start?.pocket, names);
  if (!sameList(startBefore, startAfter))
    changes.push({
      key: "start",
      label: "Au départ",
      before: startBefore,
      after: startAfter,
    });
  for (const segment of segments) {
    const before = servingsText(
      current.plan.segments[segment.id]?.items,
      names,
    );
    const after = servingsText(plan.segments[segment.id]?.items, names);
    const noteBefore = current.plan.segments[segment.id]?.note;
    const noteAfter = plan.segments[segment.id]?.note;
    if (!sameList(before, after) || noteBefore !== noteAfter)
      changes.push({
        key: `segment-${segment.id}`,
        label: segment.label,
        before: [...before, ...(noteBefore ? [noteBefore] : [])],
        after: [...after, ...(noteAfter ? [noteAfter] : [])],
      });
  }
  const bagBefore = current.plan.dropBag ?? [];
  const bagAfter = plan.dropBag ?? [];
  if (!sameList(bagBefore, bagAfter))
    changes.push({
      key: "drop-bag",
      label: "Sac d’allègement",
      before: bagBefore,
      after: bagAfter,
    });
  return changes;
}

export const proposalStatusLabels: Record<RaceProposalStatus, string> = {
  ready: "À toi de décider",
  accepted: "Acceptée",
  rejected: "Refusée",
  superseded: "Remplacée",
  stale: "Plus applicable",
};

export function changeCountLabel(count: number) {
  return `${count} changement${count > 1 ? "s" : ""} proposé${count > 1 ? "s" : ""}`;
}
