import { coachRequestHref } from "@/features/coach/request";
import {
  fuelingBase,
  fuelingRehearsals,
  nextFuelingRace,
  raceNutritionHref,
  type FuelingRace,
} from "@/features/fueling/base";
import type { NutritionProduct } from "@/features/fueling/products";
import { sessionPanelHref } from "@/features/plans/view/session-href";
import type {
  NutritionDayResult,
  NutritionDayType,
  NutritionMissingField,
  NutritionRange,
  NutritionResult,
} from "./calculator";
import {
  nutritionTimeline,
  type FuelingItems,
  type NutritionTimelineStep,
} from "./timeline";

export type NutritionSessionLabel = {
  sessionKey: string;
  date: string;
  title: string;
  durationSeconds: number;
};

export const dayTypeLabels: Record<NutritionDayType, string> = {
  rest: "Repos",
  easy: "Facile",
  moderate: "Modérée",
  long_or_hard: "Longue ou intense",
  pre_race: "Veille de course",
  race: "Course",
};

const dayTypeReasons: Record<NutritionDayType, string> = {
  rest: "Journée sans séance : les glucides restent à 3–5 g par kg.",
  easy: "Séance facile : les glucides restent à 3–5 g par kg.",
  moderate: "Séance modérée : les glucides montent à 5–7 g par kg.",
  long_or_hard:
    "Journée longue ou intense : les glucides montent à 6–10 g par kg.",
  pre_race:
    "Veille de course longue : la charge glucidique monte à 8–12 g par kg.",
  race: "Jour de course : la charge glucidique reste haute et le ravitaillement compte autant que les repas.",
};

const missingLabels: Record<NutritionMissingField, string> = {
  birthDate: "Date de naissance",
  sex: "Sexe",
  heightCm: "Taille",
  weightKg: "Poids",
};

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const weight = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const weekdayDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
});

const dayMs = 86_400_000;

export function formatKcal(value: number) {
  return integer.format(value).replace(/ /g, " ");
}

export function formatRange({ min, max }: NutritionRange, digits = 0) {
  const format = digits ? decimal : integer;
  return min === max
    ? format.format(min)
    : `${format.format(min)}–${format.format(max)}`;
}

export function formatDayLabel(iso: string) {
  return weekdayDate.format(new Date(`${iso}T00:00:00Z`));
}

export function formatDuration(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${String(rest).padStart(2, "0")}` : `${hours} h`;
}

function formatElapsed(seconds: number) {
  const minutes = Math.round(seconds / 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}

function listJoin(items: string[]) {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items.at(-1)}`;
}

function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / dayMs,
  );
}

function sessionLine(sessions: NutritionSessionLabel[], date: string) {
  const day = sessions.filter((session) => session.date === date);
  if (!day.length) return "Repos";
  return day
    .map((session) =>
      session.durationSeconds
        ? `${session.title} · ${formatDuration(session.durationSeconds)}`
        : session.title,
    )
    .join(" + ");
}

function mainSession(sessions: NutritionSessionLabel[], date: string) {
  return (
    sessions
      .filter((session) => session.date === date)
      .sort(
        (first, second) => second.durationSeconds - first.durationSeconds,
      )[0] ?? null
  );
}

export type NutritionSourceTag = "garmin" | "estimation";

export type NutritionLink = { label: string; href: string };

export type NutritionTimelineStepView = {
  key: NutritionTimelineStep["kind"];
  when: string;
  title: string;
  amount: { value: string; unit: string };
  detail: string;
  highlighted: boolean;
  link: NutritionLink | null;
};

export type NutritionBaseView = {
  source: "race" | "stride";
  carbs: string;
  sodium: string;
  water: string;
  note: string;
  race: NutritionLink | null;
};

export type NutritionRehearsalView = {
  sessionKey: string;
  label: string;
  href: string;
  carbs: string;
  perHour: string;
  today: boolean;
};

export type NutritionTodayView = {
  dateLabel: string;
  headline: string;
  summary: string;
  session: NutritionLink | null;
  race: NutritionLink | null;
  coachHref: string;
  energy: { value: string; detail: string };
  carbs: { value: string; detail: string };
  protein: { value: string; detail: string };
  fat: { value: string; detail: string };
  sources: { tag: NutritionSourceTag | null; text: string }[];
  timeline: {
    title: string;
    caption: string;
    steps: NutritionTimelineStepView[];
  };
  base: NutritionBaseView;
  rehearsals: NutritionRehearsalView[];
  method: { label: string; value: string; tag: NutritionSourceTag | null }[];
  neatEstimated: boolean;
};

export type NutritionRowView = {
  date: string;
  dateLabel: string;
  today: boolean;
  session: string;
  sessionHref: string | null;
  dayType: NutritionDayType;
  dayTypeLabel: string;
  energy: string;
  carbs: string;
  protein: string;
  fueling: string | null;
};

export type NutritionView =
  | { status: "missing"; missing: string[] }
  | {
      status: "ready";
      today: NutritionTodayView;
      days: NutritionRowView[];
    };

export type NutritionViewInput = {
  results: NutritionResult[];
  sessions: NutritionSessionLabel[];
  today: string;
  products?: readonly NutritionProduct[];
  fuelingRaces?: readonly FuelingRace[];
  startedAt?: string | null;
};

function productName(product: NutritionProduct) {
  return product.brand && !product.name.startsWith(product.brand)
    ? `${product.brand} ${product.name}`
    : product.name;
}

function itemsText(items: FuelingItems) {
  const parts: string[] = [];
  if (items.drink)
    parts.push(
      `${plural(items.drink.count, "flasque", "flasques")} ${productName(items.drink.product)}`,
    );
  if (items.gels.count > 0) {
    const name = items.gels.product
      ? productName(items.gels.product)
      : `de ${integer.format(items.gels.carbsG)} g`;
    parts.push(
      `${plural(items.gels.count, "gel", "gels")} ${name} à ${listJoin(items.gels.atSeconds.map(formatElapsed))}`,
    );
  }
  return parts.length ? `${listJoin(parts)}.` : "";
}

const recoveryExample =
  "250 g de skyr, 1 banane et 60 g de pain. Ou 500 ml de lait chocolaté.";
const restOfDayExample =
  "Riz ou pâtes (100 g crus), 130 g de saumon ou de poulet, légumes, huile d’olive. Complète tes glucides du jour.";

function oatsFor(carbsG: number) {
  return Math.max(40, Math.round((carbsG - 45) / 0.6 / 10) * 10);
}

function stepView(
  step: NutritionTimelineStep,
  products: readonly NutritionProduct[],
  base: NutritionBaseView,
): NutritionTimelineStepView {
  const shared = { highlighted: false, link: null };
  switch (step.kind) {
    case "pre_meal":
      return {
        ...shared,
        key: step.kind,
        when: `${step.hours.min} à ${step.hours.max} h avant`,
        title: "Repas avant la séance",
        amount: {
          value: `≈ ${integer.format(step.carbsG)}`,
          unit: "g de glucides",
        },
        detail: `${oatsFor(step.carbsG)} g de flocons d’avoine, 1 banane, 1 c. à soupe de miel, 1 yaourt. Peu de fibres et de gras.`,
      };
    case "snack": {
      const gel = products.find((product) => product.kind === "gel");
      return {
        ...shared,
        key: step.kind,
        when: `${step.minutes} min avant`,
        title: "Collation si besoin",
        amount: {
          value: `≈ ${integer.format(step.carbsG)}`,
          unit: "g de glucides",
        },
        detail: `1 compote ou 1 gel${gel ? ` ${productName(gel)}` : ""}, avec 300 ml d’eau.`,
      };
    }
    case "during": {
      const { fueling } = step;
      return {
        key: step.kind,
        when: `Pendant · ${formatDuration(fueling.durationSeconds)}`,
        title: "Ravito de la séance",
        amount: {
          value: formatRange(fueling.gramsPerHour),
          unit: `g/h · soit ${formatRange(fueling.totalGrams)} g`,
        },
        detail: [
          itemsText(step.items),
          `Sodium ${integer.format(fueling.sodiumMgPerHour)} mg/h · eau ${integer.format(fueling.waterMlPerHour)} ml/h.`,
        ]
          .filter(Boolean)
          .join(" "),
        highlighted: true,
        link: base.race
          ? {
              label: "Ta base de course · teste ton ravito",
              href: base.race.href,
            }
          : null,
      };
    }
    case "recovery":
      return {
        ...shared,
        key: step.kind,
        when: `Dans les ${step.withinHours} h après`,
        title: "Récupération",
        amount: { value: formatRange(step.proteinG), unit: "g de protéines" },
        detail: recoveryExample,
      };
    case "rest_of_day":
      return {
        ...shared,
        key: step.kind,
        when: "Le reste de la journée",
        title: "Repas et collations",
        amount: { value: formatRange(step.intakes), unit: "prises" },
        detail: restOfDayExample,
      };
    case "meals":
      return {
        ...shared,
        key: step.kind,
        when: "Toute la journée",
        title: "Répartis tes repas",
        amount: { value: formatRange(step.intakes), unit: "prises" },
        detail:
          "Des protéines à chaque prise et des glucides à chaque repas. Riz, pâtes ou pain, légumes, poisson, œufs ou légumineuses.",
      };
  }
}

function baseView(race: FuelingRace | null): NutritionBaseView {
  const base = fuelingBase(race, false);
  return {
    source: base.source,
    carbs: `${formatRange(base.carbsPerHourG)} g/h`,
    sodium: `${integer.format(base.sodiumMgPerHour)} mg/h`,
    water: `${integer.format(base.waterMlPerHour)} ml/h`,
    note: race
      ? `Tirée de ta nutrition de course ${race.name}. Chaque séance de 1 h 30 ou plus utilise les mêmes chiffres et les mêmes produits.`
      : "Base Stride sans course prévue : 30–60 g/h, et 60–90 g/h au-delà de 4 h. Ajoute une course pour l’aligner sur ton plan de course.",
    race: race
      ? {
          label:
            race.kind === "trail"
              ? "Ouvrir la nutrition de course"
              : "Ouvrir la course",
          href: raceNutritionHref(race),
        }
      : null,
  };
}

function coachText(
  result: NutritionDayResult,
  session: NutritionSessionLabel | null,
  race: FuelingRace | null,
) {
  const fueling = result.fueling[0];
  return [
    `Nutrition du ${formatDayLabel(result.date)} : ${session ? `${session.title} · ${formatDuration(session.durationSeconds)}` : "journée sans séance"}.`,
    `Environ ${formatKcal(result.energy.displayKcal)} kcal, glucides ${formatRange(result.carbs.grams)} g, protéines ${formatRange(result.protein.grams)} g.`,
    fueling ? `Ravito ${formatRange(fueling.gramsPerHour)} g/h.` : null,
    race ? `Prochaine course : ${race.name}.` : null,
    "Peux-tu m’aider à organiser mes repas autour de la séance ?",
  ]
    .filter(Boolean)
    .join(" ");
}

function startedLabel(startedAt: string | null | undefined) {
  const time = startedAt?.match(/T(\d{2}):(\d{2})/);
  return time ? `séance faite à ${time[1]}:${time[2]}` : null;
}

function todayView(
  result: NutritionDayResult,
  input: NutritionViewInput,
): NutritionTodayView {
  const { energy, inputsUsed: inputs } = result;
  const products = input.products ?? [];
  const races = input.fuelingRaces ?? [];
  const neatEstimated = inputs.neat.source === "default";
  const race = nextFuelingRace(races, result.date);
  const session = mainSession(input.sessions, result.date);
  const base = baseView(race);
  const timeline = nutritionTimeline(result, products);
  const sessionDistance = inputs.sessions.reduce(
    (sum, item) => sum + (item.distanceKm ?? 0),
    0,
  );
  const sessionGain = inputs.sessions.reduce(
    (sum, item) => sum + (item.elevationGainM ?? 0),
    0,
  );
  const measured = timeline.mainEffort?.measured === true;
  const line = sessionLine(input.sessions, result.date);
  const garminWeight = inputs.weightSource === "garmin";
  const started = startedLabel(input.startedAt);
  const raceDay = result.dayType === "race";
  return {
    dateLabel: formatDayLabel(result.date),
    headline: `Environ ${formatKcal(energy.displayKcal)} kcal aujourd’hui.`,
    summary: `${dayTypeReasons[result.dayType]} Les chiffres suivent tes séances prévues, pas la montre d’hier.`,
    session: session
      ? {
          label: [
            session.title,
            session.durationSeconds
              ? formatDuration(session.durationSeconds)
              : null,
          ]
            .filter(Boolean)
            .join(" · "),
          href: sessionPanelHref(session.sessionKey),
        }
      : null,
    race: race
      ? {
          label: `${race.name} · ${race.date === result.date ? "aujourd’hui" : `J-${daysBetween(result.date, race.date)}`}`,
          href: raceNutritionHref(race),
        }
      : null,
    coachHref: coachRequestHref(
      coachText(result, session, race),
      session?.sessionKey ?? null,
      race?.id ?? null,
    ),
    energy: {
      value: formatKcal(energy.displayKcal),
      detail: `Repos ${formatKcal(energy.restingKcal)} · activité ${formatKcal(energy.neatKcal)} · séances ${formatKcal(energy.trainingKcal)}`,
    },
    carbs: {
      value: formatRange(result.carbs.grams),
      detail: `${formatRange(result.carbs.gPerKg)} g/kg · ${dayTypeLabels[result.dayType].toLowerCase()}`,
    },
    protein: {
      value: formatRange(result.protein.grams),
      detail: `${formatRange(result.protein.gPerKg, 1)} g/kg · ${formatRange(result.protein.intakes)} prises`,
    },
    fat: {
      value: `≈ ${integer.format(result.fat.grams)}`,
      detail: `Le reste · au moins ${decimal.format(0.8)} g/kg`,
    },
    sources: [
      {
        tag: garminWeight ? "garmin" : null,
        text: `Poids ${weight.format(inputs.weightKg)} kg · ${garminWeight ? "Garmin" : "profil"}`,
      },
      measured ? { tag: "garmin", text: "Calories de la séance faite" } : null,
      neatEstimated
        ? { tag: "estimation", text: "Activité hors entraînement" }
        : { tag: "garmin", text: "Activité hors entraînement" },
    ].filter(
      (item): item is NutritionTodayView["sources"][number] => item !== null,
    ),
    timeline: {
      title: timeline.mainEffort
        ? raceDay
          ? "Ta journée autour de la course"
          : "Ta journée autour de la séance"
        : "Ta journée",
      caption: timeline.mainEffort
        ? [
            "Repères comptés depuis ta séance",
            started,
            `exemples pour ${weight.format(inputs.weightKg)} kg`,
          ]
            .filter(Boolean)
            .join(" · ")
        : "Jour sans séance",
      steps: timeline.steps.map((step) => stepView(step, products, base)),
    },
    base,
    rehearsals: fuelingRehearsals({
      sessions: input.sessions,
      from: result.date,
      race,
    }).map((rehearsal) => ({
      sessionKey: rehearsal.sessionKey,
      label: `${formatDayLabel(rehearsal.date)} · ${rehearsal.title} · ${formatDuration(rehearsal.durationSeconds)}`,
      href: sessionPanelHref(rehearsal.sessionKey),
      carbs: `${formatRange(rehearsal.carbsG)} g`,
      perHour: base.carbs,
      today: rehearsal.date === result.date,
    })),
    method: [
      {
        label: `Métabolisme de repos · ${inputs.ageYears} ans, ${weight.format(inputs.weightKg)} kg, ${integer.format(inputs.heightCm)} cm`,
        value: `${formatKcal(energy.restingKcal)} kcal`,
        tag: garminWeight ? "garmin" : null,
      },
      {
        label: "Digestion · 10 % du repos",
        value: `${formatKcal(energy.digestionKcal)} kcal`,
        tag: null,
      },
      {
        label: "Activité hors entraînement",
        value: `${formatKcal(energy.neatKcal)} kcal`,
        tag: neatEstimated ? "estimation" : "garmin",
      },
      {
        label: measured
          ? "Séance faite · calories Garmin"
          : line === "Repos"
            ? "Séances prévues · aucune"
            : sessionDistance
              ? `Séances prévues · ${decimal.format(sessionDistance)} km, ${integer.format(sessionGain)} m D+`
              : `Séances prévues · ${line}`,
        value: `${formatKcal(energy.trainingKcal)} kcal`,
        tag: measured
          ? "garmin"
          : result.estimations.some(
                (estimation) => typeof estimation.target === "number",
              )
            ? "estimation"
            : null,
      },
    ],
    neatEstimated,
  };
}

export function nutritionView(input: NutritionViewInput): NutritionView {
  const { results, sessions, today } = input;
  const first = results[0];
  if (!first || !first.ok)
    return {
      status: "missing",
      missing:
        first && !first.ok
          ? first.missing.map((field) => missingLabels[field])
          : [],
    };
  return {
    status: "ready",
    today: todayView(first, input),
    days: results.flatMap((result) => {
      if (!result.ok) return [];
      const session = mainSession(sessions, result.date);
      const fueling = result.fueling[0];
      return [
        {
          date: result.date,
          dateLabel: formatDayLabel(result.date),
          today: result.date === today,
          session: sessionLine(sessions, result.date),
          sessionHref: session ? sessionPanelHref(session.sessionKey) : null,
          dayType: result.dayType,
          dayTypeLabel: dayTypeLabels[result.dayType],
          energy: formatKcal(result.energy.displayKcal),
          carbs: `${formatRange(result.carbs.grams)} g`,
          protein: `${formatRange(result.protein.grams)} g`,
          fueling: fueling ? `${formatRange(fueling.totalGrams)} g` : null,
        },
      ];
    }),
  };
}
