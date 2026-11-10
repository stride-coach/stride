"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MonoLabel } from "@/components/stride/mono-label";
import { Button } from "@/components/ui/button";
import { withdrawHealthConsent } from "@/server/consent/actions";

export function WithdrawConsentButton({ contact }: { contact: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const changes = [
    {
      label: "S’arrête",
      tone: "warning" as const,
      body: "Je n’utilise plus ton sommeil, ta VFC, ta fréquence cardiaque ni les douleurs que tu signales. Stride ne demande plus de synchronisation à Garmin.",
    },
    {
      label: "Change",
      tone: "warning" as const,
      body: "Sans ces données, je ne peux pas te coacher : ton plan et tes séances restent en pause jusqu’à ce que tu donnes à nouveau ton accord. Les réglages restent accessibles.",
    },
    {
      label: "Reste",
      tone: "success" as const,
      body: `Les données déjà importées et ta connexion Garmin restent dans ton compte. Pour tout supprimer, écris-nous à ${contact}.`,
    },
  ];
  const run = () =>
    startTransition(async () => {
      const result = await withdrawHealthConsent().catch(() => ({
        status: "failed" as const,
      }));
      if (result.status === "withdrawn") {
        setOpen(false);
        toast.success("Consentement retiré.");
      } else if (result.status === "session-expired")
        router.replace("/sign-in");
      else toast.error("Le retrait a échoué. Réessaie dans un instant.");
    });
  return (
    <>
      <Button
        variant="destructive"
        className="max-md:w-full"
        onClick={() => setOpen(true)}
      >
        Retirer mon consentement
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="data-[size=default]:sm:max-w-140">
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer ton consentement ?</AlertDialogTitle>
            <AlertDialogDescription>
              Je ne pourrai plus utiliser tes données de santé. Voici ce qui
              change, précisément.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <dl className="flex flex-col">
            {changes.map((change) => (
              <div
                key={change.label}
                className="flex flex-col gap-0.75 border-b border-border py-2.25 text-body last:border-b-0 md:grid md:grid-cols-[4.375rem_1fr] md:gap-3.5 md:py-3.25"
              >
                <dt>
                  <MonoLabel
                    size="micro"
                    tone={change.tone === "warning" ? "warning" : undefined}
                    className={
                      change.tone === "success" ? "text-primary" : undefined
                    }
                  >
                    {change.label}
                  </MonoLabel>
                </dt>
                <dd>{change.body}</dd>
              </div>
            ))}
          </dl>
          <AlertDialogFooter>
            <AlertDialogAction
              variant="destructive"
              disabled={pending}
              onClick={(event) => {
                event.preventDefault();
                run();
              }}
            >
              Retirer mon consentement
            </AlertDialogAction>
            <AlertDialogCancel variant="outline" disabled={pending}>
              Garder mon accord
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
