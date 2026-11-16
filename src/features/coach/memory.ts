import { z } from "zod";

export const factCategories = ["goal", "body", "habit", "upcoming"] as const;
export type FactCategory = (typeof factCategories)[number];

export const factCategoryLabels: Record<FactCategory, string> = {
  goal: "Tes objectifs",
  body: "Ton corps",
  habit: "Tes habitudes",
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

export function clearAllLine(count: number) {
  return count === 1
    ? "Le staff oubliera cette information."
    : `Le staff oubliera les ${count} informations de cette page.`;
}

export type StaffFact = {
  category: FactCategory;
  text: string;
  startsOn?: string;
  endsOn?: string;
  saidOn: string;
};

export function knownFactsForStaff(
  facts: readonly Fact[],
  today: string,
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
      saidOn: fact.createdAt.slice(0, 10),
    }));
}

export function memoryExport(facts: readonly Fact[], now: Date) {
  return {
    exportedAt: now.toISOString(),
    facts: facts.map((fact) => ({
      category: fact.category,
      text: fact.text,
      startsOn: fact.startsOn,
      endsOn: fact.endsOn,
      saidOn: fact.createdAt.slice(0, 10),
    })),
  };
}
