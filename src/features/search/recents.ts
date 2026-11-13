import { z } from "zod";

const openedLimit = 5;
const queryLimit = 3;
const shownLimit = 3;

const openedSchema = z.object({
  type: z.literal("item"),
  kind: z.enum(["action", "session", "activity", "race"]),
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string(),
  href: z.string().regex(/^\/(?![/\\])/),
  at: z.number(),
});

const querySchema = z.object({
  type: z.literal("query"),
  query: z.string().min(1),
  count: z.number().int().min(0),
  at: z.number(),
});

export const recentsSchema = z.object({
  opened: z.array(openedSchema).catch([]),
  queries: z.array(querySchema).catch([]),
});

export type RecentItem = z.infer<typeof openedSchema>;
export type RecentQuery = z.infer<typeof querySchema>;
export type Recents = z.infer<typeof recentsSchema>;
export type Recent = RecentItem | RecentQuery;

export const emptyRecents: Recents = { opened: [], queries: [] };

export function parseRecents(raw: string | null): Recents {
  if (!raw) return emptyRecents;
  try {
    return recentsSchema.catch(emptyRecents).parse(JSON.parse(raw));
  } catch {
    return emptyRecents;
  }
}

export function rememberItem(
  recents: Recents,
  item: Omit<RecentItem, "type" | "at">,
  at: number,
): Recents {
  return {
    ...recents,
    opened: [
      { type: "item" as const, ...item, at },
      ...recents.opened.filter((entry) => entry.id !== item.id),
    ].slice(0, openedLimit),
  };
}

export function rememberQuery(
  recents: Recents,
  query: string,
  count: number,
  at: number,
): Recents {
  const text = query.trim();
  if (!text) return recents;
  const key = text.toLocaleLowerCase("fr-FR");
  return {
    ...recents,
    queries: [
      { type: "query" as const, query: text, count, at },
      ...recents.queries.filter(
        (entry) => entry.query.toLocaleLowerCase("fr-FR") !== key,
      ),
    ].slice(0, queryLimit),
  };
}

export function latestRecents(recents: Recents): Recent[] {
  return [...recents.opened, ...recents.queries]
    .sort((left, right) => right.at - left.at)
    .slice(0, shownLimit);
}

export function recentQueryDetail(count: number) {
  if (count === 0) return "Recherche · aucun résultat";
  return `Recherche · ${count} résultat${count > 1 ? "s" : ""}`;
}
