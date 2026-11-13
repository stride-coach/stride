import { z } from "zod";
import { matchTitle, queryTerms, type MatchRange } from "./match";

export const searchKinds = ["action", "session", "activity", "race"] as const;
export type SearchKind = (typeof searchKinds)[number];
export type EntryKind = Exclude<SearchKind, "action">;

export const minimumQueryLength = 2;
const groupLimit = 3;
const leadingGroupLimit = 5;

export const searchEntrySchema = z.object({
  kind: z.enum(["session", "activity", "race"]),
  id: z.string().min(1),
  title: z.string().min(1),
  detail: z.string(),
  date: z.string().nullable(),
  href: z.string().regex(/^\/(?![/\\])/),
  badge: z.enum(["today", "done"]).nullable(),
});

export const searchIndexSchema = z.object({
  today: z.string(),
  entries: z.array(searchEntrySchema),
});

export type SearchEntry = z.infer<typeof searchEntrySchema>;
export type SearchIndex = z.infer<typeof searchIndexSchema>;

export type SearchAction = {
  kind: "action";
  id: string;
  title: string;
  detail: string;
  date: null;
  href: string;
  badge: null;
};

export type SearchItem = SearchEntry | SearchAction;

export type SearchHit = {
  item: SearchItem;
  score: number;
  ranges: MatchRange[];
};

export type SearchGroup = {
  kind: SearchKind;
  label: string;
  total: number;
  hits: SearchHit[];
  more: { count: number; href: string | null } | null;
};

export const groupLabels: Record<SearchKind, string> = {
  action: "Actions",
  session: "Séances",
  activity: "Activités",
  race: "Courses",
};

export const searchActions: readonly SearchAction[] = [
  {
    kind: "action",
    id: "action:add-race",
    title: "Ajouter une course",
    detail: "Courses",
    date: null,
    href: "/races/new",
    badge: null,
  },
  {
    kind: "action",
    id: "action:add-shoes",
    title: "Ajouter une paire de chaussures",
    detail: "Activités › Matériel",
    date: null,
    href: "/activities/gear/new",
    badge: null,
  },
  {
    kind: "action",
    id: "action:ask-coach",
    title: "Demander au coach",
    detail: "Coach",
    date: null,
    href: "/coach",
    badge: null,
  },
  {
    kind: "action",
    id: "action:import-gear",
    title: "Importer du matériel depuis Garmin",
    detail: "Activités › Matériel",
    date: null,
    href: "/activities/gear/import",
    badge: null,
  },
];

function startsWithVerb(terms: string[]) {
  const [first] = terms;
  if (!first) return false;
  return searchActions.some((action) => {
    const verb = queryTerms(action.title)[0];
    return verb !== undefined && verb.startsWith(first);
  });
}

function upcomingFirst(today: string, left: SearchItem, right: SearchItem) {
  const leftDate = left.date ?? "";
  const rightDate = right.date ?? "";
  const leftUpcoming = leftDate >= today;
  const rightUpcoming = rightDate >= today;
  if (leftUpcoming !== rightUpcoming) return leftUpcoming ? -1 : 1;
  return leftUpcoming
    ? leftDate.localeCompare(rightDate)
    : rightDate.localeCompare(leftDate);
}

function recentFirst(left: SearchItem, right: SearchItem) {
  return (right.date ?? "").localeCompare(left.date ?? "");
}

function orderHits(kind: SearchKind, today: string) {
  return (left: SearchHit, right: SearchHit) => {
    if (left.score !== right.score) return right.score - left.score;
    if (kind === "activity") return recentFirst(left.item, right.item);
    if (kind === "action") return 0;
    return upcomingFirst(today, left.item, right.item);
  };
}

function moreHref(kind: SearchKind, query: string) {
  if (kind !== "activity") return null;
  return `/activities?${new URLSearchParams({ q: query.trim() }).toString()}`;
}

export function searchGroups(
  index: SearchIndex,
  query: string,
  expanded: ReadonlySet<SearchKind> = new Set(),
): SearchGroup[] {
  const terms = queryTerms(query);
  if (query.trim().length < minimumQueryLength || terms.length === 0) return [];
  const kinds = searchKinds.filter(
    (kind) => kind !== "action" || startsWithVerb(terms),
  );
  const items: SearchItem[] = [...searchActions, ...index.entries];
  const groups = kinds.flatMap((kind) => {
    const hits = items
      .filter((item) => item.kind === kind)
      .flatMap((item) => {
        const match = matchTitle(item.title, terms);
        return match ? [{ item, ...match }] : [];
      })
      .sort(orderHits(kind, index.today));
    return hits.length > 0 ? [{ kind, hits }] : [];
  });
  const leading = groups.reduce<(typeof groups)[number] | null>(
    (best, group) =>
      !best || group.hits[0]!.score > best.hits[0]!.score ? group : best,
    null,
  );
  return groups.map((group) => {
    const limit = expanded.has(group.kind)
      ? group.hits.length
      : group === leading
        ? leadingGroupLimit
        : groupLimit;
    const shown = group.hits.slice(0, limit);
    const hidden = group.hits.length - shown.length;
    return {
      kind: group.kind,
      label: groupLabels[group.kind],
      total: group.hits.length,
      hits: shown,
      more:
        hidden > 0
          ? { count: hidden, href: moreHref(group.kind, query) }
          : null,
    };
  });
}

const singularLabels: Record<SearchKind, string> = {
  action: "Action",
  session: "Séance",
  activity: "Activité",
  race: "Course",
};

export function recentDetail(item: Pick<SearchItem, "kind" | "detail">) {
  const lead = item.detail.split(" · ")[0];
  return lead && item.kind !== "action"
    ? `${singularLabels[item.kind]} · ${lead}`
    : singularLabels[item.kind];
}

export function resultCount(groups: readonly SearchGroup[]) {
  return groups.reduce((total, group) => total + group.total, 0);
}

export function moreLabel(count: number) {
  return count === 1 ? "Voir l’autre résultat" : `Voir les ${count} autres`;
}
