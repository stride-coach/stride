import Link from "next/link";
import {
  LegalTable,
  type LegalSection,
} from "@/features/public/components/legal-document";
import { formatConsentDate } from "@/features/consent/health-consent";
import { privacyPolicyVersion, publisher } from "@/features/public/publisher";

const contact = <a href={`mailto:${publisher.email}`}>{publisher.email}</a>;

export const privacySections: readonly LegalSection[] = [
  {
    id: "responsable",
    title: "Responsable du traitement",
    toc: "Responsable",
    content: (
      <p>
        Stride est un projet personnel, gratuit et non commercial, édité par un
        particulier (<a href={publisher.github}>{publisher.githubLabel}</a>).
        Contact : {contact}.
      </p>
    ),
  },
  {
    id: "donnees",
    title: "Données collectées",
    content: (
      <ul>
        <li>
          <strong>Compte</strong> : nom, adresse e-mail, mot de passe (stocké
          sous forme chiffrée).
        </li>
        <li>
          <strong>Profil d’athlète</strong> : date de naissance, sexe, zones
          cardiaques, disponibilités, objectifs, courses et matériel.
        </li>
        <li>
          <strong>Données Garmin</strong>, une fois ton compte connecté :
          activités (tracé GPS, allure, fréquence cardiaque, dénivelé), sommeil,
          variabilité de la fréquence cardiaque, fréquence cardiaque au repos,
          Body Battery, stress, disponibilité à l’entraînement et chaussures.
        </li>
        <li>
          <strong>Ce que tu saisis</strong> : check-ins, douleurs signalées,
          débriefs de séance, messages au staff.
        </li>
        <li>
          <strong>Données techniques</strong> : journaux de connexion et, si tu
          les actives, abonnements aux notifications push.
        </li>
      </ul>
    ),
  },
  {
    id: "sante",
    title: "Données de santé",
    content: (
      <>
        <p>
          Sommeil, VFC, fréquence cardiaque et douleurs sont des données de
          santé au sens de l’article 9 du RGPD. Stride ne les traite qu’avec ton{" "}
          <strong>consentement explicite</strong>, donné en cochant une case
          dédiée lorsque tu connectes Garmin, et uniquement pour adapter ton
          entraînement. Stride enregistre la date de ton accord et la version de
          cette politique ({formatConsentDate(privacyPolicyVersion)}).
        </p>
        <p>
          Tu peux retirer ce consentement à tout moment dans{" "}
          <Link href="/settings/privacy">
            Réglages › Données et confidentialité
          </Link>
          . Stride cesse alors d’utiliser ces données et de demander des
          synchronisations à Garmin, et ton coaching reste en pause jusqu’à un
          nouvel accord. La connexion Garmin et les données déjà importées
          restent dans ton compte jusqu’à ta demande de suppression, à adresser
          à {contact}.
        </p>
        <p>
          Stride n’est pas un dispositif médical et ne pose aucun diagnostic.
        </p>
      </>
    ),
  },
  {
    id: "finalites",
    title: "Finalités et bases légales",
    content: (
      <>
        <LegalTable
          head={["Finalité", "Base légale"]}
          rows={[
            [
              "Fournir le plan, l’analyse des séances et le staff",
              "Exécution du contrat (conditions d’utilisation)",
            ],
            [
              "Adapter le plan à ta récupération et à tes douleurs",
              "Consentement explicite (art. 9.2.a)",
            ],
            ["Sécuriser le service et prévenir les abus", "Intérêt légitime"],
            ["Répondre à tes demandes", "Exécution du contrat"],
          ]}
        />
        <p>
          Tes données ne sont jamais vendues ni utilisées pour de la publicité.
        </p>
      </>
    ),
  },
  {
    id: "prestataires",
    title: "Prestataires et transferts",
    content: (
      <>
        <LegalTable
          head={["Prestataire", "Rôle", "Localisation"]}
          rows={[
            [
              "Supabase",
              "Base de données, authentification, e-mails de compte",
              "Union européenne (Paris)",
            ],
            [
              "Anthropic",
              "Génération des réponses du staff (modèle Claude)",
              "États-Unis · clauses contractuelles types",
            ],
            [
              publisher.appHost,
              "Exécution de l’application web",
              publisher.appHostCountry,
            ],
            [
              "Google, Apple, Mozilla",
              "Acheminement des notifications push, contenu chiffré",
              "Selon ton navigateur",
            ],
            [
              "Open-Meteo",
              "Prévisions météo à partir du lieu d’une course, sans donnée te concernant",
              "Union européenne",
            ],
          ]}
        />
        <p>
          Garmin n’est pas un prestataire de Stride : c’est la source de tes
          données, que tu autorises toi-même. Son utilisation relève de la
          politique de confidentialité de Garmin.
        </p>
      </>
    ),
  },
  {
    id: "ia",
    title: "Contenus générés par IA",
    content: (
      <p>
        Les messages et propositions du staff sont rédigés par un modèle d’IA à
        partir de ton dossier d’athlète. Seules les données utiles à la question
        sont transmises. Anthropic n’utilise pas les données reçues via son API
        pour entraîner ses modèles.
      </p>
    ),
  },
  {
    id: "conservation",
    title: "Conservation",
    content: (
      <ul>
        <li>
          Tant que ton compte existe, tes données restent disponibles pour
          suivre ta progression.
        </li>
        <li>À la déconnexion de Garmin, la collecte s’arrête immédiatement.</li>
        <li>
          À la suppression du compte, tes données sont effacées sous 30 jours,
          sauvegardes comprises.
        </li>
        <li>
          Un compte inactif depuis 3 ans est supprimé après un e-mail
          d’avertissement.
        </li>
      </ul>
    ),
  },
  {
    id: "droits",
    title: "Tes droits",
    content: (
      <>
        <p>
          Tu peux accéder à tes données, les rectifier, les exporter, les
          effacer, limiter ou t’opposer à leur traitement, et retirer ton
          consentement. Écris à {contact} : réponse sous un mois. Une partie de
          ces actions est disponible dans{" "}
          <Link href="/settings/privacy">
            Réglages › Données et confidentialité
          </Link>
          .
        </p>
        <p>
          Si tu estimes que tes droits ne sont pas respectés, tu peux saisir la{" "}
          <a href="https://www.cnil.fr">CNIL</a>.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "Cookies",
    content: (
      <p>
        Stride n’utilise que des cookies nécessaires au service : ta session de
        connexion et l’état de la barre latérale. Ta préférence de thème et tes
        brouillons d’onboarding restent dans ton navigateur. Aucun cookie
        publicitaire ni de mesure d’audience, donc aucun bandeau.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact et modifications",
    toc: "Contact",
    content: (
      <p>
        Pour toute question : {contact}. En cas de changement important, tu
        seras prévenu par e-mail ou dans l’application avant son entrée en
        vigueur.
      </p>
    ),
  },
];
