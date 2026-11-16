import { z } from "zod";
import type { PlageScale } from "@/components/stride/plage-scale";
import type { HealthModel } from "@/features/progress/health";

export const cardMetrics = ["hrv", "resting_heart_rate"] as const;
export type CardMetric = (typeof cardMetrics)[number];

export const cardMetricDefinitions: Record<
  CardMetric,
  { label: string; unit: string; field: "hrv" | "restingHeartRate" }
> = {
  hrv: { label: "VFC nocturne", unit: "ms", field: "hrv" },
  resting_heart_rate: {
    label: "FC au repos",
    unit: "bpm",
    field: "restingHeartRate",
  },
};

export const cardPositions = ["below", "within", "above"] as const;
export type CardPosition = (typeof cardPositions)[number];

export const cardPositionLabels: Record<CardPosition, string> = {
  below: "Sous ta plage",
  within: "Dans ta plage",
  above: "Au-dessus de ta plage",
};

export const linkDestinations = [
  "add_race",
  "calendar",
  "plan",
  "races",
  "recovery",
  "today",
] as const;
export type LinkDestination = (typeof linkDestinations)[number];

export const linkTargets: Record<
  LinkDestination,
  { label: string; href: string }
> = {
  add_race: { label: "Ajouter la course", href: "/races/new" },
  calendar: { label: "Voir le calendrier", href: "/plan/calendar" },
  plan: { label: "Voir le plan", href: "/plan" },
  races: { label: "Voir mes courses", href: "/races" },
  recovery: { label: "Voir ma récupération", href: "/health/recovery" },
  today: { label: "Voir aujourd’hui", href: "/today" },
};

export const maxChoices = 3;
export const maxLinks = 2;
export const maxReplies = 3;
export const choiceLength = 40;
export const replyLength = 40;

const finite = z.number().finite();

export const dataCardSchema = z
  .object({
    metric: z.enum(cardMetrics),
    value: finite,
    low: finite,
    high: finite,
    position: z.enum(cardPositions),
    day: z.iso.date(),
  })
  .refine((card) => card.low < card.high, "invalid range")
  .refine((card) => card.position === cardPosition(card), "invalid position");

export type DataCard = z.output<typeof dataCardSchema>;

function cardPosition(card: { value: number; low: number; high: number }) {
  return card.value < card.low
    ? "below"
    : card.value > card.high
      ? "above"
      : "within";
}

const text = (max: number) => z.string().trim().min(1).max(max);

function onlyValid<Schema extends z.ZodType>(schema: Schema, limit: number) {
  return z
    .array(z.unknown())
    .transform((values) =>
      values.flatMap((value) => {
        const parsed = schema.safeParse(value);
        return parsed.success ? [parsed.data as z.output<Schema>] : [];
      }),
    )
    .transform((values) => [...new Set(values)].slice(0, limit))
    .catch([] as z.output<Schema>[]);
}

export const blocksBodySchema = z.object({
  card: dataCardSchema.nullable().catch(null),
  choices: onlyValid(text(choiceLength), maxChoices),
  links: onlyValid(z.enum(linkDestinations), maxLinks),
  replies: onlyValid(text(replyLength), maxReplies),
});

export const blocksInputSchema = z
  .strictObject({
    card: z
      .enum(cardMetrics)
      .optional()
      .describe(
        "A measure to show as a card with its value and the athlete's personal range. Only the measure is named: Stride fills the value and the range from the athlete's stored data, and drops the card when none is stored.",
      ),
    choices: z
      .array(text(choiceLength))
      .min(2)
      .max(maxChoices)
      .optional()
      .describe(
        "Two or three short French answers the athlete can pick, shown as buttons under your message. A click sends the button's label as the athlete's reply.",
      ),
    links: z
      .array(z.enum(linkDestinations))
      .min(1)
      .max(maxLinks)
      .optional()
      .describe(
        "Screens to offer as links closing your message. Labels and addresses are fixed by Stride.",
      ),
    replies: z
      .array(text(replyLength))
      .min(1)
      .max(maxReplies)
      .optional()
      .describe(
        "One to three short French replies the athlete is likely to send next, offered above the composer. Omit when none is useful.",
      ),
  })
  .refine(
    (value) => Object.values(value).some((entry) => entry !== undefined),
    "Provide at least one block.",
  );

export type BlocksInput = z.output<typeof blocksInputSchema>;

export type ResolvedBlocks = {
  card: DataCard | null;
  choices: string[];
  links: LinkDestination[];
  replies: string[];
};

export const blockKinds = ["card", "choices", "links", "replies"] as const;
export type BlockKind = (typeof blockKinds)[number];

export function resolveCard(
  metric: CardMetric,
  model: Pick<HealthModel, "hrv" | "restingHeartRate">,
): DataCard | null {
  const reading = model[cardMetricDefinitions[metric].field];
  if (!reading || !reading.range) return null;
  const card = {
    metric,
    value: reading.last,
    low: reading.range.low,
    high: reading.range.high,
    position: cardPosition({
      value: reading.last,
      low: reading.range.low,
      high: reading.range.high,
    }),
    day: reading.lastDay,
  };
  const parsed = dataCardSchema.safeParse(card);
  return parsed.success ? parsed.data : null;
}

export function resolveBlocks(
  input: BlocksInput,
  card: DataCard | null,
): { blocks: ResolvedBlocks; shown: BlockKind[]; dropped: BlockKind[] } {
  const blocks: ResolvedBlocks = {
    card,
    choices: [...new Set(input.choices ?? [])],
    links: [...new Set(input.links ?? [])],
    replies: [...new Set(input.replies ?? [])],
  };
  const shown = blockKinds.filter((kind) =>
    kind === "card" ? card !== null : blocks[kind].length > 0,
  );
  const dropped: BlockKind[] =
    input.card !== undefined && card === null ? ["card"] : [];
  return { blocks, shown, dropped };
}

export function cardScale(card: DataCard): PlageScale {
  const pad = (card.high - card.low) * 0.75;
  return {
    min: Math.min(card.low, card.value) - pad,
    max: Math.max(card.high, card.value) + pad,
    low: card.low,
    high: card.high,
    value: card.value,
  };
}

const number = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function cardText(card: DataCard) {
  const { unit } = cardMetricDefinitions[card.metric];
  return {
    label: cardMetricDefinitions[card.metric].label,
    value: `${number.format(card.value)} ${unit}`,
    range: `${number.format(card.low)}–${number.format(card.high)} ${unit}`,
    verdict: cardPositionLabels[card.position],
  };
}
