import { z } from "zod";

export const factCategories = ["goal", "body", "habit", "upcoming"] as const;
export type FactCategory = (typeof factCategories)[number];

export const factCategoryLabels: Record<FactCategory, string> = {
  goal: "Tes objectifs",
  body: "Ton corps",
  habit: "Tes habitudes",
  upcoming: "À venir",
};

export const factCategoryChoices: Record<FactCategory, string> = {
  goal: "Objectif",
  body: "Ton corps",
  habit: "Habitude",
  upcoming: "À venir",
};

export const factTextLimit = 300;
export const factLimit = 100;
const staffFactLimit = 40;

const factShape = {
  category: z.enum(factCategories),
  text: z.string().trim().min(1).max(factTextLimit),
  startsOn: z.iso.date().nullable().default(null),
  endsOn: z.iso.date().nullable().default(null),
};

type FactFields = {
  category: FactCategory;
  startsOn: string | null;
  endsOn: string | null;
};

const datesOnlyWhenUpcoming = (fact: FactFields) =>
  fact.category === "upcoming" ||
  (fact.startsOn === null && fact.endsOn === null);

const periodInOrder = (fact: FactFields) =>
  fact.startsOn === null ||
  fact.endsOn === null ||
  fact.endsOn >= fact.startsOn;

export const factInputSchema = z
  .strictObject(factShape)
  .refine(datesOnlyWhenUpcoming, {
    message: "Seule une information à venir porte des dates.",
  })
  .refine(periodInOrder, { message: "La fin ne peut pas précéder le début." });

export const factCorrectionSchema = z
  .strictObject({ id: z.uuid(), ...factShape })
  .refine(datesOnlyWhenUpcoming, {
    message: "Seule une information à venir porte des dates.",
  })
  .refine(periodInOrder, { message: "La fin ne peut pas précéder le début." });

export type FactInput = z.output<typeof factInputSchema>;

export type Fact = {
  id: string;
  category: FactCategory;
  text: string;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FactGroup = {
  category: FactCategory;
  label: string;
  facts: Fact[];
};

const shortDate = (timeZone: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    timeZone,
  });

export function factProvenance(fact: Fact, timeZone: string) {
  const format = shortDate(timeZone);
  const said = format.format(new Date(fact.createdAt));
  const corrected = Date.parse(fact.updatedAt) > Date.parse(fact.createdAt);
  return corrected
    ? `Tu l’as dit · corrigé le ${format.format(new Date(fact.updatedAt))}`
    : `Tu l’as dit · ${said}`;
}

function dayLabel(day: string) {
  return shortDate("UTC").format(new Date(`${day}T12:00:00Z`));
}

export function factPeriod(fact: Fact) {
  if (fact.startsOn && fact.endsOn)
    return `du ${dayLabel(fact.startsOn)} au ${dayLabel(fact.endsOn)}`;
  if (fact.startsOn) return `à partir du ${dayLabel(fact.startsOn)}`;
  if (fact.endsOn) return `jusqu’au ${dayLabel(fact.endsOn)}`;
  return null;
}

function byCreation(a: Fact, b: Fact) {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

function byStart(a: Fact, b: Fact) {
  if (a.startsOn === b.startsOn) return byCreation(a, b);
  if (a.startsOn === null) return 1;
  if (b.startsOn === null) return -1;
  return a.startsOn.localeCompare(b.startsOn);
}

export function groupFacts(facts: readonly Fact[]): FactGroup[] {
  return factCategories.flatMap((category) => {
    const inCategory = facts
      .filter((fact) => fact.category === category)
      .sort(category === "upcoming" ? byStart : byCreation);
    return inCategory.length
      ? [{ category, label: factCategoryLabels[category], facts: inCategory }]
      : [];
  });
}

const clearAllThemes: Record<FactCategory, string> = {
  goal: "tes objectifs",
  body: "ce que tu lui as dit de ton corps",
  habit: "tes habitudes",
  upcoming: "ce qui t’attend",
};

export function clearAllLine(
  count: number,
  categories: readonly FactCategory[] = [],
) {
  if (count === 1) return "Le staff oubliera cette information.";
  const themes = categories.map((category) => clearAllThemes[category]);
  return `Le staff oubliera les ${count} informations de cette page${themes.length ? ` : ${themes.join(", ")}` : ""}.`;
}

export type StaffFact = {
  category: FactCategory;
  text: string;
  startsOn?: string;
  endsOn?: string;
  saidOn: string;
};

function dayIn(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone,
  }).format(new Date(iso));
}

export function knownFactsForStaff(
  facts: readonly Fact[],
  today: string,
  timeZone: string,
): StaffFact[] {
  return facts
    .filter((fact) => fact.endsOn === null || fact.endsOn >= today)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
    .slice(0, staffFactLimit)
    .map((fact) => ({
      category: fact.category,
      text: fact.text,
      ...(fact.startsOn ? { startsOn: fact.startsOn } : {}),
      ...(fact.endsOn ? { endsOn: fact.endsOn } : {}),
      saidOn: dayIn(fact.createdAt, timeZone),
    }));
}

export function memoryExport(
  facts: readonly Fact[],
  now: Date,
  timeZone: string,
) {
  return {
    exportedAt: now.toISOString(),
    facts: facts.map((fact) => ({
      category: fact.category,
      text: fact.text,
      startsOn: fact.startsOn,
      endsOn: fact.endsOn,
      saidOn: dayIn(fact.createdAt, timeZone),
    })),
  };
}

export function factActionMessage(
  reason: "invalid" | "limit" | "missing" | "failed",
) {
  switch (reason) {
    case "invalid":
      return "Vérifie le texte et les dates, puis réessaie.";
    case "limit":
      return `Tu as atteint la limite de ${factLimit} informations. Oublie-en une pour en ajouter.`;
    case "missing":
      return "Cette information n’existe plus.";
    case "failed":
      return "L’information n’a pas pu être enregistrée. Réessaie dans un instant.";
  }
}
