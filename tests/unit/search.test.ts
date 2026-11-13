import { describe, expect, it } from "vitest";
import {
  foldText,
  highlightParts,
  matchTitle,
  queryTerms,
} from "../../src/features/search/match";
import {
  activityEntry,
  raceCountdown,
  raceEntry,
  sessionEntry,
} from "../../src/features/search/entries";
import {
  latestRecents,
  parseRecents,
  rememberItem,
  rememberQuery,
  emptyRecents,
} from "../../src/features/search/recents";
import {
  recentDetail,
  resultCount,
  searchGroups,
  type SearchEntry,
  type SearchIndex,
} from "../../src/features/search/results";

function entry(
  kind: SearchEntry["kind"],
  id: string,
  title: string,
  date: string | null,
): SearchEntry {
  return {
    kind,
    id,
    title,
    detail: "",
    date,
    href: `/${kind}/${id}`,
    badge: null,
  };
}

const index: SearchIndex = {
  today: "2026-10-07",
  entries: [
    entry("session", "s-past", "Seuil 5 × 5’", "2026-09-30"),
    entry("session", "s-next", "Seuil 3 × 10’", "2026-10-14"),
    entry("session", "s-today", "Seuil 4 × 6’", "2026-10-07"),
    entry("session", "s-easy", "Footing facile", "2026-10-08"),
    entry("activity", "a-old", "Footing, puis 2 × 8’ au seuil", "2026-09-19"),
    entry("activity", "a-new", "Seuil sur piste", "2026-09-30"),
    entry("race", "r-eco", "EcoTrail Paris 120K", "2027-03-20"),
    entry("race", "r-saint", "Trail de Sainté-Lyon", "2025-12-01"),
  ],
};

const ids = (query: string) =>
  searchGroups(index, query).map((group) => [
    group.kind,
    group.hits.map((hit) => hit.item.id),
  ]);

describe("search matching", () => {
  it("folds accents, case and apostrophes", () => {
    expect(foldText("Sainté’ÉCO")).toBe("sainte'eco");
    expect(queryTerms("  Séance, côte ")).toEqual(["seance", "cote"]);
  });

  it("finds a word start, a camel-case part and a substring", () => {
    expect(matchTitle("EcoTrail Paris", ["eco"])?.score).toBe(3);
    expect(matchTitle("EcoTrail Paris", ["trail"])?.score).toBe(3);
    expect(matchTitle("EcoTrail Paris", ["rail"])?.score).toBe(2);
  });

  it("tolerates a light typo on longer terms only", () => {
    expect(matchTitle("EcoTrail Paris 120K", ["ecotrial"])).toMatchObject({
      score: 1,
      ranges: [{ start: 0, end: 8 }],
    });
    expect(matchTitle("Seuil sur piste", ["siel"])).toBeNull();
    expect(matchTitle("Seuil", ["sel"])).toBeNull();
  });

  it("requires every term and highlights each one", () => {
    const match = matchTitle("Footing, puis 2 × 8’ au seuil", [
      "foot",
      "seuil",
    ]);
    expect(match?.ranges).toEqual([
      { start: 0, end: 4 },
      { start: 24, end: 29 },
    ]);
    expect(matchTitle("Footing facile", ["foot", "seuil"])).toBeNull();
    expect(highlightParts("Seuil 4", [{ start: 0, end: 5 }])).toEqual([
      { text: "Seuil", match: true },
      { text: " 4", match: false },
    ]);
  });
});

describe("search groups", () => {
  it("waits for the second character", () => {
    expect(searchGroups(index, "s")).toEqual([]);
    expect(searchGroups(index, " ")).toEqual([]);
  });

  it("orders groups by type and sessions upcoming first, then recent", () => {
    expect(ids("seuil")).toEqual([
      ["session", ["s-today", "s-next", "s-past"]],
      ["activity", ["a-new", "a-old"]],
    ]);
  });

  it("ranks word starts before substrings and typos", () => {
    const races: SearchIndex = {
      today: "2026-10-07",
      entries: [
        entry("race", "r-substring", "Ultra Montrail", "2026-11-01"),
        entry("race", "r-typo", "Trial des crêtes", "2026-10-20"),
        entry("race", "r-start", "Trail des Cerfs", "2027-05-01"),
      ],
    };
    expect(
      searchGroups(races, "trail")[0]?.hits.map((hit) => hit.item.id),
    ).toEqual(["r-start", "r-substring", "r-typo"]);
    expect(ids("ecotrial")).toEqual([["race", ["r-eco"]]]);
    expect(ids("sainte lyon")).toEqual([["race", ["r-saint"]]]);
  });

  it("lists actions first only when the query starts with a verb", () => {
    expect(ids("ajouter course")[0]).toEqual(["action", ["action:add-race"]]);
    expect(ids("aj")[0]?.[0]).toBe("action");
    expect(ids("course")).toEqual([]);
  });

  it("shows five results in the leading group and three elsewhere", () => {
    const many: SearchIndex = {
      today: "2026-10-07",
      entries: [
        ...Array.from({ length: 7 }, (_, day) =>
          entry("session", `s${day}`, "Seuil long", `2026-10-1${day}`),
        ),
        ...Array.from({ length: 5 }, (_, day) =>
          entry("activity", `a${day}`, "Footing au seuil", `2026-09-1${day}`),
        ),
      ],
    };
    const [sessions, activities] = searchGroups(many, "seuil");
    expect(sessions?.hits).toHaveLength(5);
    expect(sessions?.more).toEqual({ count: 2, href: null });
    expect(activities?.hits).toHaveLength(3);
    expect(activities?.more).toEqual({
      count: 2,
      href: "/activities?q=seuil",
    });
    expect(resultCount([sessions!, activities!])).toBe(12);
    const expanded = searchGroups(many, "seuil", new Set(["session"]));
    expect(expanded[0]?.hits).toHaveLength(7);
    expect(expanded[0]?.more).toBeNull();
  });

  it("describes a recent result by its type", () => {
    expect(
      recentDetail({ kind: "session", detail: "mer. 7 oct. · prévue" }),
    ).toBe("Séance · mer. 7 oct.");
    expect(recentDetail({ kind: "action", detail: "Courses" })).toBe("Action");
  });
});

describe("search entries", () => {
  const session = {
    sessionKey: "w1-wed",
    title: "Seuil 4 × 6’",
    scheduledOn: "2026-10-07",
    targets: {
      durationSeconds: 3120,
      distanceMeters: null,
      elevationGainMeters: null,
    },
  };

  it("labels a session by day, state and duration", () => {
    expect(sessionEntry(session, "2026-10-07", false)).toMatchObject({
      id: "session:w1-wed",
      detail: "mer. 7 oct. · prévue aujourd’hui · 52’",
      href: "/plan/sessions/w1-wed",
      badge: "today",
    });
    expect(sessionEntry(session, "2026-10-08", true)).toMatchObject({
      detail: "mer. 7 oct. · faite",
      badge: "done",
    });
    expect(sessionEntry(session, "2026-10-09", false).detail).toBe(
      "mer. 7 oct. · non faite",
    );
  });

  it("labels an activity with distance and pace for runs", () => {
    const run = {
      id: "a1",
      name: "Seuil sur piste",
      type: "track_running",
      routeName: null,
      date: "2026-09-30",
      distanceMeters: 11_200,
      durationSeconds: 3150,
    };
    expect(activityEntry(run).detail).toBe(
      "mer. 30 sept. · 11,2 km · 4:41 /km",
    );
    expect(
      activityEntry({ ...run, type: "yoga", distanceMeters: null }).detail,
    ).toBe("mer. 30 sept.");
  });

  it("labels a race with its date and countdown", () => {
    const race = { id: "r1", name: "EcoTrail Paris 120K", date: "2027-03-20" };
    expect(raceEntry(race, "2026-10-07").detail).toBe(
      "sam. 20 mars 2027 · J-164",
    );
    expect(raceCountdown("2026-10-07", "2026-10-07")).toBe("aujourd’hui");
    expect(raceEntry({ ...race, date: null }, "2026-10-07").detail).toBe(
      "Date à préciser",
    );
  });
});

describe("search recents", () => {
  const item = {
    kind: "race" as const,
    id: "r-eco",
    title: "EcoTrail Paris 120K",
    detail: "Course · J-164",
    href: "/races/r-eco",
  };

  it("keeps the latest opened items and queries, newest first", () => {
    let recents = rememberItem(emptyRecents, item, 1);
    recents = rememberQuery(recents, "tendon", 12, 2);
    recents = rememberQuery(recents, "Tendon ", 4, 3);
    recents = rememberItem(recents, item, 4);
    expect(recents.opened).toHaveLength(1);
    expect(recents.queries).toEqual([
      { type: "query", query: "Tendon", count: 4, at: 3 },
    ]);
    expect(latestRecents(recents).map((recent) => recent.at)).toEqual([4, 3]);
  });

  it("caps opened items at five and shows three", () => {
    let recents = emptyRecents;
    for (let at = 0; at < 7; at += 1)
      recents = rememberItem(recents, { ...item, id: `r${at}` }, at);
    expect(recents.opened.map((entry) => entry.id)).toEqual([
      "r6",
      "r5",
      "r4",
      "r3",
      "r2",
    ]);
    expect(latestRecents(recents)).toHaveLength(3);
  });

  it("only keeps links inside Stride", () => {
    const stored = (href: string) =>
      parseRecents(
        JSON.stringify({ opened: [{ type: "item", ...item, href, at: 1 }] }),
      ).opened.length;
    expect(stored("/races/r-eco")).toBe(1);
    expect(stored("//evil.example")).toBe(0);
    expect(stored("/\\evil.example")).toBe(0);
    expect(stored("https://evil.example")).toBe(0);
  });

  it("ignores corrupted storage", () => {
    expect(parseRecents("{")).toEqual(emptyRecents);
    expect(parseRecents(JSON.stringify({ opened: [{ id: 1 }] }))).toEqual(
      emptyRecents,
    );
    expect(parseRecents(null)).toEqual(emptyRecents);
  });
});
