import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { Status } from "@/components/stride/status";
import { Button } from "@/components/ui/button";
import { DataRow, DataSection } from "@/features/settings/components/data-rows";
import { SettingsHeading } from "@/features/settings/components/settings-shell";
import { WithdrawConsentButton } from "@/features/consent/components/withdraw-consent-button";
import { formatConsentDate } from "@/features/consent/health-consent";
import { publisher } from "@/features/public/publisher";
import { requireAthleteAccount } from "@/server/app/session";
import { readHealthConsent } from "@/server/consent/health-consent";
import { readStoredCounts } from "@/server/settings/data";

export const metadata: Metadata = {
  title: "Données et confidentialité · Réglages",
};

const documents = [
  {
    href: "/privacy",
    title: "Confidentialité",
    detail: "Données collectées, prestataires et tes droits",
  },
  {
    href: "/terms",
    title: "Conditions",
    detail: "Conditions d’utilisation du service",
  },
  {
    href: "/legal",
    title: "Mentions légales",
    detail: "Éditeur et hébergement",
  },
];

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
      <div className="flex flex-col gap-9">
        <DataSection id="privacy-stored" title="Ce que Stride conserve">
          <DataRow
            title="Activités et mesures Garmin"
            detail={`${counts.activities ?? "—"} activités et ${counts.observations ?? "—"} mesures de santé sont enregistrées dans ton compte.`}
          />
          <DataRow
            title="Profil, entraînement, objectifs et courses"
            detail="Tes réponses restent disponibles dans ton compte après connexion."
          />
        </DataSection>
        <DataSection id="privacy-consent" title="Consentement">
          <DataRow
            title="Consentement aux données de santé"
            detail={
              <span className="flex flex-col gap-1">
                <Status
                  level={consent.kind === "active" ? "ok" : "watch"}
                  className="text-label"
                >
                  {consent.kind === "active"
                    ? `Accordé le ${formatConsentDate(consent.grantedAt)}`
                    : consent.kind === "withdrawn"
                      ? `Retiré le ${formatConsentDate(consent.withdrawnAt)}`
                      : "Pas encore accordé"}
                </Status>
                <span>
                  Sommeil, VFC, fréquence cardiaque et douleurs signalées
                  servent uniquement à adapter ton entraînement.{" "}
                  {consent.kind === "active"
                    ? `Donné selon la politique de confidentialité du ${formatConsentDate(consent.policyVersion)}.`
                    : "Sans ton accord, ton coaching reste en pause."}
                </span>
              </span>
            }
            action={
              consent.kind === "active" ? (
                <WithdrawConsentButton contact={publisher.email} />
              ) : (
                <Button asChild>
                  <Link href="/consent">Donner mon accord</Link>
                </Button>
              )
            }
          />
        </DataSection>
        <DataSection id="privacy-copy" title="Ta copie">
          <DataRow
            title="Télécharger les réglages"
            detail="Profil, objectifs et courses au format JSON. Les activités Garmin ne sont pas incluses."
            action={
              <Button asChild variant="outline">
                <a href="/settings/export" download>
                  Télécharger le JSON
                </a>
              </Button>
            }
          />
        </DataSection>
        <DataSection id="privacy-documents" title="Documents">
          {documents.map((document) => (
            <Link
              key={document.href}
              href={document.href}
              className="flex min-h-row-touch items-center gap-4 border-b border-border py-3 transition-colors duration-150 ease-stride hover:bg-muted md:min-h-row"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-medium">{document.title}</span>
                <span className="text-label text-secondary-foreground">
                  {document.detail}
                </span>
              </span>
              <ChevronRightIcon
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground"
              />
            </Link>
          ))}
        </DataSection>
        <DataSection id="privacy-deletion" title="Suppression">
          <DataRow
            title="Supprimer ton compte ou tes données Garmin"
            detail={`Pas encore possible depuis les réglages. Écris-nous à ${publisher.email} : on supprime ce que tu demandes sous 30 jours et on te confirme par e-mail. Tes données sur Garmin ne sont pas touchées.`}
            action={
              <Button asChild variant="outline">
                <a
                  href={`mailto:${publisher.email}?subject=${encodeURIComponent("Suppression de mon compte Stride")}`}
                >
                  Écrire à l’équipe
                </a>
              </Button>
            }
          />
        </DataSection>
      </div>
    </>
  );
}
