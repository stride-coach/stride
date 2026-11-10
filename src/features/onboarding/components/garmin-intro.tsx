import {
  ActivityIcon,
  ArrowRightIcon,
  TrendingUpIcon,
  WavesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { HealthConsentField } from "@/features/consent/components/health-consent-field";
import { AsideList, SecureNote, StepHeading, StepLayout } from "./garmin-parts";
import { OnboardingActions } from "./onboarding-actions";

const signals = [
  {
    icon: ActivityIcon,
    title: "Toutes tes activités enregistrées",
    short: "Toutes tes activités",
    body: "Sorties route et trail, randonnées, sorties vélo et cross-training — avec allure, fréquence cardiaque, dénivelé, cadence, puissance, tours et parcours.",
    shortBody:
      "Route, trail, rando, vélo — allure, FC, dénivelé, tours, parcours",
  },
  {
    icon: WavesIcon,
    title: "Récupération et santé",
    short: "Récupération",
    body: "Sommeil, VFC, fréquence cardiaque au repos, stress, Body Battery et disponibilité à l’entraînement.",
    shortBody: "Sommeil, VFC, FC au repos, stress, Body Battery",
  },
  {
    icon: TrendingUpIcon,
    title: "Ta forme sur la durée",
    short: "Des années de forme",
    body: "VO₂ max, charge et statut d’entraînement, courses et records — aussi loin que Garmin les conserve, souvent plusieurs années.",
    shortBody:
      "VO₂ max, charge, courses et records — aussi loin que Garmin conserve",
  },
];

export function GarminIntro({
  consent,
  onConsentChange,
  onStart,
}: {
  consent: boolean;
  onConsentChange: (consent: boolean) => void;
  onStart: () => void;
}) {
  return (
    <StepLayout
      aside={
        <>
          <section
            aria-label="Comment tout s’articule"
            className="flex flex-col gap-6 rounded-xl border border-border p-7"
          >
            <h2 className="text-label text-muted-foreground tabular-nums">
              Comment tout s’articule
            </h2>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="flex flex-col gap-1.5 rounded-lg border border-control-border p-4">
                <span className="text-body font-semibold">Garmin</span>
                <span className="text-label text-muted-foreground">
                  Envoie les signaux : sorties, sommeil, VFC, FC
                </span>
              </div>
              <ArrowRightIcon
                aria-hidden="true"
                className="size-5 text-primary"
              />
              <div className="flex flex-col gap-1.5 rounded-lg border border-primary p-4">
                <span className="text-body font-semibold">
                  Ton modèle d’athlète
                </span>
                <span className="text-label text-muted-foreground">
                  Construit par Stride à partir des signaux, de tes réponses, de
                  tes objectifs et de ta réaction à l’entraînement
                </span>
              </div>
            </div>
            <p className="text-body text-secondary-foreground">
              Garmin fournit les signaux. Stride construit le modèle d’athlète —
              et l’affine chaque jour.
            </p>
          </section>
          <AsideList
            title="La suite · environ une minute"
            numbered
            items={[
              {
                body: "Connecte-toi avec l’e-mail et le mot de passe Garmin Connect",
              },
              {
                body: "Saisis un code de vérification — seulement si Garmin en demande un",
              },
              { body: "Connecté — je commence à lire ton historique" },
            ]}
          />
          <p className="text-label text-muted-foreground">
            Ton mot de passe Garmin sert uniquement à te connecter. Stride garde
            la connexion, pas le mot de passe.
          </p>
        </>
      }
    >
      <StepHeading title="Connecter Garmin">
        Stride s’appuie sur ton historique d’entraînement et de récupération
        pour comprendre comment tu t’entraînes, récupères et progresses.{" "}
        <span className="hidden lg:inline">
          Sans lui, je coacherais un inconnu — cette étape est donc obligatoire.
        </span>
        <span className="lg:hidden">Cette étape est obligatoire.</span>
      </StepHeading>
      <ul className="flex flex-col border-t border-border">
        {signals.map(({ icon: Icon, ...signal }) => (
          <li
            key={signal.title}
            className="grid grid-cols-[1.25rem_1fr] gap-x-4 border-b border-border py-3.5 lg:py-4.5"
          >
            <Icon aria-hidden="true" className="mt-0.5 size-5" />
            <span className="flex flex-col gap-1">
              <span className="text-body font-semibold">
                <span className="hidden lg:inline">{signal.title}</span>
                <span className="lg:hidden">{signal.short}</span>
              </span>
              <span className="text-body text-muted-foreground lg:text-body">
                <span className="hidden lg:inline">{signal.body}</span>
                <span className="lg:hidden">{signal.shortBody}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
      <OnboardingActions className="lg:flex-col lg:items-stretch lg:gap-4">
        <HealthConsentField checked={consent} onCheckedChange={onConsentChange}>
          <span className="hidden lg:inline">
            Consentement explicite au sens de l’article 9 du RGPD, obligatoire
            pour connecter Garmin. Tu peux le retirer à tout moment dans
            Réglages › Données et confidentialité.
          </span>
          <span className="lg:hidden">
            Obligatoire pour connecter Garmin (art. 9 du RGPD). Retrait possible
            à tout moment dans Réglages.
          </span>
        </HealthConsentField>
        <Button
          className="w-full lg:w-auto lg:self-start lg:px-5.5"
          disabled={!consent}
          aria-describedby="garmin-consent-required"
          onClick={onStart}
        >
          Connecter Garmin
        </Button>
        <p
          id="garmin-consent-required"
          className="text-center text-label text-muted-foreground lg:text-left lg:text-body"
        >
          {!consent && "Coche la case pour continuer. "}
          Ensuite : connecte-toi à ton compte Garmin Connect
          <span className="hidden lg:inline">, ici même.</span>
          <span className="lg:hidden">.</span>
        </p>
        <div className="hidden lg:block">
          <SecureNote>
            Lecture seule. Stride ne publie jamais sur Garmin. Déconnecte-toi
            quand tu veux dans Réglages.
          </SecureNote>
        </div>
      </OnboardingActions>
    </StepLayout>
  );
}
