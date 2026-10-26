"use client";
import { Button } from "@/components/ui/button";
import { Halo } from "@/components/stride/halo";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { completeOnboarding } from "@/server/onboarding/actions";
import { OnboardingActions } from "./onboarding-actions";
import { useOnboardingTransition } from "./use-onboarding-transition";
const stages = [
  {
    title: "Connecter Garmin",
    description: "Connecte-toi avec ton compte Garmin Connect.",
  },
  {
    title: "Je lis ton historique",
    description: "Ça continue pendant que tu avances.",
  },
  {
    title: "Tu complètes le reste",
    description: "Quelques taps, pas de longs formulaires.",
  },
  {
    title: "Découvre ton profil",
    description: "Vérifie ce que j’ai appris. Corrige-moi.",
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
    <div className="flex flex-1 flex-col lg:justify-center">
      <Halo
        viewBox="0 0 1160 984"
        preserveAspectRatio="xMaxYMin slice"
        path="M520,1040 C640,900 700,860 800,800 S900,600 960,500 S1060,300 1200,140"
        pool={{ cx: 998, cy: 118, r: 640 }}
        width={170}
        scrim="start"
        surface="inset"
        className="absolute inset-0 -z-10 hidden size-full lg:block"
      />
      <Halo
        viewBox="0 0 390 320"
        preserveAspectRatio="xMaxYMin slice"
        path="M120,250 C210,232 275,200 318,160 S376,112 420,98"
        pool={{ cx: 345, cy: 175, r: 125 }}
        width={80}
        trace={false}
        scrim="bottom"
        surface="inset"
        className="absolute top-0 right-0 -z-10 h-80 w-97.5 lg:hidden"
      />
      <div className="flex flex-1 flex-col gap-6 motion-safe:animate-rise lg:max-w-160 lg:flex-none lg:gap-10">
        <div className="flex flex-col gap-3.5 lg:gap-4.5">
          <StrideMark className="size-8.5 lg:size-10" strokeWidth="1.6" />
          <h1 className="text-[2.125rem] leading-none font-semibold tracking-[-0.035em] lg:text-display">
            Configurons ton coach.
          </h1>
          <p className="text-body text-pretty text-muted lg:text-lg lg:leading-relaxed">
            Un bon coach commence par comprendre comment tu t’entraînes.
            Connecte Garmin et je lis ton historique — des années de sorties, de
            sommeil et de récupération — pour que ton premier plan te
            corresponde déjà.
          </p>
        </div>
        <ol className="flex flex-col border-t border-border lg:grid lg:grid-cols-3">
          {stages.map((stage, index) => (
            <li
              key={stage.title}
              className="grid grid-cols-[1.875rem_1fr] gap-3 border-b border-border py-3.5 lg:flex lg:flex-col lg:gap-1.5 lg:border-0 lg:pt-4 lg:pr-4 lg:pb-0"
            >
              <span
                className={cn(
                  "font-metric text-metric font-semibold tabular-nums",
                  index === 0 ? "text-accent" : "text-muted-foreground",
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex flex-col gap-0.75 lg:gap-1.5">
                <span className="text-body font-semibold">{stage.title}</span>
                <span className="text-meta text-muted-foreground">
                  {stage.description}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <OnboardingActions>
          <Button
            className="w-full lg:w-auto lg:px-5.5"
            disabled={pending}
            aria-busy={pending}
            onClick={start}
          >
            {failed ? "Réessayer" : "C’est parti"}
          </Button>
          <span className="text-center text-xs text-muted-foreground lg:text-left lg:text-meta">
            Je ne modifie jamais ton plan sans te demander.
          </span>
        </OnboardingActions>
      </div>
    </div>
  );
}
