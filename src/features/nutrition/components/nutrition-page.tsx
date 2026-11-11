import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { Widget } from "@/components/stride/widget";
import {
  HealthGrid,
  HealthPage,
  HealthReading,
  PanelSection,
} from "@/features/progress/components/health-frame";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { cn } from "@/lib/utils";
import type {
  NutritionBaseView,
  NutritionRehearsalView,
  NutritionRowView,
  NutritionSourceTag,
  NutritionTimelineStepView,
  NutritionTodayView,
} from "@/features/nutrition/view";
import type { NutritionDayType } from "@/features/nutrition/calculator";

const dayTone: Record<NutritionDayType, string> = {
  rest: "bg-foreground",
  easy: "bg-primary",
  moderate: "bg-warning",
  long_or_hard: "bg-data-3",
  pre_race: "bg-data-3",
  race: "bg-primary",
};

function Dot({ type }: { type: NutritionDayType }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-1.5 shrink-0 rounded-full", dayTone[type])}
    />
  );
}

function SourceTag({ tag }: { tag: NutritionSourceTag }) {
  return (
    <Chip className={tag === "garmin" ? undefined : "text-warning"}>
      {tag === "garmin" ? "Garmin" : "Estimation"}
    </Chip>
  );
}

function Stat({
  label,
  value,
  unit,
  detail,
}: {
  label: string;
  value: string;
  unit: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span
        data-slot="metric"
        className="text-title font-semibold whitespace-nowrap tabular-nums"
      >
        {value}
        <span className="ml-1 text-body font-normal text-secondary-foreground">
          {unit}
        </span>
      </span>
      <span className="text-label text-secondary-foreground">{label}</span>
      <span className="text-label text-muted-foreground">{detail}</span>
    </div>
  );
}

function AskNutrition({
  href,
  className,
}: {
  href: string;
  className?: string;
}) {
  return (
    <Button asChild className={className}>
      <Link href={href}>
        <StaffAvatar agent="nutritionist" size={22} decorative />
        Demander à Nutrition pour cette journée
      </Link>
    </Button>
  );
}

function ContextLinks({ today }: { today: NutritionTodayView }) {
  const links = [
    today.session && { ...today.session, hint: "Plan" },
    today.race && { ...today.race, hint: "Course" },
  ].filter((link) => link !== null);
  if (!links.length) return null;
  return (
    <ul aria-label="Contexte du jour" className="flex flex-wrap gap-2">
      {links.map((link) => (
        <li key={link.href}>
          <Button asChild variant="outline">
            <Link href={link.href}>
              {link.label}
              <span className="font-normal text-muted-foreground">
                {link.hint}
              </span>
            </Link>
          </Button>
        </li>
      ))}
    </ul>
  );
}

function TimelineStep({ step }: { step: NutritionTimelineStepView }) {
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-0.5 border-b border-border py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)_auto]",
        step.highlighted && "-mx-4 bg-muted px-4",
      )}
    >
      <span
        className={cn(
          "text-label text-muted-foreground max-sm:col-span-2",
          step.highlighted && "font-medium text-primary",
        )}
      >
        {step.when}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <h3 className="font-medium">{step.title}</h3>
        <span className="text-label text-secondary-foreground">
          {step.detail}
        </span>
        {step.link ? (
          <Link
            href={step.link.href}
            className="inline-flex min-h-control-touch w-fit items-center text-label text-primary hover:text-foreground md:min-h-0"
          >
            {step.link.label}
          </Link>
        ) : null}
      </span>
      <span
        data-slot="metric"
        className="text-right font-semibold whitespace-nowrap tabular-nums"
      >
        {step.amount.value}
        <span className="ml-1 font-normal text-secondary-foreground">
          {step.amount.unit}
        </span>
      </span>
    </li>
  );
}

function FuelingBase({
  base,
  rehearsals,
}: {
  base: NutritionBaseView;
  rehearsals: NutritionRehearsalView[];
}) {
  return (
    <>
      <PanelSection
        id="nutrition-base"
        title="Ta base de ravito"
        meta="Entraînement et course"
      >
        <dl className="flex flex-col">
          {[
            ["Glucides", base.carbs],
            ["Sodium", base.sodium],
            ["Eau", base.water],
          ].map(([label, value]) => (
            <div
              key={label}
              className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0"
            >
              <dt className="text-secondary-foreground">{label}</dt>
              <dd
                data-slot="metric"
                className="font-semibold whitespace-nowrap tabular-nums"
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-label text-muted-foreground">{base.note}</p>
        {base.race ? (
          <Link
            href={base.race.href}
            className="inline-flex min-h-control-touch w-fit items-center text-label text-primary hover:text-foreground md:min-h-0"
          >
            {base.race.label}
          </Link>
        ) : null}
      </PanelSection>
      <PanelSection
        id="nutrition-rehearsals"
        title="Teste ton ravito"
        meta="Sorties de 1 h 30 ou plus"
      >
        {rehearsals.length ? (
          <ul aria-label="Sorties pour tester ton ravito">
            {rehearsals.map((rehearsal) => (
              <li
                key={rehearsal.sessionKey}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-border py-2 last:border-b-0"
              >
                <Link
                  href={rehearsal.href}
                  className="min-w-0 truncate hover:text-primary"
                >
                  {rehearsal.label}
                </Link>
                <span
                  data-slot="metric"
                  className="text-right font-semibold tabular-nums"
                >
                  {rehearsal.carbs}
                </span>
                <span className="text-label text-muted-foreground">
                  {rehearsal.today ? "Aujourd’hui" : "À venir"}
                </span>
                <span className="text-right text-label text-muted-foreground">
                  {rehearsal.perHour}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-body text-secondary-foreground">
            Aucune sortie de 1 h 30 ou plus prévue d’ici la course.
          </p>
        )}
      </PanelSection>
    </>
  );
}

function DayRows({ days }: { days: NutritionRowView[] }) {
  return (
    <>
      <ul className="sm:hidden">
        {days.map((day) => (
          <li
            key={day.date}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-b border-border py-2.5 last:border-b-0"
          >
            <span className={cn(day.today && "font-medium")}>
              {day.dateLabel}
              {day.today ? " · aujourd’hui" : ""}
            </span>
            <span
              data-slot="metric"
              className="text-right font-semibold tabular-nums"
            >
              {day.energy} kcal
            </span>
            <span className="inline-flex min-w-0 items-center gap-1.5 text-label text-secondary-foreground">
              <Dot type={day.dayType} />
              {day.sessionHref ? (
                <Link href={day.sessionHref} className="truncate">
                  {day.session}
                </Link>
              ) : (
                <span className="truncate">{day.session}</span>
              )}
            </span>
            <span className="text-right text-label text-muted-foreground">
              Gluc. {day.carbs}
            </span>
            <span className="text-label text-muted-foreground">
              {day.dayTypeLabel}
            </span>
            <span className="text-right text-label text-muted-foreground">
              Prot. {day.protein}
            </span>
          </li>
        ))}
      </ul>
      <div className="overflow-x-auto max-sm:hidden">
        <table className="w-full min-w-180 border-collapse">
          <thead>
            <tr className="border-b border-border">
              {[
                "Jour",
                "Séance prévue",
                "Type de journée",
                "Énergie · kcal",
                "Glucides",
                "Protéines",
                "Ravito",
              ].map((title, index) => (
                <th
                  key={title}
                  scope="col"
                  className={cn(
                    "px-3 pb-2 text-label font-normal text-muted-foreground first:pl-0 last:pr-0",
                    index < 3 ? "text-left" : "text-right",
                  )}
                >
                  {title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <tr
                key={day.date}
                aria-current={day.today ? "date" : undefined}
                className={cn(
                  "border-b border-border last:border-b-0",
                  day.today && "bg-muted",
                )}
              >
                <td className="h-row pr-3 whitespace-nowrap">
                  {day.dateLabel}
                  {day.today ? (
                    <span className="ml-2 text-label font-medium text-primary">
                      Aujourd’hui
                    </span>
                  ) : null}
                </td>
                <td className="px-3 text-secondary-foreground">
                  {day.sessionHref ? (
                    <Link
                      href={day.sessionHref}
                      className="underline-offset-2 hover:text-foreground hover:underline"
                    >
                      {day.session}
                    </Link>
                  ) : (
                    day.session
                  )}
                </td>
                <td className="px-3">
                  <span className="inline-flex items-center gap-1.5">
                    <Dot type={day.dayType} />
                    {day.dayTypeLabel}
                  </span>
                </td>
                {[day.energy, day.carbs, day.protein].map((value, index) => (
                  <td
                    key={index}
                    data-slot="metric"
                    className="px-3 text-right font-semibold tabular-nums"
                  >
                    {value}
                  </td>
                ))}
                <td
                  className={cn(
                    "pl-3 text-right",
                    day.fueling
                      ? "font-semibold tabular-nums"
                      : "text-muted-foreground",
                  )}
                >
                  {day.fueling ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Method({ today }: { today: NutritionTodayView }) {
  return (
    <PanelSection id="nutrition-method" title="Comment on calcule">
      <dl className="flex flex-col">
        {today.method.map((row) => (
          <div
            key={row.label}
            className="flex items-baseline justify-between gap-3 border-b border-border py-2 last:border-b-0"
          >
            <dt className="flex flex-wrap items-center gap-2 text-secondary-foreground">
              {row.label}
              {row.tag ? <SourceTag tag={row.tag} /> : null}
            </dt>
            <dd
              data-slot="metric"
              className="font-semibold whitespace-nowrap tabular-nums"
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-label text-muted-foreground">
        {today.neatEstimated
          ? "L’activité hors entraînement est estimée tant que les calories quotidiennes Garmin ne sont pas disponibles. "
          : ""}
        Pas d’objectif de poids : un déficit léger se demande à Nutrition,
        jamais un jour long, en affûtage ou avec un signal de santé ouvert.
      </p>
    </PanelSection>
  );
}

export function NutritionPage({
  today,
  days,
}: {
  today: NutritionTodayView;
  days: NutritionRowView[];
}) {
  return (
    <HealthPage
      aside={
        <>
          <FuelingBase base={today.base} rehearsals={today.rehearsals} />
          <Method today={today} />
        </>
      }
    >
      <HealthReading
        kicker={`Nutrition · ${today.dateLabel}`}
        title={today.headline}
        actions={
          <>
            <AskNutrition href={today.coachHref} />
            <Button asChild variant="outline">
              <Link href="/settings/profile">Vérifier mon profil</Link>
            </Button>
          </>
        }
      >
        <p>{today.summary}</p>
      </HealthReading>
      <HealthGrid className="lg:grid-cols-1">
        <Widget
          headingLevel={2}
          title={<span id="nutrition-targets">Objectifs du jour</span>}
          aria-labelledby="nutrition-targets"
        >
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <Stat
                label="Énergie"
                value={today.energy.value}
                unit="kcal"
                detail={today.energy.detail}
              />
              <Stat
                label="Glucides"
                value={today.carbs.value}
                unit="g"
                detail={today.carbs.detail}
              />
              <Stat
                label="Protéines"
                value={today.protein.value}
                unit="g"
                detail={today.protein.detail}
              />
              <Stat
                label="Lipides"
                value={today.fat.value}
                unit="g"
                detail={today.fat.detail}
              />
            </div>
            <ul
              aria-label="Sources des chiffres"
              className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-border pt-3 text-label text-muted-foreground"
            >
              {today.sources.map((source) => (
                <li
                  key={source.text}
                  className="inline-flex items-center gap-1.5"
                >
                  {source.tag ? <SourceTag tag={source.tag} /> : null}
                  {source.text}
                </li>
              ))}
            </ul>
          </div>
        </Widget>
        <ContextLinks today={today} />
        <Widget
          headingLevel={2}
          title={<span id="nutrition-timeline">{today.timeline.title}</span>}
          verdict={
            <span className="text-label font-normal text-muted-foreground">
              {today.timeline.caption}
            </span>
          }
          aria-labelledby="nutrition-timeline"
        >
          <ol className="flex flex-col">
            {today.timeline.steps.map((step) => (
              <TimelineStep key={step.key} step={step} />
            ))}
          </ol>
        </Widget>
        <Widget
          headingLevel={2}
          title={<span id="nutrition-days">Les 7 prochains jours</span>}
          verdict={
            <span className="text-label font-normal text-muted-foreground">
              Selon ton plan
            </span>
          }
          aria-labelledby="nutrition-days"
        >
          <DayRows days={days} />
        </Widget>
        <p className="text-label text-muted-foreground">
          Nutrition reçoit ta séance, ta course, tes objectifs du jour et ta
          base de ravito.
        </p>
      </HealthGrid>
    </HealthPage>
  );
}

export function NutritionMissing({ missing }: { missing: string[] }) {
  return (
    <HealthPage>
      <HealthReading
        kicker={<span className="text-warning">Données manquantes</span>}
        title="Complète ton profil pour voir tes objectifs."
        actions={
          <Button asChild>
            <Link href="/settings/profile">Compléter mon profil</Link>
          </Button>
        }
      >
        <p>
          Sans ces informations, Stride ne calcule aucun chiffre plutôt que de
          deviner.
        </p>
      </HealthReading>
      {missing.length ? (
        <ul className="flex flex-col px-4 py-3 md:px-5">
          {missing.map((field) => (
            <li
              key={field}
              className="flex min-h-row items-center gap-2 border-b border-border last:border-b-0"
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-warning"
              />
              {field}
            </li>
          ))}
        </ul>
      ) : null}
    </HealthPage>
  );
}
