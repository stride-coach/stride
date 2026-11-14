import { z } from "zod";

export const todayModes = ["day", "week"] as const;
export type TodayMode = (typeof todayModes)[number];

export const todayModeLabels: Record<TodayMode, string> = {
  day: "Jour",
  week: "Semaine",
};

const first = (value: unknown) => (Array.isArray(value) ? value[0] : value);

const todayModeSchema = z.object({
  view: z.preprocess(first, z.enum(todayModes).catch("day")),
  week: z.preprocess(
    first,
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .catch(null)
      .default(null),
  ),
});

export function parseTodayMode(query: Record<string, unknown>): {
  mode: TodayMode;
  week: string | null;
} {
  const { view, week } = todayModeSchema.parse(query);
  return { mode: view, week };
}

export function todayHref(mode: TodayMode, week?: string | null) {
  if (mode === "day") return "/today";
  const params = new URLSearchParams({ view: "week" });
  if (week) params.set("week", week);
  return `/today?${params.toString()}`;
}
