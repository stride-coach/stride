"use client";
import { CheckIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Status } from "@/components/stride/status";
import { StrideMark } from "@/components/stride/stride-mark";
import { signOut } from "@/server/auth/actions";
import { giveHealthConsent } from "@/server/consent/actions";
import { HealthConsentField } from "./health-consent-field";

const commitments = [
  {
    long: "Utilisées uniquement pour adapter ton entraînement.",
    short: "Uniquement pour adapter ton entraînement",
  },
  {
    long: "Jamais vendues, jamais utilisées pour de la publicité.",
    short: "Jamais vendues ni utilisées pour de la publicité",
  },
  {
    long: "Tu peux retirer ton accord à tout moment dans Réglages › Données et confidentialité.",
    short: "Retrait possible à tout moment dans Réglages",
  },
];

export function HealthConsentGate({
  email,
  withdrawnOn,
}: {
  email: string | null;
  withdrawnOn: string | null;
}) {
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [pending, startTransition] = useTransition();
  const submit = () =>
    startTransition(async () => {
      const result = await giveHealthConsent({ accepted: true }).catch(() => ({
        status: "failed" as const,
      }));
      if (result.status === "granted") router.replace("/");
      else if (result.status === "session-expired") router.replace("/sign-in");
      else toast.error("L’enregistrement a échoué. Réessaie dans un instant.");
    });
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex min-h-14 items-center gap-2.5 px-5 pt-4 pb-1.5 md:px-6 md:py-4.5">
        <StrideMark className="size-4.5 md:size-5" />
        <span className="text-title font-bold tracking-wider italic tabular-nums md:text-verdict">
          STRIDE
        </span>
        {email && (
          <span className="ml-auto hidden text-body text-muted-foreground md:inline">
            {email}
          </span>
        )}
      </header>
      <main className="flex flex-1 justify-center md:px-6 md:pt-10 md:pb-16">
        <section
          aria-labelledby="consent-title"
          className="flex w-full max-w-155 flex-col gap-4.5 md:gap-7"
        >
          <div className="flex flex-col gap-4.5 px-5 pt-5 md:gap-7 md:px-0 md:pt-0">
            {withdrawnOn && (
              <Status level="watch">
                Consentement retiré le {withdrawnOn}
              </Status>
            )}
            <div className="flex flex-col gap-2.5 md:gap-3.5">
              <p className="text-label font-medium text-muted-foreground max-md:hidden">
                Données de santé
              </p>
              <h1
                id="consent-title"
                className="text-verdict font-semibold text-balance md:text-display"
              >
                Ton accord pour continuer
              </h1>
              <p className="text-body text-secondary-foreground md:text-body-lg">
                Pour te coacher, je lis ton sommeil, ta VFC, ta fréquence
                cardiaque et les douleurs que tu signales.{" "}
                <span className="hidden md:inline">
                  Ce sont des données de santé : sans ton accord explicite,
                </span>
                <span className="md:hidden">Sans ton accord explicite,</span> je
                ne peux pas les utiliser, et ton coaching reste en pause.
              </p>
            </div>
            <ul className="border-y border-border">
              {commitments.map((item) => (
                <li
                  key={item.short}
                  className="grid grid-cols-[1rem_1fr] gap-2.5 border-b border-border py-2.5 last:border-b-0 md:gap-3 md:py-3"
                >
                  <CheckIcon
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 text-primary"
                  />
                  <span>
                    <span className="hidden md:inline">{item.long}</span>
                    <span className="md:hidden">{item.short}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-auto flex flex-col gap-3 border-t border-border px-5 pt-4 pb-7.5 md:mt-0 md:gap-7 md:border-0 md:p-0">
            <HealthConsentField checked={consent} onCheckedChange={setConsent}>
              <span className="hidden md:inline">
                Consentement explicite au sens de l’article 9 du RGPD.
              </span>
              <span className="md:hidden">Art. 9 du RGPD.</span>
            </HealthConsentField>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                className="w-full md:w-auto"
                disabled={!consent || pending}
                onClick={submit}
              >
                Donner mon accord
              </Button>
              <p className="hidden text-body text-muted-foreground md:block">
                Ton plan et tes séances reprennent aussitôt.
              </p>
            </div>
            <nav
              aria-label="Autres options"
              className="flex justify-center gap-5 text-body md:justify-start md:pt-2"
            >
              <Link
                href="/settings/privacy"
                className="flex min-h-control-touch items-center text-secondary-foreground hover:text-foreground md:min-h-control"
              >
                Réglages
              </Link>
              <Link
                href="/privacy"
                className="hidden min-h-control items-center text-secondary-foreground hover:text-foreground md:flex"
              >
                Politique de confidentialité
              </Link>
              <form
                action={async () => {
                  await signOut();
                }}
              >
                <button
                  type="submit"
                  className="flex min-h-control-touch items-center text-secondary-foreground hover:text-foreground md:min-h-control"
                >
                  Se déconnecter
                </button>
              </form>
            </nav>
          </div>
        </section>
      </main>
    </div>
  );
}
