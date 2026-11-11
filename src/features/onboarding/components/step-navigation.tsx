"use client";
import { ArrowLeftIcon, CheckIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Relief } from "@/components/stride/relief";
import { StepperSegments } from "@/components/stride/stepper";
import { Status } from "@/components/stride/status";
import { StrideMark } from "@/components/stride/stride-mark";
import type { StepStatus } from "@/components/stride/steps";
import {
  connectionNotice,
  isStepAllowed,
  onboardingSteps,
  stepLabels,
  type OnboardingConnection,
  type OnboardingStep,
} from "@/features/onboarding/progress";
import {
  isGarminLive,
  mobileStatus,
  remainingTime,
  showsConnectedBadge,
  stepLine,
  stepStatuses,
  summarizeImport,
  type LineTone,
  type ShellState,
} from "@/features/onboarding/shell-status";
import { cn } from "@/lib/utils";
import type { ProgressSnapshot } from "@/features/onboarding/schemas";
import { navigateOnboarding } from "@/server/onboarding/actions";
import { ImportCard } from "./import-card";
import { useOnboardingStatus } from "./onboarding-status";
import { useOnboardingTransition } from "./use-onboarding-transition";
const statusLabels: Record<StepStatus, string> = {
  done: "Terminée",
  current: "Étape actuelle",
  background: "En cours",
  upcoming: "À venir",
};
const toneClasses: Record<LineTone | "accent", string> = {
  muted: "text-muted-foreground",
  success: "text-primary",
  warning: "text-warning",
  accent: "text-primary",
};
export function StepNavigation({
  progress,
  step,
  email,
  connection,
  children,
}: {
  progress: ProgressSnapshot;
  step: OnboardingStep;
  email: string | null;
  connection: OnboardingConnection;
  children: React.ReactNode;
}) {
  const { pending, run } = useOnboardingTransition();
  const { garminPhase, sync } = useOnboardingStatus();
  const notice = connectionNotice(connection);
  const live = notice === "connected" || garminPhase === "connected";
  const shell: ShellState = {
    progress,
    step,
    garminPhase,
    connected: notice === "connected",
    reconnect: notice === "reconnect" && garminPhase !== "connected",
    sync: live ? summarizeImport(sync.observation, sync.unavailable) : null,
  };
  const position = onboardingSteps.indexOf(step);
  const statuses = stepStatuses(shell);
  const segments = statuses.map((status, index) =>
    index === position ? "current" : status,
  );
  const status = mobileStatus(shell);
  const previous = onboardingSteps
    .slice(0, position)
    .reverse()
    .find((target) => isStepAllowed(progress, target));
  function navigate(target: OnboardingStep) {
    run(
      () => navigateOnboarding({ step: target, revision: progress.revision }),
      "La navigation a échoué. Réessaie dans un instant.",
    );
  }
  return (
    <div
      lang="fr"
      className="relative flex min-h-svh bg-background lg:bg-shell"
    >
      <Relief corner="bottom-left" className="max-lg:hidden print:hidden" />
      <aside
        aria-label="Configuration de ton coach"
        className="sticky top-0 hidden h-svh w-66 shrink-0 flex-col gap-6 overflow-y-auto px-4 py-5 lg:flex"
      >
        <span className="flex items-center gap-2 font-semibold">
          <StrideMark /> Stride
        </span>
        <p className="flex flex-col gap-0.5 text-label text-muted-foreground">
          <span>Configuration de ton coach</span>
          <span className="tabular-nums">
            Étape {position + 1} sur 6 · {remainingTime(shell)}
          </span>
        </p>
        <nav aria-label="Étapes du parcours" aria-busy={pending}>
          <ol className="flex flex-col gap-0.5">
            {onboardingSteps.map((target, index) => {
              const line = stepLine(shell, target);
              const itemStatus = statuses[index];
              return (
                <li
                  key={target}
                  data-status={itemStatus}
                  aria-current={itemStatus === "current" ? "step" : undefined}
                  className="grid grid-cols-[14px_minmax(0,1fr)] items-start gap-x-2.5 py-1.5"
                >
                  <StepMark status={itemStatus} />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className={cn(
                        itemStatus === "current"
                          ? "font-medium text-foreground"
                          : "text-secondary-foreground",
                      )}
                    >
                      <button
                        type="button"
                        className="rounded-sm text-left disabled:cursor-default disabled:opacity-100"
                        aria-disabled={!isStepAllowed(progress, target)}
                        disabled={pending || !isStepAllowed(progress, target)}
                        onClick={() => navigate(target)}
                      >
                        {stepLabels[target]}
                      </button>
                      <span className="sr-only">
                        , {statusLabels[itemStatus]}
                      </span>
                    </span>
                    {line && (
                      <span
                        className={cn("text-label", toneClasses[line.tone])}
                      >
                        {line.text}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ol>
        </nav>
        {isGarminLive(shell) && shell.sync ? (
          <ImportCard summary={shell.sync} />
        ) : (
          email && (
            <p className="mt-auto flex flex-col gap-0.5">
              <span className="text-label text-muted-foreground">
                Connecté en tant que
              </span>
              <span className="break-all">{email}</span>
            </p>
          )
        )}
      </aside>
      <main
        id="onboarding-content"
        className="relative isolate flex min-w-0 flex-1 flex-col overflow-clip bg-background lg:my-2 lg:mr-2 lg:rounded-xl lg:border lg:border-border lg:bg-background/70"
      >
        <header className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:min-h-header lg:flex-row lg:items-center lg:gap-3 lg:px-5 lg:py-2">
          {previous && step === "profile" && (
            <Button
              variant="ghost"
              className="hidden lg:inline-flex"
              disabled={pending}
              aria-busy={pending}
              onClick={() => navigate(previous)}
            >
              <ArrowLeftIcon data-icon="inline-start" />
              Retour
            </Button>
          )}
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 font-semibold lg:hidden">
              <StrideMark /> Stride
            </span>
            <span className="text-label text-muted-foreground tabular-nums max-lg:hidden">
              Étape {position + 1} sur 6
            </span>
            <span
              className={cn(
                "flex items-center gap-1.5 text-label lg:hidden",
                toneClasses[status.tone],
              )}
            >
              <span className="text-muted-foreground tabular-nums">
                Étape {position + 1} sur 6 ·
              </span>
              {status.tone === "success" && (
                <CheckIcon aria-hidden="true" className="size-3.5" />
              )}
              {status.tone === "accent" && (
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-primary"
                />
              )}
              {status.text}
            </span>
          </div>
          <StepperSegments
            statuses={segments}
            currentProgress={1}
            aria-label="Progression du parcours"
            aria-valuetext={`Étape ${position + 1} sur 6`}
            className="w-full lg:max-w-60"
          />
          {showsConnectedBadge(shell) && (
            <Status level="ok" className="ml-auto max-lg:hidden">
              Garmin connecté
            </Status>
          )}
          <nav aria-label="Changer d’étape" className="lg:hidden">
            <label htmlFor="onboarding-step" className="sr-only">
              Étape du parcours
            </label>
            <select
              id="onboarding-step"
              value={step}
              disabled={pending}
              onChange={(event) =>
                navigate(event.target.value as OnboardingStep)
              }
              className="h-control-touch w-full rounded-lg border border-input bg-card px-3"
            >
              {onboardingSteps.map((target) => (
                <option
                  key={target}
                  value={target}
                  disabled={!isStepAllowed(progress, target)}
                >
                  {stepLabels[target]}
                </option>
              ))}
            </select>
          </nav>
        </header>
        <div className="flex flex-1 flex-col px-4 py-6 lg:px-5 lg:py-12">
          <div className="mx-auto flex w-full max-w-140 flex-1 flex-col gap-6">
            {previous && (
              <Button
                variant="ghost"
                className={cn(
                  "-ml-2.5 self-start",
                  step === "profile" && "lg:hidden",
                )}
                disabled={pending}
                aria-busy={pending}
                onClick={() => navigate(previous)}
              >
                <ArrowLeftIcon data-icon="inline-start" />
                Retour
              </Button>
            )}
            {pending && (
              <p role="status" className="sr-only">
                Navigation en cours
              </p>
            )}
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

function StepMark({ status }: { status: StepStatus }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-0.75 size-3.5 shrink-0 rounded-full border-[1.5px]",
        status === "done" && "border-primary bg-primary",
        status === "current" &&
          "border-warning bg-[linear-gradient(90deg,transparent_50%,var(--warning)_50%)]",
        status === "background" && "border-dashed border-primary",
        status === "upcoming" && "border-muted-foreground",
      )}
    />
  );
}
