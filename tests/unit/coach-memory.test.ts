import { describe, expect, it } from "vitest";
import {
  clearAllLine,
  factCorrectionSchema,
  factInputSchema,
  factPeriod,
  factProvenance,
  groupFacts,
  knownFactsForStaff,
  memoryExport,
  type Fact,
} from "../../src/features/coach/memory";

const zone = "Europe/Paris";

function fact(overrides: Partial<Fact> = {}): Fact {
  return {
    id: "f1",
    category: "habit",
    text: "Sortie longue le dimanche",
    startsOn: null,
    endsOn: null,
    createdAt: "2026-09-28T08:00:00Z",
    updatedAt: "2026-09-28T08:00:00Z",
    ...overrides,
  };
}

describe("factInputSchema", () => {
  it("trims the text and keeps dates for an upcoming fact", () => {
    expect(
      factInputSchema.parse({
        category: "upcoming",
        text: "  Semaine de ski, pas de course à pied  ",
        startsOn: "2026-02-14",
        endsOn: "2026-02-21",
      }),
    ).toEqual({
      category: "upcoming",
      text: "Semaine de ski, pas de course à pied",
      startsOn: "2026-02-14",
      endsOn: "2026-02-21",
    });
  });

  it("defaults the dates to null", () => {
    expect(
      factInputSchema.parse({ category: "goal", text: "Finir l’EcoTrail" }),
    ).toMatchObject({ startsOn: null, endsOn: null });
  });

  it("refuses an empty text, a long text and an unknown category", () => {
    expect(
      factInputSchema.safeParse({ category: "goal", text: "  " }).success,
    ).toBe(false);
    expect(
      factInputSchema.safeParse({ category: "goal", text: "a".repeat(301) })
        .success,
    ).toBe(false);
    expect(
      factInputSchema.safeParse({ category: "other", text: "Non" }).success,
    ).toBe(false);
  });

  it("refuses dates outside the upcoming category and reversed periods", () => {
    expect(
      factInputSchema.safeParse({
        category: "body",
        text: "Tendon sensible",
        startsOn: "2026-02-14",
      }).success,
    ).toBe(false);
    expect(
      factInputSchema.safeParse({
        category: "upcoming",
        text: "Déplacement",
        startsOn: "2026-02-21",
        endsOn: "2026-02-14",
      }).success,
    ).toBe(false);
  });
});

describe("factCorrectionSchema", () => {
  const id = "0b1d9a1e-3c52-4b8e-9f6a-6d3a5e7c1a10";

  it("takes the id of the fact with the corrected fields", () => {
    expect(
      factCorrectionSchema.parse({
        id,
        category: "habit",
        text: " Sortie longue le samedi ",
      }),
    ).toEqual({
      id,
      category: "habit",
      text: "Sortie longue le samedi",
      startsOn: null,
      endsOn: null,
    });
  });

  it("keeps the same rules as a new fact", () => {
    expect(
      factCorrectionSchema.safeParse({ id, category: "goal", text: "  " })
        .success,
    ).toBe(false);
    expect(
      factCorrectionSchema.safeParse({
        id,
        category: "body",
        text: "Tendon sensible",
        endsOn: "2026-10-01",
      }).success,
    ).toBe(false);
    expect(
      factCorrectionSchema.safeParse({ id: "x", category: "goal", text: "Ok" })
        .success,
    ).toBe(false);
  });
});

describe("factProvenance", () => {
  it("says when the athlete told the staff", () => {
    expect(factProvenance(fact(), zone)).toBe("Tu l’as dit · 28 sept.");
  });

  it("says when a fact was corrected", () => {
    expect(
      factProvenance(fact({ updatedAt: "2026-10-02T09:00:00Z" }), zone),
    ).toBe("Tu l’as dit · corrigé le 2 oct.");
  });
});

describe("factPeriod", () => {
  it("formats a dated period without time zone drift", () => {
    expect(
      factPeriod(
        fact({
          category: "upcoming",
          startsOn: "2026-02-14",
          endsOn: "2026-02-21",
        }),
      ),
    ).toBe("du 14 févr. au 21 févr.");
  });

  it("handles a single bound and no dates", () => {
    expect(
      factPeriod(fact({ category: "upcoming", startsOn: "2026-02-14" })),
    ).toBe("à partir du 14 févr.");
    expect(factPeriod(fact())).toBeNull();
  });
});

describe("groupFacts", () => {
  it("orders the categories as drawn and omits the empty ones", () => {
    const groups = groupFacts([
      fact({ id: "1", category: "habit" }),
      fact({ id: "2", category: "goal" }),
      fact({ id: "3", category: "upcoming", startsOn: "2026-10-20" }),
    ]);
    expect(groups.map((group) => group.label)).toEqual([
      "Tes objectifs",
      "Tes habitudes",
      "À venir",
    ]);
  });

  it("lists a category from the oldest to the newest and upcoming by date", () => {
    const body = groupFacts([
      fact({ id: "b", category: "body", createdAt: "2026-10-02T08:00:00Z" }),
      fact({ id: "a", category: "body", createdAt: "2026-09-28T08:00:00Z" }),
    ])[0];
    expect(body.facts.map((entry) => entry.id)).toEqual(["a", "b"]);
    const upcoming = groupFacts([
      fact({ id: "late", category: "upcoming", startsOn: "2026-12-01" }),
      fact({ id: "undated", category: "upcoming" }),
      fact({ id: "soon", category: "upcoming", startsOn: "2026-10-20" }),
    ])[0];
    expect(upcoming.facts.map((entry) => entry.id)).toEqual([
      "soon",
      "late",
      "undated",
    ]);
  });
});

describe("clearAllLine", () => {
  it("counts what the athlete said, in French", () => {
    expect(clearAllLine(1)).toBe("Le staff oubliera cette information.");
    expect(clearAllLine(9)).toBe(
      "Le staff oubliera les 9 informations de cette page.",
    );
  });
});

describe("knownFactsForStaff", () => {
  it("drops an upcoming fact whose period is over and caps the list", () => {
    const facts = [
      fact({
        id: "past",
        category: "upcoming",
        text: "Déplacement terminé",
        endsOn: "2026-10-01",
      }),
      fact({
        id: "now",
        category: "upcoming",
        text: "Déplacement en cours",
        endsOn: "2026-10-30",
      }),
      ...Array.from({ length: 50 }, (_, index) =>
        fact({
          id: `h${index}`,
          text: `Habitude ${index}`,
          updatedAt: `2026-09-${String((index % 28) + 1).padStart(2, "0")}T08:00:00Z`,
        }),
      ),
    ];
    const texts = knownFactsForStaff(facts, "2026-10-15").map(
      (entry) => entry.text,
    );
    expect(texts).toHaveLength(40);
    expect(texts).not.toContain("Déplacement terminé");
  });

  it("gives the staff the wording and the date it was said", () => {
    expect(knownFactsForStaff([fact()], "2026-10-15")).toEqual([
      {
        category: "habit",
        text: "Sortie longue le dimanche",
        saidOn: "2026-09-28",
      },
    ]);
  });
});

describe("memoryExport", () => {
  it("exports the facts with their dates", () => {
    const exported = memoryExport([fact()], new Date("2026-10-15T10:00:00Z"));
    expect(exported).toEqual({
      exportedAt: "2026-10-15T10:00:00.000Z",
      facts: [
        {
          category: "habit",
          text: "Sortie longue le dimanche",
          startsOn: null,
          endsOn: null,
          saidOn: "2026-09-28",
        },
      ],
    });
  });
});
