import { z } from "zod";
import { formatResultTime } from "./results";

const yearPattern = /\b(19|20)\d{2}\b/;
const roundingSeconds = 300;

export function editionName(name: string, year: string) {
  return yearPattern.test(name) ? name.replace(yearPattern, year) : name;
}

export function redoTarget({
  year,
  resultSeconds,
  targetSeconds,
}: {
  year: string;
  resultSeconds: number | null;
  targetSeconds: number | null;
}) {
  if (resultSeconds !== null)
    return {
      seconds: Math.round(resultSeconds / roundingSeconds) * roundingSeconds,
      reason: `Ton temps de ${year} (${formatResultTime(resultSeconds)}), arrondi à 5 minutes.`,
    };
  if (targetSeconds !== null)
    return { seconds: targetSeconds, reason: `Ton objectif de ${year}.` };
  return null;
}

export const redoInputSchema = z.object({
  sourceId: z.uuid(),
  date: z.iso.date(),
  priority: z.enum(["A", "B", "C"]),
  targetSeconds: z.number().int().min(60).max(1_209_599).nullable(),
  course: z.boolean(),
  nutrition: z.boolean(),
  gear: z.boolean(),
});

export type RedoInput = z.infer<typeof redoInputSchema>;
