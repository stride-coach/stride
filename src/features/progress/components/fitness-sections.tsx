import { ChevronRightIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { SourceMark, TrendMark } from "@/components/stride/marks";
import { StrideMark } from "@/components/stride/stride-mark";
import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MeasureRow } from "../fitness";
import { formatClock, formatDayMonth, formatInteger } from "../format";
import type { GarminPrediction } from "../garmin-predictions";
import type { GoalCard } from "../goal";
import type { IntensityDistribution } from "../intensity";
import type { LoadAdvice } from "../reading";
import type { RunningVolume } from "../running-volume";
import { PanelSection, WidgetEmpty } from "./health-frame";

const value = "font-semibold whitespace-nowrap tabular-nums";
const valueUnit = "ml-1 text-body font-normal text-secondary-foreground";

function Figure({
  label,
  children,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-col-reverse gap-0.5">
      <span className="text-label text-secondary-foreground">{label}</span>
      <span data-slot="metric" className={cn("text-title", value)}>
        {children}
      </span>
    </span>
  );
}

export function GoalCardView({ goal }: { goal: GoalCard | null }) {
  if (!goal)
    return (
      <Widget
        headingLevel={2}
        title={<span id="progress-goal">Objectif</span>}
        aria-labelledby="progress-goal"
        className="lg:col-span-2"
      >
        <div className="flex flex-col gap-2">
          <p className="text-body text-secondary-foreground">
            Aucune course A ou B à venir. Ajoute ton prochain objectif pour
            suivre ta préparation ici.
          </p>
          <Link
            href="/races"
            className="inline-flex min-h-control-touch w-fit items-center text-body text-primary hover:text-foreground md:min-h-0"
          >
            Ouvrir tes courses
          </Link>
        </div>
      </Widget>
    );
  const prep = goal.preparation;
  return (
    <Widget
      headingLevel={2}
      title={
        <span id="progress-goal">
          {goal.name}
          <span className="font-normal text-muted-foreground">
            {" "}
            · Objectif {goal.priority}
          </span>
        </span>
      }
      verdict={
        <span className="text-label font-normal text-muted-foreground tabular-nums">
          {goal.date} · {goal.countdown}
        </span>
      }
      aria-labelledby="progress-goal"
      className="lg:col-span-2"
    >
      <div className="flex flex-col gap-3.5">
        {goal.road ? (
          <div className="grid grid-cols-2 gap-4">
            <Figure label="Ton objectif">{goal.target ?? "—"}</Figure>
            <Figure
              label={
                <span className="flex items-center gap-1.5">
                  <SourceMark source="provider" />
                  Prévision Garmin
                </span>
              }
            >
              {goal.road.prediction ?? "—"}
            </Figure>
            <span
              className={cn(
                "col-span-2 text-body",
                goal.road.tone === "success" && "text-primary",
                goal.road.tone === "warning" && "text-warning",
                goal.road.tone === "muted" && "text-muted-foreground",
              )}
            >
              {goal.road.verdict}
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Figure label="Ton objectif">{goal.target ?? "—"}</Figure>
              {prep && (
                <>
                  <Figure label="Plus longue">
                    {prep.longest ?? "—"}
                    <span className={valueUnit}>
                      {prep.distance ? `/ ${prep.distance} km` : "km"}
                    </span>
                  </Figure>
                  <Figure label="D+ max sem.">
                    {prep.weeklyGain ?? "—"}
                    <span className={valueUnit}>m</span>
                  </Figure>
                  <Figure label="Préparation">
                    {prep.preparation
                      ? formatInteger(prep.preparation.done)
                      : "—"}
                    {prep.preparation && (
                      <span className={valueUnit}>
                        / {formatInteger(prep.preparation.total)}
                      </span>
                    )}
                  </Figure>
                </>
              )}
            </div>
            {goal.note && (
              <p className="text-label text-muted-foreground">{goal.note}</p>
            )}
          </>
        )}
        {goal.phase ? (
          <div className="flex flex-col gap-1.5">
            <span className="flex justify-between gap-3 text-label text-secondary-foreground">
              <span>{goal.phase.label}</span>
              {goal.phase.taper && <span>{goal.phase.taper}</span>}
            </span>
            <span
              aria-hidden="true"
              className="grid h-1.5 gap-0.75"
              style={{
                gridTemplateColumns: goal.phase.segments
                  .map((segment) => `${segment.weeks}fr`)
                  .join(" "),
              }}
            >
              {goal.phase.segments.map((segment) => (
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
            <span
              aria-hidden="true"
              className="grid gap-0.75 text-label text-muted-foreground"
              style={{
                gridTemplateColumns: goal.phase.segments
                  .map((segment) => `${segment.weeks}fr`)
                  .join(" "),
              }}
            >
              {goal.phase.segments.map((segment) => (
                <span key={segment.key} className="truncate">
                  {segment.name}
                </span>
              ))}
            </span>
          </div>
        ) : (
          <p className="text-label text-muted-foreground">{goal.planNote}</p>
        )}
        <Link
          href={`/races/${goal.id}`}
          className="inline-flex min-h-control-touch w-fit items-center gap-1 text-body text-secondary-foreground hover:text-foreground md:min-h-0"
        >
          Ouvrir la course
          <ChevronRightIcon aria-hidden="true" className="size-3.5" />
        </Link>
      </div>
    </Widget>
  );
}

export function LoadAdviceCard({ advice }: { advice: LoadAdvice }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:gap-4">
      <p className="flex flex-1 items-start gap-2.5 text-body text-pretty">
        <StrideMark className="mt-1 size-3 shrink-0" />
        {advice.text}
      </p>
      {advice.actions.length > 0 && (
        <div className="flex shrink-0 gap-2 max-sm:[&>*]:flex-1">
          {advice.actions.map((action) => (
            <Button key={action.label} asChild variant="outline">
              <Link href={action.href}>{action.label}</Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function delta(prediction: GarminPrediction) {
  if (!prediction.previous) return { label: "—", tone: "muted" as const };
  const gap = prediction.seconds - prediction.previous.seconds;
  if (gap === 0) return { label: "=", tone: "muted" as const };
  return {
    label: `${gap < 0 ? "−" : "+"}${formatClock(Math.abs(gap))}`,
    tone: gap < 0 ? ("success" as const) : ("warning" as const),
  };
}

export function PredictionSection({
  predictions,
}: {
  predictions: GarminPrediction[];
}) {
  const rows = predictions.filter((item) => item.key !== "5k");
  return (
    <Widget
      headingLevel={2}
      title={<span id="progress-predictions">Prévisions de course</span>}
      verdict={
        <span className="flex items-center gap-1.5 text-label font-normal text-muted-foreground">
          <SourceMark source="provider" />
          Garmin
        </span>
      }
      aria-labelledby="progress-predictions"
    >
      {rows.length ? (
        <div className="flex flex-col gap-2.5">
          <dl className="grid grid-cols-[minmax(0,1fr)_auto_3.5rem] items-baseline gap-x-4">
            {rows.map((prediction) => {
              const change = delta(prediction);
              return (
                <div
                  key={prediction.key}
                  className="col-span-3 grid grid-cols-subgrid items-baseline border-b border-border py-2 last:border-b-0"
                >
                  <dt className="text-secondary-foreground">
                    {prediction.label}
                  </dt>
                  <dd data-slot="metric" className={value}>
                    {formatClock(prediction.seconds)}
                  </dd>
                  <dd
                    className={cn(
                      "text-right text-label",
                      change.tone === "success" && "text-primary",
                      change.tone === "warning" && "text-warning",
                      change.tone === "muted" && "text-muted-foreground",
                    )}
                  >
                    {change.label}
                  </dd>
                </div>
              );
            })}
          </dl>
          <p className="text-label text-muted-foreground">
            Écart sur 4 semaines · mêmes chiffres que ton coach.
          </p>
        </div>
      ) : (
        <WidgetEmpty>
          Garmin n’a pas encore transmis de prévisions de course. Elles
          apparaîtront après une prochaine synchronisation.
        </WidgetEmpty>
      )}
    </Widget>
  );
}

const intensityColors = {
  easy: "bg-intensity-2",
  tempo: "bg-intensity-3",
  hard: "bg-intensity-5",
} as const;

export function IntensitySection({
  intensity,
}: {
  intensity: IntensityDistribution | null;
}) {
  return (
    <Widget
      headingLevel={2}
      title={<span id="progress-intensity">Répartition de l’intensité</span>}
      verdict={
        <span className="text-label font-normal text-muted-foreground">
          4 sem. · temps en zones
        </span>
      }
      aria-labelledby="progress-intensity"
    >
      {intensity ? (
        <div className="flex flex-col gap-2.5">
          <dl className="flex flex-col">
            {intensity.shares.map((share) => (
              <div
                key={share.key}
                className="grid grid-cols-[6.5rem_minmax(0,1fr)_3rem_minmax(0,5.5rem)] items-center gap-3 border-b border-border py-2 last:border-b-0"
              >
                <dt className="text-secondary-foreground">{share.label}</dt>
                <dd aria-hidden="true" className="h-1.5 rounded-mark bg-muted">
                  <span
                    className={cn(
                      "block h-full rounded-mark",
                      intensityColors[share.key],
                    )}
                    style={{ width: `${share.share * 100}%` }}
                  />
                </dd>
                <dd
                  data-slot="metric"
                  className={cn(
                    "text-right",
                    value,
                    !share.onTarget && share.key === "tempo" && "text-warning",
                  )}
                >
                  {formatInteger(share.share * 100)} %
                </dd>
                <dd className="truncate text-right text-label text-muted-foreground">
                  {share.target}
                </dd>
              </div>
            ))}
          </dl>
          {intensity.drift && (
            <Link
              href="/activities"
              className="text-body text-secondary-foreground hover:text-foreground"
            >
              {intensity.drift.note}{" "}
              <span className="text-primary">Voir ces sorties</span>
            </Link>
          )}
        </div>
      ) : (
        <WidgetEmpty>
          Aucune sortie avec fréquence cardiaque ces 4 dernières semaines, ou
          zones cardiaques indisponibles.
        </WidgetEmpty>
      )}
    </Widget>
  );
}

export function RunningVolumeSection({ volume }: { volume: RunningVolume }) {
  const max = Math.max(
    1,
    ...volume.weeks.flatMap((week) => [
      week.doneMeters,
      week.plannedMeters ?? 0,
    ]),
  );
  const hasPlan = volume.weeks.some((week) => week.plannedMeters !== null);
  return (
    <Widget
      headingLevel={2}
      title={<span id="progress-volume">Course à pied · km par semaine</span>}
      verdict={
        <ul className="flex gap-3 text-label font-normal text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-mark bg-foreground"
            />
            Fait
          </li>
          {hasPlan && (
            <li className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 border border-dashed border-muted-foreground"
              />
              Prévu
            </li>
          )}
        </ul>
      }
      aria-labelledby="progress-volume"
    >
      <div className="flex min-w-0 flex-col gap-2.5">
        <ol className="flex h-36 items-end gap-1.5 border-b border-control-border sm:gap-2">
          {volume.weeks.map((week) => (
            <li
              key={week.start}
              className="relative flex h-full flex-1 items-end"
            >
              {week.plannedMeters !== null && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-0 bottom-0 border border-b-0 border-dashed",
                    week.current ? "border-primary" : "border-muted-foreground",
                  )}
                  style={{ height: `${(week.plannedMeters / max) * 100}%` }}
                />
              )}
              <span
                aria-hidden="true"
                className={cn(
                  "w-full rounded-t-mark",
                  week.current ? "bg-primary" : "bg-foreground",
                )}
                style={{
                  height: `${Math.max(week.doneMeters > 0 ? 2 : 0, (week.doneMeters / max) * 100)}%`,
                }}
              />
              <span className="sr-only">
                {`Semaine du ${formatDayMonth(week.start)} : ${formatInteger(week.doneMeters / 1000)} km${week.plannedMeters === null ? "" : ` sur ${formatInteger(week.plannedMeters / 1000)} prévus`}${week.current ? ", en cours" : ""}`}
              </span>
            </li>
          ))}
        </ol>
        <div className="flex justify-between text-label text-muted-foreground">
          <span>{formatDayMonth(volume.weeks[0].start)}</span>
          <span>Cette semaine</span>
        </div>
        <p className="text-body text-secondary-foreground">{volume.summary}</p>
        {!hasPlan && (
          <p className="text-label text-muted-foreground">
            Sans plan actif, Stride affiche seulement les kilomètres réalisés.
          </p>
        )}
      </div>
    </Widget>
  );
}

const toneText = {
  success: "text-primary",
  muted: "text-secondary-foreground",
  warning: "text-warning",
  danger: "text-destructive",
} as const;

export function MeasureSection({
  rows,
  note,
}: {
  rows: MeasureRow[];
  note: string | null;
}) {
  return (
    <PanelSection id="progress-measures" title="Ce qui évolue">
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li key={row.key} className="border-b border-border last:border-b-0">
            <Link
              href={row.href}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 py-2.5 transition-colors duration-150 ease-stride hover:bg-muted"
            >
              <span className="min-w-0 truncate text-secondary-foreground">
                {row.label}
              </span>
              <span
                data-slot="metric"
                className={cn(value, !row.trend && "text-muted-foreground")}
              >
                {row.value}
              </span>
              <span
                className={cn(
                  "col-span-2 flex items-center gap-1.5 text-label",
                  toneText[row.tone],
                )}
              >
                {row.trend && <TrendMark trend={row.trend} />}
                <span className="text-muted-foreground">
                  {row.verdict} · {row.detail}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {note && (
        <p className="flex items-start gap-2 text-body text-secondary-foreground">
          <StrideMark className="mt-1 size-3 shrink-0" />
          {note}
        </p>
      )}
      <p className="text-label text-muted-foreground">
        Seuil et VO₂ max : dans Records, avec tes repères.
      </p>
    </PanelSection>
  );
}
