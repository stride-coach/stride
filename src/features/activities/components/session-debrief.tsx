import { InfoIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/stride/mono-label";
import { StrideMark } from "@/components/stride/stride-mark";
import { zoneFills } from "@/components/stride/session-shape";
import { cn } from "@/lib/utils";
import type {
  DebriefStatusTone,
  DebriefStepView,
  DebriefView,
} from "@/features/plans/debrief/view";

const chipTones: Record<DebriefStatusTone, string> = {
  success: "border-border bg-card text-primary",
  warning: "border-border bg-card text-warning",
  danger: "border-border bg-card text-destructive",
};

const actualTones: Record<DebriefStepView["actualTone"], string> = {
  default: "",
  danger: "text-destructive",
  warning: "text-warning",
};

export function DebriefVerdict({
  debrief,
  pct,
  detail,
}: {
  debrief: DebriefView;
  pct: number | null;
  detail: string | null;
}) {
  const warning = debrief.verdict.tone === "warning";
  return (
    <section
      aria-labelledby="debrief-verdict"
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-3.5 sm:gap-2.5 sm:px-4"
    >
      <div className="flex items-start gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <MonoLabel
            size="nano"
            className={warning ? "text-warning" : "text-primary"}
          >
            Débrief
          </MonoLabel>
          <span id="debrief-verdict" className="text-title font-semibold">
            {debrief.verdict.title}
          </span>
          <span className="text-body text-secondary-foreground">
            {debrief.verdict.body}
          </span>
        </span>
        {pct !== null && (
          <span className="flex shrink-0 flex-col items-end">
            <span
              className={cn(
                "text-metric font-semibold tabular-nums",
                warning ? "text-warning" : "text-primary",
              )}
            >
              {pct} %
            </span>
            <MonoLabel size="nano">conforme</MonoLabel>
          </span>
        )}
      </div>
      {detail && (
        <span className="text-label text-muted-foreground">{detail}</span>
      )}
    </section>
  );
}

export function DebriefNote({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="note"
      className="flex items-start gap-2.5 rounded-lg border border-border bg-muted px-3.5 py-3 text-body text-secondary-foreground"
    >
      <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      {children}
    </p>
  );
}

function StepStatus({ step }: { step: DebriefStepView }) {
  if (!step.status) return <span />;
  if (!step.status.chip)
    return (
      <span className="inline-flex items-center gap-1.5 justify-self-end text-label text-muted-foreground">
        <span
          aria-hidden="true"
          className="inline-block size-1.5 rounded-full bg-primary"
        />
        {step.status.label}
      </span>
    );
  return (
    <span
      className={cn(
        "inline-flex min-h-6 items-center justify-self-end rounded-full border px-2 text-label whitespace-nowrap sm:px-2.25",
        chipTones[step.status.tone],
      )}
    >
      {step.status.label}
    </span>
  );
}

export function DebriefSteps({
  steps,
  title = "Étape par étape",
}: {
  steps: DebriefStepView[];
  title?: string;
}) {
  const grid =
    "grid grid-cols-[4px_minmax(0,1fr)_auto_5.375rem] items-center gap-2.5 sm:grid-cols-[4px_minmax(0,1fr)_5.125rem_3.625rem_5.75rem]";
  return (
    <section aria-labelledby="debrief-steps" className="flex flex-col">
      <MonoLabel
        size="nano"
        id="debrief-steps"
        className="pb-1.5 sm:pb-2"
        asChild
      >
        <h3>{title}</h3>
      </MonoLabel>
      <div aria-hidden="true" className={cn(grid, "pb-1.5 max-sm:hidden")}>
        <span />
        <MonoLabel size="nano">Étape</MonoLabel>
        <MonoLabel size="nano">Cible</MonoLabel>
        <MonoLabel size="nano">Réalisé</MonoLabel>
        <span />
      </div>
      <ol>
        {steps.map((step) => (
          <li
            key={step.key}
            className={cn(
              grid,
              "border-t border-border",
              step.compact
                ? "py-1.5 text-label text-muted-foreground"
                : "py-2.25 text-body",
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "self-stretch rounded-mark",
                step.zone === 1 ? "bg-data-1" : zoneFills[step.zone],
              )}
            />
            <span className="flex min-w-0 flex-col gap-px">
              <span
                className={cn(!step.compact && step.detail && "font-semibold")}
              >
                {step.name}
              </span>
              {step.detail && (
                <span className="text-label text-muted-foreground">
                  {step.detail}
                </span>
              )}
            </span>
            <span className="text-body-lg font-semibold text-muted-foreground tabular-nums max-sm:hidden">
              <span className="sr-only">Cible : </span>
              {step.target}
            </span>
            <span className="flex flex-col items-end sm:items-start">
              <span
                className={cn(
                  "font-semibold tabular-nums",
                  step.compact
                    ? "text-body text-secondary-foreground"
                    : "text-body-lg",
                  actualTones[step.actualTone],
                )}
              >
                <span className="sr-only">Réalisé : </span>
                {step.actual}
              </span>
              {!step.compact && (
                <span
                  aria-hidden="true"
                  className="text-label font-semibold text-muted-foreground tabular-nums sm:hidden"
                >
                  {step.target}
                </span>
              )}
            </span>
            <StepStatus step={step} />
          </li>
        ))}
      </ol>
    </section>
  );
}

export function DebriefCoach({
  href,
  stacked = false,
}: {
  href: string;
  stacked?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border border-border bg-card p-3.5",
        stacked ? "flex-col" : "flex-col sm:flex-row sm:items-center",
      )}
    >
      <p className="flex flex-1 items-start gap-2 text-body text-secondary-foreground">
        <StrideMark aria-hidden="true" className="mt-0.75 size-3.25 shrink-0" />
        Le coach reçoit la séance, ce débrief et ton ressenti.
      </p>
      <Button
        asChild
        size="md"
        className={cn(stacked ? "min-h-12" : "max-sm:min-h-12 sm:self-center")}
      >
        <Link href={href}>En parler au coach</Link>
      </Button>
    </div>
  );
}
