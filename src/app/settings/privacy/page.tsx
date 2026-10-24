import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  SettingsGroup,
  SettingsHeading,
  SettingsLinkRow,
} from "@/features/settings/components/settings-shell";
import { WithdrawConsentButton } from "@/features/consent/components/withdraw-consent-button";
import { formatConsentDate } from "@/features/consent/health-consent";
import { publisher } from "@/features/public/publisher";
import { requireAthleteAccount } from "@/server/app/session";
import { readHealthConsent } from "@/server/consent/health-consent";
import { readStoredCounts } from "@/server/settings/data";

export const metadata: Metadata = {
  title: "Données et confidentialité · Réglages",
};

export default async function PrivacySettingsPage() {
  const context = await requireAthleteAccount();
  const [counts, consent] = await Promise.all([
    readStoredCounts(context),
    readHealthConsent(context),
  ]);
  return (
    <>
      <SettingsHeading
        title="Données et confidentialité"
        description="Tes données ne servent qu’à te coacher. Elles ne sont jamais vendues ni utilisées pour de la publicité. Tu peux télécharger une copie de tes réglages ou demander la suppression de ton compte."
      />
      <SettingsGroup title="Enregistré dans Stride">
        <div className="border-b border-border p-4 md:px-0">
          <strong className="text-sm">Activités et mesures Garmin</strong>
          <p className="mt-1 text-sm text-muted">
            {counts.activities ?? "—"} activités et {counts.observations ?? "—"}{" "}
            mesures de santé sont enregistrées dans ton compte.
          </p>
        </div>
        <div className="p-4 md:px-0">
          <strong className="text-sm">
            Profil, entraînement, objectifs et courses
          </strong>
          <p className="mt-1 text-sm text-muted">
            Tes réponses restent disponibles dans ton compte après connexion.
          </p>
        </div>
      </SettingsGroup>
      <SettingsGroup title="Consentement aux données de santé">
        <div className="flex flex-wrap items-center gap-4 p-4 md:px-0">
          <div className="min-w-0 flex-1 basis-80">
            <strong className="flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className={
                  consent.kind === "active"
                    ? "size-1.75 rounded-full bg-success"
                    : "size-1.75 rounded-full bg-warning"
                }
              />
              {consent.kind === "active"
                ? `Accordé le ${formatConsentDate(consent.grantedAt)}`
                : consent.kind === "withdrawn"
                  ? `Retiré le ${formatConsentDate(consent.withdrawnAt)}`
                  : "Pas encore accordé"}
            </strong>
            <p className="mt-1 text-sm text-muted">
              Sommeil, VFC, fréquence cardiaque et douleurs signalées servent
              uniquement à adapter ton entraînement.{" "}
              {consent.kind === "active"
                ? `Donné selon la politique de confidentialité du ${formatConsentDate(consent.policyVersion)}.`
                : "Sans ton accord, ton coaching reste en pause."}
            </p>
          </div>
          {consent.kind === "active" ? (
            <WithdrawConsentButton contact={publisher.email} />
          ) : (
            <Button asChild className="max-md:w-full">
              <Link href="/consent">Donner mon accord</Link>
            </Button>
          )}
        </div>
      </SettingsGroup>
      <SettingsGroup title="Ta copie">
        <div className="flex flex-wrap items-center gap-4 p-4 md:px-0">
          <div className="flex-1">
            <strong className="text-sm">Télécharger les réglages</strong>
            <p className="mt-1 text-sm text-muted">
              Profil, objectifs et courses au format JSON. Les activités Garmin
              ne sont pas incluses.
            </p>
          </div>
          <Button asChild variant="secondary">
            <a href="/settings/export" download>
              Télécharger le JSON
            </a>
          </Button>
        </div>
      </SettingsGroup>
      <SettingsGroup title="Documents">
        <SettingsLinkRow
          href="/privacy"
          title="Confidentialité"
          detail="Données collectées, prestataires et tes droits"
        />
        <SettingsLinkRow
          href="/terms"
          title="Conditions"
          detail="Conditions d’utilisation du service"
        />
        <SettingsLinkRow
          href="/legal"
          title="Mentions légales"
          detail="Éditeur et hébergement"
        />
      </SettingsGroup>
      <SettingsGroup title="Suppression">
        <div className="flex flex-wrap items-center gap-4 p-4 md:px-0">
          <div className="min-w-0 flex-1 basis-80">
            <strong className="text-sm">
              Supprimer ton compte ou tes données Garmin
            </strong>
            <p className="mt-1 text-sm text-muted">
              Pas encore possible depuis les réglages. Écris-nous à{" "}
              {publisher.email} : on supprime ce que tu demandes sous 30 jours
              et on te confirme par e-mail. Tes données sur Garmin ne sont pas
              touchées.
            </p>
          </div>
          <Button asChild variant="outline" className="max-md:w-full">
            <a
              href={`mailto:${publisher.email}?subject=${encodeURIComponent("Suppression de mon compte Stride")}`}
            >
              Écrire à l’équipe
            </a>
          </Button>
        </div>
      </SettingsGroup>
    </>
  );
}
