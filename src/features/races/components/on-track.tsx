import { ChevronRightIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { SourceMark } from "@/components/stride/marks";
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
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-label text-secondary-foreground">{label}</dt>
      <dd>{children}</dd>
      {detail && (
        <dd
          className={cn(
            "text-label text-muted-foreground",
            detailTone === "success" && "text-primary",
          )}
        >
          {detail}
        </dd>
      )}
    </div>
  );
}

function Value({
  value,
  unit,
  className,
}: {
  value: React.ReactNode;
  unit?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="metric"
      className={cn(
        "text-title font-semibold whitespace-nowrap tabular-nums",
        className,
      )}
    >
      {value}
      {unit && (
        <span className="ml-1 text-body font-normal text-secondary-foreground">
          {unit}
        </span>
      )}
    </span>
  );
}

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
          className="overflow-hidden rounded-mark bg-muted"
        >
          <span
            className={cn(
              "block h-full",
              segment.state === "past"
                ? "bg-secondary-foreground"
                : "bg-primary",
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
    <Cell label="Plan" detail={goal.phase ? null : goal.planNote}>
      <span className="font-semibold">{goal.phaseShort ?? "—"}</span>
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
      <h2
        id={titleId}
        className="flex items-center gap-2 text-label font-medium text-secondary-foreground"
      >
        <StrideMark className="size-3 shrink-0" />
        Suis-je dans les temps ?
      </h2>
      {goal.verdict && (
        <p className="max-w-170 text-body-lg text-pretty">{goal.verdict}</p>
      )}
      <dl
        className={cn(
          "grid grid-cols-2 gap-x-4 gap-y-3",
          (goal.road || prep) && "lg:grid-cols-4",
        )}
      >
        <Cell label="Ton objectif" detail={goal.targetNote}>
          <Value value={goal.target ?? "—"} />
        </Cell>
        {goal.road ? (
          <>
            <Cell label="Prévision Garmin">
              <span className="flex items-baseline gap-1.5">
                <SourceMark source="provider" />
                <Value
                  value={goal.road.prediction ?? "—"}
                  className="text-secondary-foreground"
                />
              </span>
            </Cell>
            <Cell label="Écart">
              <Value
                value={goal.gap?.label ?? "—"}
                className={cn(
                  goal.gap?.tone === "success" && "text-primary",
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
              <Value
                value={prep.longest ?? "—"}
                unit={prep.distance ? `/ ${prep.distance} km` : "km"}
              />
            </Cell>
            <Cell
              label="D+ max semaine"
              detail={goal.raceGain ? `course : ${goal.raceGain} m` : null}
              detailTone={goal.gainCovered ? "success" : "muted"}
            >
              <Value value={prep.weeklyGain ?? "—"} unit="m" />
            </Cell>
          </>
        )}
      </dl>
      {(preparation || nextKey) && (
        <div className="grid items-center gap-3 lg:grid-cols-2 lg:gap-6">
          {preparation && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-body text-secondary-foreground">
                <span>
                  Préparation de la course · {preparation.done} sur{" "}
                  {preparation.total}
                </span>
                {percent !== null && (
                  <span
                    data-slot="metric"
                    className="font-semibold text-foreground tabular-nums"
                  >
                    {percent} %
                  </span>
                )}
              </div>
              <div
                role="progressbar"
                aria-label="Préparation de la course"
                aria-valuemin={0}
                aria-valuemax={preparation.total}
                aria-valuenow={preparation.done}
                className="h-1.5 overflow-hidden rounded-full bg-muted"
              >
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${percent ?? 0}%` }}
                />
              </div>
            </div>
          )}
          {nextKey ? (
            <Link
              href={sessionPanelHref(nextKey.sessionKey)}
              className="flex min-w-0 flex-col gap-0.5 rounded-md hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:border-l lg:border-border lg:pl-6"
            >
              <span className="text-label text-secondary-foreground">
                Prochaine séance clé
              </span>
              <span className="flex items-center gap-1 text-body">
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
