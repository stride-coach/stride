import { ChevronRightIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { SourceMark } from "@/components/stride/marks";
import { Metric } from "@/components/stride/metric";
import { MonoLabel } from "@/components/stride/mono-label";
import { StrideMark } from "@/components/stride/stride-mark";
import { sessionPanelHref } from "@/features/plans/view/session-href";
import type { GoalCard, GoalPhase } from "@/features/progress/goal";
import { cn } from "@/lib/utils";
import type { RaceOnTrack } from "../on-track";

function Cell({
  label,
  children,
  detail,
  detailTone = "muted",
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  detail?: React.ReactNode;
  detailTone?: "muted" | "success";
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-surface px-4 py-3.5">
      <MonoLabel size="nano">{label}</MonoLabel>
      {children}
      {detail && (
        <span
          className={cn(
            "text-[11px] text-muted-foreground",
            detailTone === "success" && "text-success",
          )}
        >
          {detail}
        </span>
      )}
    </div>
  );
}

const metricClass =
  "text-[24px] leading-none sm:text-[30px] [&>span]:text-meta [&>span]:font-normal [&>span]:text-muted-foreground";

function PhaseBar({ phase }: { phase: GoalPhase }) {
  return (
    <span
      aria-hidden="true"
      className="grid h-1.5 gap-0.75"
      style={{
        gridTemplateColumns: phase.segments
          .map((segment) => `${segment.weeks}fr`)
          .join(" "),
      }}
    >
      {phase.segments.map((segment) => (
        <span
          key={segment.key}
          className="overflow-hidden rounded-mark bg-border-strong"
        >
          <span
            className={cn(
              "block h-full",
              segment.state === "past" ? "bg-provider" : "bg-accent",
            )}
            style={{ width: `${segment.progress * 100}%` }}
          />
        </span>
      ))}
    </span>
  );
}

function PlanCell({ goal }: { goal: GoalCard }) {
  return (
    <Cell label="Plan" detail={goal.phase ? goal.phase.taper : goal.planNote}>
      <span className="text-base font-semibold">{goal.phaseShort ?? "—"}</span>
      {goal.phase && <PhaseBar phase={goal.phase} />}
    </Cell>
  );
}

export function OnTrack({
  onTrack,
  className,
}: {
  onTrack: RaceOnTrack;
  className?: string;
}) {
  const { goal, preparation, nextKey } = onTrack;
  const prep = goal.preparation;
  const percent = preparation?.total
    ? Math.round((preparation.done / preparation.total) * 100)
    : null;
  const titleId = `on-track-${goal.id}`;
  return (
    <section
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-3.5", className)}
    >
      <h2 id={titleId} className="flex items-center gap-2">
        <StrideMark className="size-3.5 shrink-0" />
        <MonoLabel size="micro" tone="foreground">
          Suis-je dans les temps ?
        </MonoLabel>
      </h2>
      {goal.verdict && (
        <p className="max-w-180 text-body leading-normal text-pretty">
          {goal.verdict}
        </p>
      )}
      <div
        className={cn(
          "grid grid-cols-2 gap-px overflow-hidden rounded-card border border-border bg-border",
          (goal.road || prep) && "lg:grid-cols-4",
        )}
      >
        <Cell label="Ton objectif" detail={goal.targetNote}>
          <Metric value={goal.target ?? "—"} className={metricClass} />
        </Cell>
        {goal.road ? (
          <>
            <Cell label="Prévision Garmin">
              <span className="flex items-baseline gap-1.5">
                <SourceMark source="provider" />
                <Metric
                  value={goal.road.prediction ?? "—"}
                  className={cn(metricClass, "text-muted")}
                />
              </span>
            </Cell>
            <Cell label="Écart">
              <Metric
                value={goal.gap?.label ?? "—"}
                className={cn(
                  metricClass,
                  goal.gap?.tone === "success" && "text-success",
                  goal.gap?.tone === "warning" && "text-warning",
                )}
              />
            </Cell>
            <PlanCell goal={goal} />
          </>
        ) : !prep ? (
          <PlanCell goal={goal} />
        ) : (
          <>
            <PlanCell goal={goal} />
            <Cell
              label="Plus longue sortie"
              detail={
                goal.longestDay ? `le ${goal.longestDay}` : "sur six mois"
              }
            >
              <Metric
                value={prep.longest ?? "—"}
                unit={prep.distance ? `/ ${prep.distance} km` : "km"}
                className={metricClass}
              />
            </Cell>
            <Cell
              label="D+ max semaine"
              detail={goal.raceGain ? `course : ${goal.raceGain} m` : null}
              detailTone={goal.gainCovered ? "success" : "muted"}
            >
              <Metric
                value={prep.weeklyGain ?? "—"}
                unit="m"
                className={metricClass}
              />
            </Cell>
          </>
        )}
      </div>
      {(preparation || nextKey) && (
        <div className="grid items-center gap-3 lg:grid-cols-2 lg:gap-6">
          {preparation && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-meta text-muted">
                <span>
                  Préparation de la course · {preparation.done} sur{" "}
                  {preparation.total}
                </span>
                {percent !== null && (
                  <Metric
                    value={`${percent} %`}
                    className="text-base text-foreground"
                  />
                )}
              </div>
              <div
                role="progressbar"
                aria-label="Préparation de la course"
                aria-valuemin={0}
                aria-valuemax={preparation.total}
                aria-valuenow={preparation.done}
                className="h-1.5 overflow-hidden rounded-full bg-border"
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${percent ?? 0}%` }}
                />
              </div>
            </div>
          )}
          {nextKey ? (
            <Link
              href={sessionPanelHref(nextKey.sessionKey)}
              className="flex min-w-0 flex-col gap-0.5 rounded-control hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:border-l lg:border-border lg:pl-6"
            >
              <MonoLabel size="nano">Prochaine séance clé</MonoLabel>
              <span className="flex items-center gap-1 text-sm">
                <span className="truncate">{nextKey.title}</span>
                <span className="shrink-0 text-muted-foreground">
                  · {nextKey.date}
                </span>
                <ChevronRightIcon
                  aria-hidden="true"
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
              </span>
            </Link>
          ) : null}
        </div>
      )}
    </section>
  );
}
