import { z } from "zod";
import { messagesLabel, staffMessages } from "./conversations";
import type { ThreadItem } from "./items";
import { markdownPlainText } from "./markdown";
import { staff, type StaffAgent } from "./staff";
import { decisionsLabel, type TopicSummary } from "./topics";

export const searchScopes = ["main", "topics", "decisions"] as const;
export type SearchScope = (typeof searchScopes)[number];
export const defaultSearchScopes: readonly SearchScope[] = ["main", "topics"];

export const minSearchLength = 2;
export const searchItemLimit = 5000;

export const searchableKinds = [
  "athlete",
  "answer",
  "coach",
  "consult_request",
  "consult_reply",
  "staff_message",
  "question",
  "proposal",
  "topic_summary",
] as const satisfies readonly ThreadItem["kind"][];

export const messageKinds = [
  "athlete",
  "answer",
  "coach",
  "consult_reply",
  "staff_message",
  "question",
  "proposal",
  "topic_summary",
  "error",
] as const satisfies readonly ThreadItem["kind"][];

export type MatchRange = readonly [start: number, end: number];

function fold(text: string) {
  let folded = "";
  const origin: number[] = [];
  let index = 0;
  for (const char of text) {
    const simple = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
    for (let unit = 0; unit < simple.length; unit += 1) origin.push(index);
    folded += simple;
    index += char.length;
  }
  origin.push(index);
  return { folded, origin };
}

export function foldText(text: string) {
  return fold(text).folded;
}

export function searchQuery(raw: string | null | undefined) {
  const query = (raw ?? "").replace(/\s+/g, " ").trim();
  return foldText(query).length >= minSearchLength ? query : null;
}

export function findMatches(text: string, query: string): MatchRange[] {
  const needle = foldText(query);
  if (!needle) return [];
  const { folded, origin } = fold(text);
  const ranges: MatchRange[] = [];
  let from = folded.indexOf(needle);
  while (from !== -1) {
    const end = from + needle.length;
    const start = origin[from];
    let stop = end;
    while (stop < origin.length - 1 && origin[stop] === origin[end - 1])
      stop += 1;
    ranges.push([start, origin[stop]]);
    from = folded.indexOf(needle, end);
  }
  return ranges;
}

export type TextPart = { text: string; match: boolean };

export function splitMatches(text: string, query: string | null): TextPart[] {
  if (!query) return [{ text, match: false }];
  const parts: TextPart[] = [];
  let last = 0;
  for (const [start, end] of findMatches(text, query)) {
    if (start > last)
      parts.push({ text: text.slice(last, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    last = end;
  }
  if (last < text.length) parts.push({ text: text.slice(last), match: false });
  return parts;
}

const excerptBefore = 32;
const excerptAfter = 64;

export function excerpt(text: string, query: string) {
  const flat = text.replace(/\s+/g, " ");
  const [range] = findMatches(flat, query);
  if (!range) return flat.trim();
  const [start, end] = range;
  let from = Math.max(0, start - excerptBefore);
  let to = Math.min(flat.length, end + excerptAfter);
  if (from > 0) {
    const space = flat.indexOf(" ", from);
    if (space !== -1 && space < start) from = space + 1;
  }
  if (to < flat.length) {
    const space = flat.lastIndexOf(" ", to);
    if (space > end) to = space;
  }
  return `${from > 0 ? "…" : ""}${flat.slice(from, to).trim()}${to < flat.length ? "…" : ""}`;
}

export type SearchAuthor = StaffAgent | "athlete";

type Field = { text: string; decision: boolean };

function searchFields(
  item: ThreadItem,
  shown: ReadonlySet<ThreadItem>,
): { author: SearchAuthor; fields: Field[] } | null {
  const plain = (text: string) => ({
    text: markdownPlainText(text),
    decision: false,
  });
  switch (item.kind) {
    case "athlete":
    case "answer":
      return {
        author: "athlete",
        fields: [{ text: item.text, decision: false }],
      };
    case "coach":
      return { author: "coach", fields: [plain(item.text)] };
    case "staff_message":
      return { author: item.agent, fields: [plain(item.text)] };
    case "consult_reply":
      return shown.has(item)
        ? { author: item.agent, fields: [plain(item.text)] }
        : null;
    case "question":
      return {
        author: item.askedFor,
        fields: [{ text: item.question, decision: false }],
      };
    case "proposal":
      return {
        author: item.agent ?? "coach",
        fields: [
          { text: item.title, decision: true },
          ...(item.summary ? [{ text: item.summary, decision: true }] : []),
        ],
      };
    case "topic_summary":
      return {
        author: item.lead,
        fields: [
          ...(item.summary ? [{ text: item.summary, decision: false }] : []),
          ...item.decisions.map((decision) => ({
            text: decision.title,
            decision: true,
          })),
        ],
      };
    default:
      return null;
  }
}

export type SearchConversation =
  | { kind: "main" }
  | { kind: "topic"; id: string; title: string; closed: boolean };

export type SearchResult = {
  id: string;
  topicId: string | null;
  at: string;
  author: SearchAuthor;
  excerpt: string;
  decision: boolean;
};

export function searchConversation(
  items: readonly ThreadItem[],
  topicId: string | null,
  query: string,
): SearchResult[] {
  const shown = staffMessages(items);
  return items.flatMap((item) => {
    if (!item.id) return [];
    const searchable = searchFields(item, shown);
    if (!searchable) return [];
    let found: Field | null = null;
    let decision = false;
    for (const field of searchable.fields) {
      const [range] = findMatches(field.text, query);
      if (!range) continue;
      found ??= field;
      decision ||= field.decision;
    }
    if (!found) return [];
    return [
      {
        id: item.id,
        topicId,
        at: item.at,
        author: searchable.author,
        excerpt: excerpt(found.text, query),
        decision,
      },
    ];
  });
}

export function orderResults(results: readonly SearchResult[]) {
  return [...results].sort(
    (a, b) => a.at.localeCompare(b.at) || Number(a.id) - Number(b.id),
  );
}

export function filterResults(
  results: readonly SearchResult[],
  scopes: readonly SearchScope[],
) {
  return results.filter(
    (result) =>
      (scopes.includes("main") && result.topicId === null) ||
      (scopes.includes("topics") && result.topicId !== null) ||
      (scopes.includes("decisions") && result.decision),
  );
}

export function currentResultIndex(
  results: readonly SearchResult[],
  at: string | null,
) {
  if (!results.length) return -1;
  const index = at ? results.findIndex((result) => result.id === at) : -1;
  return index === -1 ? results.length - 1 : index;
}

export function stepResult(
  results: readonly SearchResult[],
  index: number,
  direction: "older" | "newer",
) {
  const next = direction === "older" ? index - 1 : index + 1;
  return results[next] ?? null;
}

export function counterLabel(index: number, total: number) {
  return `${index + 1} sur ${total}`;
}

export function resultsHeading(total: number, query: string) {
  if (total === 0) return `Aucun résultat pour « ${query} »`;
  return `${total === 1 ? "1 résultat" : `${total} résultats`} pour « ${query} »`;
}

export function authorLabel(author: SearchAuthor) {
  return author === "athlete" ? "Toi" : staff[author].name;
}

export function resultDateLabel(iso: string, now: Date, timeZone: string) {
  const date = new Date(iso);
  const year = new Intl.DateTimeFormat("fr-FR", { year: "numeric", timeZone });
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    ...(year.format(date) === year.format(now)
      ? {}
      : { year: "numeric" as const }),
    timeZone,
  }).format(date);
}

export type SearchRow =
  | { type: "result"; key: string; result: SearchResult }
  | {
      type: "closed_topic";
      key: string;
      topicId: string;
      title: string;
      meta: string;
      results: SearchResult[];
      result: SearchResult;
    };

export function searchRows(
  results: readonly SearchResult[],
  topics: readonly Pick<
    TopicSummary,
    "id" | "title" | "closedAt" | "messages" | "decisions"
  >[],
): SearchRow[] {
  const closed = new Map(
    topics
      .filter((topic) => topic.closedAt !== null)
      .map((topic) => [topic.id, topic]),
  );
  const rows: SearchRow[] = [];
  const groups = new Map<
    string,
    Extract<SearchRow, { type: "closed_topic" }>
  >();
  for (const result of [...results].reverse()) {
    const topic = result.topicId ? closed.get(result.topicId) : undefined;
    if (!topic) {
      rows.push({ type: "result", key: result.id, result });
      continue;
    }
    const group = groups.get(topic.id);
    if (group) {
      group.results.push(result);
      continue;
    }
    const created: Extract<SearchRow, { type: "closed_topic" }> = {
      type: "closed_topic",
      key: `topic-${topic.id}`,
      topicId: topic.id,
      title: `Sujet clos · ${topic.title}`,
      meta: [
        messagesLabel(topic.messages),
        topic.decisions > 0 ? decisionsLabel(topic.decisions) : "",
      ]
        .filter(Boolean)
        .join(", "),
      results: [result],
      result,
    };
    groups.set(topic.id, created);
    rows.push(created);
  }
  return rows;
}

export const visibleSearchRows = 4;

const scopeListSchema = z
  .string()
  .transform((value) => value.split(","))
  .pipe(z.array(z.enum(searchScopes)).min(1));

export type SearchParams = {
  open: boolean;
  query: string;
  at: string | null;
  scopes: SearchScope[];
  date: string | null;
};

const dateSchema = z.iso.date();
const itemIdSchema = z.string().regex(/^\d{1,19}$/);

function single(value: string | string[] | undefined) {
  return typeof value === "string" ? value : null;
}

export function parseSearchParams(
  params: Record<string, string | string[] | undefined>,
): SearchParams {
  const query = single(params.q);
  const scopes = scopeListSchema.safeParse(single(params.scope) ?? "");
  const at = itemIdSchema.safeParse(single(params.at));
  const date = dateSchema.safeParse(single(params.date));
  return {
    open: query !== null,
    query: (query ?? "").slice(0, 200),
    at: at.success ? at.data : null,
    scopes: scopes.success
      ? searchScopes.filter((scope) => scopes.data.includes(scope))
      : [...defaultSearchScopes],
    date: date.success ? date.data : null,
  };
}

export function searchHref(input: {
  topicId: string | null;
  query: string;
  scopes: readonly SearchScope[];
  at?: string | null;
  date?: string | null;
}) {
  const params = new URLSearchParams({ q: input.query });
  if (input.at) params.set("at", input.at);
  if (
    input.scopes.length !== defaultSearchScopes.length ||
    !defaultSearchScopes.every((scope) => input.scopes.includes(scope))
  )
    params.set("scope", input.scopes.join(","));
  if (input.date) params.set("date", input.date);
  return `${input.topicId ? `/coach/${input.topicId}` : "/coach"}?${params}`;
}

export function resultHref(
  result: SearchResult,
  query: string,
  scopes: readonly SearchScope[],
) {
  return searchHref({ topicId: result.topicId, query, scopes, at: result.id });
}

export type ThreadAnchor =
  { kind: "item"; id: string } | { kind: "date"; date: string };

export function threadAnchor(search: SearchParams | null): ThreadAnchor | null {
  if (!search?.open) return null;
  if (search.date) return { kind: "date", date: search.date };
  if (search.at) return { kind: "item", id: search.at };
  return null;
}
