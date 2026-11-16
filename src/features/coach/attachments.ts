import { sessionPanelHref } from "@/features/plans/view/session-href";
import { z } from "zod";
import { recoveryPath } from "@/features/progress/health";
import { healthTopicSchema } from "./health-attachments";

export const attachmentKinds = [
  "session",
  "activity",
  "race",
  "health",
  "file",
] as const;
export type AttachmentKind = (typeof attachmentKinds)[number];

export const maxAttachments = 3;

export const coachAttachmentSchema = z.discriminatedUnion("kind", [
  z.strictObject({
    kind: z.literal("session"),
    id: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  }),
  z.strictObject({ kind: z.literal("activity"), id: z.uuid() }),
  z.strictObject({ kind: z.literal("race"), id: z.uuid() }),
  z.strictObject({ kind: z.literal("health"), id: healthTopicSchema }),
  z.strictObject({ kind: z.literal("file"), id: z.uuid() }),
]);

export const coachAttachmentsSchema = z
  .array(coachAttachmentSchema)
  .max(maxAttachments);

export type AttachmentRef = z.output<typeof coachAttachmentSchema>;

export type AttachmentKey = { kind: AttachmentKind; id: string };

export const sentAttachmentSchema = z.object({
  kind: z.enum(attachmentKinds),
  id: z.string().max(64),
  title: z.string().max(120),
  date: z.iso.date().nullable(),
});

export type SentAttachment = z.output<typeof sentAttachmentSchema>;

export type AttachmentOption = SentAttachment & {
  distanceKm: number | null;
  elevationGainM: number | null;
  detail?: string | null;
};

export type AttachmentOptions = Record<
  "session" | "activity" | "race",
  AttachmentOption[]
> &
  Partial<Record<"health" | "file", AttachmentOption[]>>;

export function optionsOf(options: AttachmentOptions, kind: AttachmentKind) {
  return options[kind] ?? [];
}

export type AttachmentGroup = { label: string; options: AttachmentOption[] };

export const attachmentTabLabels: Record<AttachmentKind, string> = {
  session: "Séances",
  activity: "Activités",
  race: "Courses",
  health: "Santé",
  file: "Fichier",
};

export const attachmentEmptyLabels: Record<AttachmentKind, string> = {
  session: "Aucune séance prévue autour d’aujourd’hui dans ton plan actif.",
  activity: "Aucune activité importée pour l’instant.",
  race: "Aucune course enregistrée pour l’instant.",
  health: "Aucune donnée de santé importée pour l’instant.",
  file: "Aucun fichier joint pour l’instant.",
};

export const attachmentMenuLabels: Record<AttachmentKind, string> = {
  session: "Une séance",
  activity: "Une activité",
  race: "Une course",
  health: "Une donnée de santé",
  file: "Une photo ou un fichier",
};

export const attachmentMenuHints: Record<AttachmentKind, string> = {
  session: "Séances du plan",
  activity: "Activités importées",
  race: "Tes courses",
  health: "VFC, sommeil…",
  file: "GPX, capture",
};

const dayMs = 86_400_000;
const shortDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const weekdayDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});
const kilometers = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});
const meters = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

const utc = (iso: string) => new Date(`${iso}T00:00:00Z`);

export function sameAttachment(left: AttachmentKey, right: AttachmentKey) {
  return left.kind === right.kind && left.id === right.id;
}

export function dedupeAttachments<Item extends AttachmentKey>(
  items: readonly Item[],
): Item[] {
  return items.filter(
    (item, index) =>
      items.findIndex((other) => sameAttachment(other, item)) === index,
  );
}

export function toggleAttachment<Item extends AttachmentKey>(
  items: readonly Item[],
  item: Item,
): Item[] {
  if (items.some((other) => sameAttachment(other, item)))
    return items.filter((other) => !sameAttachment(other, item));
  if (items.length >= maxAttachments) return [...items];
  return dedupeAttachments([...items, item]);
}

export function attachmentRefs(items: readonly AttachmentKey[]) {
  return dedupeAttachments(items).map(({ kind, id }) => ({ kind, id }));
}

export function attachmentHref(item: AttachmentKey) {
  if (item.kind === "file") return null;
  if (item.kind === "health") return recoveryPath;
  if (item.kind === "session") return sessionPanelHref(item.id);
  const id = encodeURIComponent(item.id);
  if (item.kind === "activity") return `/activities/${id}`;
  return `/races/${id}`;
}

export function attachmentDate(date: string | null) {
  return date ? shortDate.format(utc(date)) : null;
}

function weekStart(iso: string) {
  const date = utc(iso);
  const day = date.getUTCDay();
  return date.getTime() - ((day + 6) % 7) * dayMs;
}

function distance(value: number | null) {
  return value !== null && value > 0 ? `${kilometers.format(value)} km` : null;
}

function elevation(value: number | null) {
  return value !== null && value >= 1
    ? `${meters.format(Math.round(value))} m D+`
    : null;
}

export function attachmentMeta(option: AttachmentOption, today: string) {
  const parts = [option.date ? weekdayDate.format(utc(option.date)) : null];
  if (option.kind === "session") {
    if (option.date && option.date >= today) parts.push("prévue");
  } else if (option.kind === "health" || option.kind === "file")
    parts.push(option.detail ?? null);
  else
    parts.push(distance(option.distanceKm), elevation(option.elevationGainM));
  return parts.filter((part) => part !== null).join(" · ");
}

function upcomingFirst(options: readonly AttachmentOption[], today: string) {
  const upcoming = options
    .filter((option) => option.date === null || option.date >= today)
    .sort((left, right) =>
      (left.date ?? "9999-12-31").localeCompare(right.date ?? "9999-12-31"),
    );
  const past = options
    .filter((option) => option.date !== null && option.date < today)
    .sort((left, right) => right.date!.localeCompare(left.date!));
  return [
    { label: "À venir", options: upcoming },
    { label: "Passées", options: past },
  ].filter((group) => group.options.length > 0);
}

function weekLabel(date: string, today: string) {
  const weeks = Math.round((weekStart(today) - weekStart(date)) / (7 * dayMs));
  if (weeks <= 0) return "Cette semaine";
  if (weeks === 1) return "Semaine dernière";
  return `Semaine du ${shortDate.format(new Date(weekStart(date)))}`;
}

export function attachmentGroups(
  kind: AttachmentKind,
  options: readonly AttachmentOption[],
  today: string,
): AttachmentGroup[] {
  if (kind !== "activity") return upcomingFirst(options, today);
  const groups: AttachmentGroup[] = [];
  for (const option of [...options].sort((left, right) =>
    (right.date ?? "").localeCompare(left.date ?? ""),
  )) {
    const label = option.date ? weekLabel(option.date, today) : "Sans date";
    const group = groups.at(-1);
    if (group?.label === label) group.options.push(option);
    else groups.push({ label, options: [option] });
  }
  return groups;
}

export function attachmentCountLabel(count: number) {
  if (count >= maxAttachments) return `${maxAttachments} éléments au plus`;
  if (count === 0) return `Aucun élément joint sur ${maxAttachments}`;
  return count === 1
    ? `1 élément joint sur ${maxAttachments}`
    : `${count} éléments joints sur ${maxAttachments}`;
}

export function attachmentSuggestion(
  kind: AttachmentKind,
  options: readonly AttachmentOption[],
  today: string,
) {
  const [first] = attachmentGroups(kind, options, today).flatMap(
    (group) => group.options,
  );
  if (!first) return attachmentMenuHints[kind];
  if (kind === "health" || kind === "file")
    return [first.title, first.detail].filter(Boolean).join(" · ");
  return first.title;
}
