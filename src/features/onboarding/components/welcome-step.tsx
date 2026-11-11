"use client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/server/onboarding/actions";
import { OnboardingActions } from "./onboarding-actions";
import { useOnboardingTransition } from "./use-onboarding-transition";
const stages = [
  {
    title: "Connecter Garmin",
    description: "Avec ton compte Garmin Connect.",
  },
  {
    title: "Le staff lit ton historique",
    description: "Ça continue pendant que tu avances.",
  },
  {
    title: "Tu complètes le reste",
    description: "Quelques choix, pas de long formulaire.",
  },
  {
    title: "Tu découvres ton profil",
    description: "Tu vérifies ce que le staff a compris, et tu le corriges.",
  },
];
export function WelcomeStep({ revision }: { revision: number }) {
  const { pending, failed, run } = useOnboardingTransition();
  function start() {
    run(
      () => completeOnboarding({ step: "welcome", revision }),
      "L’enregistrement a échoué. Réessaie dans un instant.",
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-6 motion-safe:animate-rise">
      <div className="flex flex-col gap-2">
        <h1 className="text-verdict font-semibold text-balance">
          Configurons ton coach.
        </h1>
        <p className="text-body-lg text-pretty text-secondary-foreground">
          Un bon coach commence par comprendre comment tu t’entraînes. Connecte
          Garmin : le staff lit ton historique (des années de sorties, de
          sommeil et de récupération) pour que ton premier plan te corresponde
          déjà.
        </p>
      </div>
      <ol className="flex flex-col border-t border-border">
        {stages.map((stage, index) => (
          <li
            key={stage.title}
            className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-2 border-b border-border py-2.5"
          >
            <span
              className={cn(
                "font-semibold tabular-nums",
                index === 0 ? "text-primary" : "text-muted-foreground",
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-medium">{stage.title}</span>
              <span className="text-label text-secondary-foreground">
                {stage.description}
              </span>
            </span>
          </li>
        ))}
      </ol>
      <OnboardingActions>
        <Button
          className="w-full lg:w-auto"
          disabled={pending}
          aria-busy={pending}
          onClick={start}
        >
          {failed ? "Réessayer" : "C’est parti"}
        </Button>
        <span className="text-center text-label text-muted-foreground lg:text-left">
          Je ne modifie jamais ton plan sans te demander.
        </span>
      </OnboardingActions>
    </div>
  );
}
