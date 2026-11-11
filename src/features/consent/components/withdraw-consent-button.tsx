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
      <Button variant="outline" onClick={() => setOpen(true)}>
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
                className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-b-0 md:grid md:grid-cols-[5rem_1fr] md:gap-3.5 md:py-3"
              >
                <dt
                  className={
                    change.tone === "warning"
                      ? "font-medium text-warning"
                      : "font-medium text-primary"
                  }
                >
                  {change.label}
                </dt>
                <dd className="text-secondary-foreground">{change.body}</dd>
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
