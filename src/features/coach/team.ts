import { zonedEpoch } from "@/features/races/sun";
import type { SpecialistAgent, StaffAgent, StaffMember } from "./staff";

export type TeamProfile = {
  tagline: string;
  summary: (member: StaffMember) => string;
  listTitle: string;
  duties: (member: StaffMember) => readonly string[];
  reads: readonly string[];
};

export const teamProfiles: Record<StaffAgent, TeamProfile> = {
  coach: {
    tagline: "Mène le staff",
    summary: () =>
      "Ton entraînement au quotidien : la séance du jour, la semaine, les ajustements. C’est lui qui te répond en premier et qui passe la main au bon spécialiste.",
    listTitle: "Son rôle",
    duties: () => [
      "Lit chaque message et passe la main au bon spécialiste",
      "Rédige chaque proposition que tu valides",
    ],
    reads: ["Plan", "Historique", "Forme du jour", "Courses"],
  },
  medical: {
    tagline: "Récupération et signaux du corps",
    summary: () =>
      "Douleur, maladie, fatigue et risque de blessure. Santé a toujours le dernier mot quand ta santé est en jeu. Ce rôle ne pose pas de diagnostic.",
    listTitle: "Consulté quand",
    duties: () => [
      "Tu signales une douleur ou une maladie",
      "Ta récupération reste basse plusieurs jours",
      "Une demande touche une blessure passée",
    ],
    reads: ["Signalements", "Sommeil", "VFC", "Charge"],
  },
  director: {
    tagline: "Saison, objectifs et calendrier",
    summary: () =>
      "Ta saison dans son ensemble : le rôle de chaque course, l'espacement entre elles et ce qui est réaliste sur l'année.",
    listTitle: "Consulté quand",
    duties: () => [
      "Tu ajoutes, retires ou changes une course",
      "Un objectif semble hors de portée",
      "Deux courses se rapprochent trop",
    ],
    reads: ["Courses", "Plan", "Charge", "Faisabilité"],
  },
  strategist: {
    tagline: "Allures, ravitaillements et jour J",
    summary: () =>
      "Le parcours, ton objectif sur ce parcours et ta gestion de course : allures, montées, nuit et ravitaillements.",
    listTitle: "Consulté quand",
    duties: () => [
      "Tu parles du parcours ou de ton objectif",
      "Tu prépares ton allure de course",
      "La météo change la semaine de course",
    ],
    reads: ["Profil du parcours", "Météo", "Seuils", "Résultats"],
  },
  nutritionist: {
    tagline: "Glucides, hydratation et quotidien",
    summary: () =>
      "Énergie et glucides selon tes séances, charge glucidique avant course et ravitaillement pendant l'effort.",
    listTitle: "Consulté quand",
    duties: () => [
      "Tu demandes quoi manger avant ou après une séance",
      "Les jours avant une course longue",
      "Tu prépares ton plan de ravitaillement",
    ],
    reads: ["Profil", "Séances prévues", "Calories actives"],
  },
};

export type StaffUsage = {
  conversations: number;
  opinions: Record<SpecialistAgent, number>;
};

export function monthStart(now: Date, timeZone: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone }).format(now);
  return new Date(zonedEpoch(`${today.slice(0, 8)}01`, 0, timeZone));
}

export function conversationsLabel(count: number) {
  return count === 1 ? "conversation ce mois" : "conversations ce mois";
}

export const opinionsLabel = "avis ce mois";
