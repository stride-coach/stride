import { describe, expect, it } from "vitest";
import type { ThreadItem } from "../../src/features/coach/items";
import {
  counterLabel,
  currentResultIndex,
  excerpt,
  filterResults,
  findMatches,
  orderResults,
  parseSearchParams,
  resultDateLabel,
  resultHref,
  resultsHeading,
  searchConversation,
  searchHref,
  searchQuery,
  searchRows,
  splitMatches,
  stepResult,
  threadAnchor,
  type SearchResult,
} from "../../src/features/coach/search";

const tz = "Europe/Paris";
const topicId = "c0000000-0000-4000-8000-0000000000c1";
const proposalId = "d0000000-0000-4000-8000-00000000000a";
const at = (day: number, minute = 0) =>
  `2026-09-${String(day).padStart(2, "0")}T06:${String(minute).padStart(2, "0")}:00Z`;

const main: ThreadItem[] = [
  {
    kind: "athlete",
    id: "10",
    at: at(18),
    text: "Mon tendon tire un peu en descente depuis dimanche.",
    consult: null,
    attachments: [],
  },
  {
    kind: "staff_message",
    id: "11",
    at: at(18, 1),
    thread: "sthr_a",
    agent: "medical",
    text: "Merci de le dire tôt. Trois questions rapides sur ton **tendon**.",
  },
  {
    kind: "coach",
    id: "12",
    at: at(21),
    text: "Je garde un œil sur ton énergie et ton Tendon.",
  },
];

const topic: ThreadItem[] = [
  {
    kind: "athlete",
    id: "3",
    at: at(7),
    text: "Le tendon d’Achille me gêne.",
    consult: null,
    attachments: [],
  },
  {
    kind: "consult_request",
    id: "4",
    at: at(7, 1),
    thread: "sthr_b",
    agent: "medical",
    text: "Regarde son tendon.",
  },
  {
    kind: "staff_message",
    id: "5",
    at: at(7, 2),
    thread: "sthr_b",
    agent: "medical",
    text: "Comment réagit ton tendon ?",
  },
  {
    kind: "consult_reply",
    id: "6",
    at: at(7, 3),
    thread: "sthr_b",
    agent: "medical",
    text: "Note interne sur le tendon.",
  },
];

function results(query: string) {
  return orderResults([
    ...searchConversation(main, null, query),
    ...searchConversation(topic, topicId, query),
  ]);
}

const closedTopic = {
  id: topicId,
  title: "Tendon d’Achille en descente",
  closedAt: at(8),
  messages: 11,
  decisions: 2,
};

describe("coach search matching", () => {
  it("ignores case and accents in both directions", () => {
    expect(findMatches("Ton énergie baisse", "ENERGIE")).toEqual([[4, 11]]);
    expect(findMatches("Ton energie baisse", "énergie")).toEqual([[4, 11]]);
    expect(splitMatches("Énergie basse", "energie")).toEqual([
      { text: "Énergie", match: true },
      { text: " basse", match: false },
    ]);
  });

  it("keeps decomposed accents inside the highlighted range", () => {
    const text = "énergie";
    expect(findMatches(text, "energie")).toEqual([[0, text.length]]);
  });

  it("matches wildcards and punctuation literally", () => {
    expect(findMatches("Baisse de 10% cette semaine", "10%")).toEqual([
      [10, 13],
    ]);
    expect(findMatches("Baisse de 10 cette semaine", "10%")).toEqual([]);
    expect(findMatches("le fichier a_b est prêt", "a_b")).toEqual([[11, 14]]);
    expect(findMatches("le fichier axb est prêt", "a_b")).toEqual([]);
    expect(findMatches("un point (.*) ici", ".*")).toEqual([[10, 12]]);
  });

  it("needs at least two characters", () => {
    expect(searchQuery("t")).toBeNull();
    expect(searchQuery("  t  ")).toBeNull();
    expect(searchQuery("")).toBeNull();
    expect(searchQuery("  te   nd ")).toBe("te nd");
  });

  it("builds a short excerpt around the match across paragraphs", () => {
    const text =
      "Deux jours sans gêne.\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\nOn reprend les descentes, à allure facile. Je garde un œil sur ton tendon jusqu’à la fin du mois, puis on reparle de la suite.";
    const line = excerpt(text, "tendon");
    expect(line.startsWith("…")).toBe(true);
    expect(line).toContain("ton tendon jusqu’à");
    expect(line).not.toContain("\n");
  });
});

describe("coach search results", () => {
  it("counts the main thread and a closed topic, grouping the topic in the panel", () => {
    const found = results("tendon");
    expect(found.map((result) => result.id)).toEqual([
      "3",
      "5",
      "10",
      "11",
      "12",
    ]);
    expect(found.map((result) => result.topicId)).toEqual([
      topicId,
      topicId,
      null,
      null,
      null,
    ]);
    const rows = searchRows(found, [closedTopic]);
    expect(rows.map((row) => row.type)).toEqual([
      "result",
      "result",
      "result",
      "closed_topic",
    ]);
    const group = rows[3];
    expect(group).toMatchObject({
      title: "Sujet clos · Tendon d’Achille en descente",
      meta: "11 messages, 2 décisions",
      result: { id: "5" },
    });
  });

  it("shows open topic results one by one", () => {
    const rows = searchRows(results("tendon"), [
      { ...closedTopic, closedAt: null },
    ]);
    expect(rows.every((row) => row.type === "result")).toBe(true);
  });

  it("names the author and searches markdown as plain text", () => {
    const [, , athlete, medical] = results("tendon");
    expect(athlete.author).toBe("athlete");
    expect(medical.author).toBe("medical");
    expect(medical.excerpt).toContain("ton tendon");
    expect(medical.excerpt).not.toContain("**");
  });

  it("never searches consult requests or a hidden consult reply", () => {
    const ids = results("tendon").map((result) => result.id);
    expect(ids).not.toContain("4");
    expect(ids).not.toContain("6");
  });

  it("filters decisions to proposals and topic-summary decisions", () => {
    const items: ThreadItem[] = [
      {
        kind: "coach",
        id: "20",
        at: at(10),
        text: "On prépare le marathon ensemble.",
      },
      {
        kind: "proposal",
        id: "21",
        at: at(10, 1),
        proposalId,
        scope: "new_plan",
        title: "Plan marathon",
        summary: null,
        opinions: [],
      },
      {
        kind: "topic_summary",
        id: "22",
        at: at(11),
        topicId,
        title: "Marathon",
        openedAt: at(9),
        closedAt: at(11),
        lead: "coach",
        messages: 3,
        decisions: [{ proposalId, title: "Plan marathon" }],
        summary: "Le marathon est calé.",
      },
      {
        kind: "topic_summary",
        id: "23",
        at: at(12),
        topicId,
        title: "Autre",
        openedAt: at(9),
        closedAt: at(12),
        lead: "coach",
        messages: 3,
        decisions: [],
        summary: "On parle du marathon.",
      },
    ];
    const found = searchConversation(items, null, "marathon");
    expect(found.map((result) => [result.id, result.decision])).toEqual([
      ["20", false],
      ["21", true],
      ["22", true],
      ["23", false],
    ]);
    expect(
      filterResults(found, ["decisions"]).map((result) => result.id),
    ).toEqual(["21", "22"]);
    expect(filterResults(found, ["topics"])).toEqual([]);
    expect(filterResults(found, ["main"])).toHaveLength(4);
  });

  it("finds nothing for an unknown word", () => {
    const found = results("xyz");
    expect(found).toEqual([]);
    expect(currentResultIndex(found, null)).toBe(-1);
    expect(resultsHeading(0, "xyz")).toBe("Aucun résultat pour « xyz »");
    expect(resultsHeading(12, "tendon")).toBe("12 résultats pour « tendon »");
    expect(resultsHeading(1, "tendon")).toBe("1 résultat pour « tendon »");
  });

  it("skips items without a stored id", () => {
    const [first] = main;
    expect(
      searchConversation([{ ...first, id: undefined }], null, "tendon"),
    ).toEqual([]);
  });
});

describe("coach search navigation", () => {
  const found = results("tendon");

  it("lands on the most recent result and reloads the current one", () => {
    expect(currentResultIndex(found, null)).toBe(4);
    expect(counterLabel(currentResultIndex(found, null), found.length)).toBe(
      "5 sur 5",
    );
    expect(currentResultIndex(found, "10")).toBe(2);
    expect(currentResultIndex(found, "999")).toBe(4);
  });

  it("steps to older and newer results and stops at the ends", () => {
    expect(stepResult(found, 4, "older")?.id).toBe("11");
    expect(stepResult(found, 4, "newer")).toBeNull();
    expect(stepResult(found, 0, "older")).toBeNull();
  });

  it("crosses into a topic with the query and the result in the URL", () => {
    const target = stepResult(found, 2, "older") as SearchResult;
    expect(target.topicId).toBe(topicId);
    expect(resultHref(target, "tendon", ["main", "topics"])).toBe(
      `/coach/${topicId}?q=tendon&at=5`,
    );
    expect(resultHref(found[2], "énergie 10%", ["decisions"])).toBe(
      "/coach?q=%C3%A9nergie+10%25&at=10&scope=decisions",
    );
  });

  it("reads the search from the URL", () => {
    expect(parseSearchParams({})).toEqual({
      open: false,
      query: "",
      at: null,
      scopes: ["main", "topics"],
      date: null,
    });
    expect(
      parseSearchParams({
        q: "tendon",
        at: "12",
        scope: "decisions,main",
        date: "2026-09-18",
      }),
    ).toEqual({
      open: true,
      query: "tendon",
      at: "12",
      scopes: ["main", "decisions"],
      date: "2026-09-18",
    });
    expect(
      parseSearchParams({
        q: "tendon",
        at: "abc",
        scope: "nope",
        date: "18/09",
      }),
    ).toMatchObject({ at: null, scopes: ["main", "topics"], date: null });
    expect(
      searchHref({
        topicId: null,
        query: "tendon",
        scopes: ["topics", "main"],
        date: "2026-09-18",
      }),
    ).toBe("/coach?q=tendon&date=2026-09-18");
  });

  it("anchors the thread on the date first, then on the result", () => {
    expect(threadAnchor(parseSearchParams({ q: "tendon", at: "12" }))).toEqual({
      kind: "item",
      id: "12",
    });
    expect(
      threadAnchor(
        parseSearchParams({ q: "tendon", at: "12", date: "2026-09-18" }),
      ),
    ).toEqual({ kind: "date", date: "2026-09-18" });
    expect(threadAnchor(parseSearchParams({ at: "12" }))).toBeNull();
    expect(threadAnchor(parseSearchParams({ q: "tendon" }))).toBeNull();
  });

  it("formats result dates for fr-FR", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    expect(resultDateLabel(at(21), now, tz)).toBe("lun. 21 sept.");
    expect(resultDateLabel("2025-09-21T06:00:00Z", now, tz)).toBe(
      "dim. 21 sept. 2025",
    );
  });
});
