import { z } from "zod";
import type { ThreadEntry } from "./thread";

export const correctionTextLimit = 500;
const excerptLimit = 160;
const contextLimit = 10;

export const correctionInputSchema = z.strictObject({
  itemId: z.string().regex(/^\d{1,18}$/),
  text: z.string().trim().min(1).max(correctionTextLimit),
});

export type CorrectionInput = z.output<typeof correctionInputSchema>;

export type PendingCorrection = { excerpt: string; text: string };

export function excerptOf(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length <= excerptLimit
    ? flat
    : `${flat.slice(0, excerptLimit - 1).trimEnd()}…`;
}

export function correctionContext(corrections: readonly PendingCorrection[]) {
  if (!corrections.length) return null;
  const lines = corrections
    .slice(-contextLimit)
    .map(
      (correction) => `- Sur « ${correction.excerpt} » : ${correction.text}`,
    );
  return [
    "Corrections de l’athlète sur tes messages précédents. Tiens-en compte et ne les contredis pas :",
    ...lines,
  ].join("\n");
}

export function staffCopyText(entry: Extract<ThreadEntry, { type: "staff" }>) {
  const texts = entry.blocks.flatMap((block) =>
    block.type === "text" ? [block.text] : [],
  );
  return texts.length ? texts.join("\n\n") : null;
}

export function correctableItemId(
  entry: Extract<ThreadEntry, { type: "staff" }>,
) {
  return (
    entry.blocks.findLast((block) => block.type === "text" && block.itemId)
      ?.itemId ?? null
  );
}
