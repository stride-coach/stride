import {
  isAnswered,
  requiredProfileFields,
  type ProfileField,
  type ProfileValues,
} from "@/features/onboarding/profile";
import { displayTimeZone } from "@/features/app-shell/shell";
import type { AthleteProfileView } from "@/features/onboarding/athlete-profile";
import type { ProfileMetric } from "./profile";

export type AthleteModelCounts = {
  garmin: number;
  athlete: number;
  estimate: number;
};

export function athleteModelCounts(
  view: AthleteProfileView,
): AthleteModelCounts {
  const facts = view.sections.flatMap((section) => section.facts);
  const observed = facts.filter((fact) => fact.value !== null);
  return {
    garmin: observed.filter((fact) => fact.source === "garmin").length,
    athlete: observed.filter((fact) => fact.source === "athlete").length,
    estimate:
      facts.length -
      observed.length +
      (view.heartRateZones ? 1 : 0) +
      view.habits.items.length,
  };
}

export type AthleteModelQuestion = {
  key: string;
  question: string;
  impact: string;
  href: string;
  action: "Répondre" | "Choisir";
};

const fieldQuestions: Record<
  Exclude<ProfileField, "training_access">,
  Pick<AthleteModelQuestion, "question" | "impact" | "href">
> = {
  first_name: {
    question: "Comment t’appelles-tu ?",
    impact: "Prénom manquant · pour que le staff s’adresse à toi",
    href: "/settings/profile#first_name",
  },
  birth_date: {
    question: "Quelle est ta date de naissance ?",
    impact: "Âge inconnu · sert aux estimations liées à l’âge",
    href: "/settings/profile#birth_date",
  },
  sex: {
    question: "Quel est ton sexe ?",
    impact: "Non renseigné · affine l’estimation de ta FC max",
    href: "/settings/profile#profile-sex",
  },
  height_cm: {
    question: "Quelle est ta taille ?",
    impact: "Taille manquante · sert à estimer ta dépense énergétique",
    href: "/settings/profile#height_cm",
  },
  weight_kg: {
    question: "Quel est ton poids ?",
    impact: "Poids manquant · sert à la dépense énergétique et à la nutrition",
    href: "/settings/profile#weight_kg",
  },
  primary_terrain: {
    question: "Route, trail ou les deux ?",
    impact: "Discipline inconnue · oriente le type de séances",
    href: "/settings/training#t-type",
  },
  available_weekdays: {
    question: "Quels jours peux-tu courir ?",
    impact: "Jours inconnus · place les séances de ta semaine",
    href: "/settings/training#t-days",
  },
  long_run_day: {
    question: "Quel jour pour la sortie longue ?",
    impact: "Jour inconnu · place ta séance la plus longue",
    href: "/settings/training#t-long",
  },
  weekday_session_minutes: {
    question: "Combien de temps as-tu en semaine ?",
    impact: "Durée des séances inconnue · évite des séances trop longues",
    href: "/settings/training#t-time",
  },
};

export function athleteModelQuestions(
  view: AthleteProfileView,
  values: ProfileValues,
  metrics: ProfileMetric[],
): AthleteModelQuestion[] {
  const missing = (key: ProfileMetric["key"]) =>
    metrics.some((metric) => metric.key === key && metric.value === null);
  const questions: AthleteModelQuestion[] = [];
  if (missing("maximum"))
    questions.push({
      key: "maximum",
      question: "Quelle est ta FC max ?",
      impact:
        "Aucune course récente ne l’a relevée · fixe toutes tes zones cardio",
      href: "/settings/profile#entrainement",
      action: "Répondre",
    });
  if (missing("threshold"))
    questions.push({
      key: "threshold",
      question: "Quelle est ta FC au seuil ?",
      impact: "Inconnue pour l’instant · rendrait tes zones cardio plus justes",
      href: "/settings/profile#entrainement",
      action: "Répondre",
    });
  if (
    view.sections.some((section) =>
      section.facts.some((fact) => fact.key === "focus" && fact.value === null),
    )
  )
    questions.push({
      key: "focus",
      question: "Sur quoi veux-tu progresser cette saison ?",
      impact: "Aucun objectif principal · oriente la structure du plan",
      href: "/settings/training#objectif",
      action: "Choisir",
    });
  for (const field of requiredProfileFields) {
    if (field === "training_access" || isAnswered(values, field)) continue;
    questions.push({
      key: field,
      action: "Répondre",
      ...fieldQuestions[field],
    });
  }
  return questions;
}

const memberSince = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
  timeZone: displayTimeZone,
});

export function formatMemberSince(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : memberSince.format(date);
}
