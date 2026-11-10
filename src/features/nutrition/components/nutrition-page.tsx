import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/stride/mono-label";
import { StaffPortrait } from "@/features/coach/components/staff-portrait";
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
    <MonoLabel
      size="nano"
      className={cn(
        "rounded-sm border px-1.5 py-px sm:text-label",
        tag === "garmin"
          ? "border-border text-primary"
          : "border-control-border text-warning",
      )}
    >
      {tag === "garmin" ? "Garmin" : "Estimation"}
    </MonoLabel>
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
    <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-border bg-muted p-3.5 sm:gap-1.5 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0">
      <MonoLabel size="nano" className="sm:text-label">
        {label}
      </MonoLabel>
      <span className="flex items-baseline gap-1 sm:gap-1.5">
        <span className="text-[30px] leading-none font-semibold tabular-nums sm:text-[48px] sm:leading-[0.9]">
          {value}
        </span>
        <span className="text-label text-muted-foreground sm:text-body">
          {unit}
        </span>
      </span>
      <span className="text-label leading-[1.4] text-secondary-foreground sm:text-body">
        {detail}
      </span>
    </div>
  );
}

function AskLea({ href, className }: { href: string; className?: string }) {
  return (
    <Button asChild className={className}>
      <Link href={href}>
        <StaffPortrait agent="nutritionist" size={22} decorative />
        Demander à Léa pour cette journée
      </Link>
    </Button>
  );
}

function ContextLinks({ today }: { today: NutritionTodayView }) {
  const links = [
    today.session && { ...today.session, hint: "Plan", dot: true },
    today.race && { ...today.race, hint: "Course", dot: false },
  ].filter((link) => link !== null);
  if (!links.length) return null;
  return (
    <ul
      aria-label="Contexte du jour"
      className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap sm:pt-1.5"
    >
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-control-border px-3.5 text-body transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring sm:min-h-8.5 sm:rounded-full sm:px-3 sm:text-body"
          >
            {link.dot ? (
              <span
                aria-hidden="true"
                className="size-1.5 shrink-0 rounded-full bg-data-3"
              />
            ) : (
              <svg
                viewBox="0 0 16 16"
                aria-hidden="true"
                className="size-3.25 shrink-0 text-muted-foreground"
              >
                <path
                  d="M3.5 14V2.5 M3.5 3H12L10 6L12 9H3.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  fill="none"
                  strokeLinejoin="round"
                />
              </svg>
            )}
            {link.label}
            <span className="ml-auto text-label text-muted-foreground sm:ml-0">
              {link.hint}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TimelineStep({ step }: { step: NutritionTimelineStepView }) {
  return (
    <li
      className={cn(
        "grid grid-cols-[14px_minmax(0,1fr)] gap-x-3 gap-y-1 border-t border-border py-3 sm:flex sm:flex-col sm:gap-2.5 sm:rounded-xl sm:border sm:p-4.5",
        step.highlighted
          ? "-mx-3 rounded-xl border-primary/30 bg-primary/5 px-3 sm:mx-0"
          : "sm:bg-card",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.25 size-2 rounded-full sm:hidden",
          step.highlighted
            ? "bg-primary"
            : "border-[1.5px] border-muted-foreground",
        )}
      />
      <span className="flex justify-between gap-2 sm:contents">
        <MonoLabel
          size="nano"
          tone={step.highlighted ? "accent" : "muted"}
          className="sm:order-1 sm:text-label"
        >
          {step.when}
        </MonoLabel>
        <span className="flex items-baseline gap-1.5 sm:order-3">
          <span className="text-body-lg font-semibold tabular-nums sm:text-[30px] sm:leading-none">
            {step.amount.value}
          </span>
          <span className="text-label text-muted-foreground sm:text-body">
            {step.amount.unit}
          </span>
        </span>
      </span>
      <h3 className="col-start-2 text-body font-semibold sm:order-2 sm:text-body-lg">
        {step.title}
      </h3>
      <p className="col-start-2 text-body leading-normal text-secondary-foreground sm:order-4">
        {step.detail}
      </p>
      {step.link ? (
        <Link
          href={step.link.href}
          className="col-start-2 inline-flex min-h-11 items-center text-body text-primary hover:text-foreground sm:order-5 sm:mt-auto sm:min-h-0"
        >
          {step.link.label} →
        </Link>
      ) : null}
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
    <section
      aria-labelledby="nutrition-base"
      className="grid gap-6 sm:grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))]"
    >
      <div className="flex flex-col gap-3.5 rounded-2xl border border-border bg-muted p-4 sm:p-5.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2
            id="nutrition-base"
            className="text-[17px] font-semibold sm:text-title"
          >
            Ta base de ravito
          </h2>
          <MonoLabel size="nano" className="sm:text-label">
            Entraînement et course
          </MonoLabel>
        </div>
        <dl className="grid grid-cols-3 gap-2.5 sm:gap-4">
          {[
            ["Glucides", base.carbs],
            ["Sodium", base.sodium],
            ["Eau", base.water],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1">
              <dt>
                <MonoLabel size="nano" className="sm:text-label">
                  {label}
                </MonoLabel>
              </dt>
              <dd className="text-[22px] font-semibold tabular-nums sm:text-[26px]">
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-body leading-[1.55] text-secondary-foreground">
          {base.note}
        </p>
        {base.race ? (
          <Link
            href={base.race.href}
            className="inline-flex min-h-11 items-center text-body text-primary hover:text-foreground sm:min-h-0"
          >
            {base.race.label} →
          </Link>
        ) : null}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-muted p-4 sm:p-5.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[17px] font-semibold sm:text-title">
            Teste ton ravito
          </h2>
          <span className="text-body text-muted-foreground">
            Sorties de 1 h 30 ou plus
          </span>
        </div>
        {rehearsals.length ? (
          <ul aria-label="Sorties pour tester ton ravito">
            {rehearsals.map((rehearsal) => (
              <li
                key={rehearsal.sessionKey}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-t border-border py-2.5"
              >
                <Link
                  href={rehearsal.href}
                  className="text-body hover:text-primary sm:text-body"
                >
                  {rehearsal.label}
                </Link>
                <span className="text-right text-body-lg font-semibold tabular-nums">
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
          <p className="border-t border-border pt-2.5 text-body text-secondary-foreground">
            Aucune sortie de 1 h 30 ou plus prévue d’ici la course.
          </p>
        )}
      </div>
    </section>
  );
}

function DayRows({ days }: { days: NutritionRowView[] }) {
  return (
    <>
      <ul className="sm:hidden">
        {days.map((day) => (
          <li
            key={day.date}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-0.5 border-t border-border py-3"
          >
            <span className={cn("text-body", day.today && "font-semibold")}>
              {day.dateLabel}
              {day.today ? " · aujourd’hui" : ""}
            </span>
            <span className="text-right text-title font-semibold tabular-nums">
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
        <table className="w-full min-w-180 border-collapse text-body">
          <thead>
            <tr>
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
                    "px-3 pb-2.5 text-label font-normal text-muted-foreground tabular-nums first:pl-0 last:pr-0",
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
                  "border-t border-border",
                  day.today && "bg-muted",
                )}
              >
                <td className="py-3 pr-3 whitespace-nowrap">
                  {day.dateLabel}
                  {day.today ? (
                    <MonoLabel tone="accent" className="ml-2">
                      Aujourd’hui
                    </MonoLabel>
                  ) : null}
                </td>
                <td className="p-3 text-secondary-foreground">
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
                <td className="p-3">
                  <span className="inline-flex items-center gap-1.5 text-body">
                    <Dot type={day.dayType} />
                    {day.dayTypeLabel}
                  </span>
                </td>
                {[day.energy, day.carbs, day.protein].map((value, index) => (
                  <td
                    key={index}
                    className="p-3 text-right text-title font-semibold tabular-nums"
                  >
                    {value}
                  </td>
                ))}
                <td
                  className={cn(
                    "py-3 pl-3 text-right",
                    day.fueling
                      ? "text-title font-semibold tabular-nums"
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

export function NutritionPage({
  today,
  days,
}: {
  today: NutritionTodayView;
  days: NutritionRowView[];
}) {
  return (
    <div className="flex flex-col gap-6.5 sm:gap-12">
      <section className="flex max-w-215 flex-col gap-2.5 sm:gap-3">
        <MonoLabel>Nutrition · {today.dateLabel}</MonoLabel>
        <h1 className="text-[25px] leading-[1.12] font-semibold tracking-[-0.025em] text-balance sm:text-[clamp(32px,4vw,46px)] sm:leading-[1.05] sm:tracking-[-0.03em]">
          {today.headline}
        </h1>
        <p className="text-body leading-normal text-pretty text-secondary-foreground sm:text-body-lg sm:leading-[1.55]">
          {today.summary}
        </p>
        <ContextLinks today={today} />
        <div className="flex flex-wrap gap-2.5 pt-1.5 max-sm:hidden">
          <AskLea href={today.coachHref} />
          <Button asChild variant="outline">
            <Link href="/settings/profile">Vérifier mon profil</Link>
          </Button>
        </div>
        <p className="text-label text-muted-foreground max-sm:hidden">
          Léa reçoit ta séance, ta course, tes objectifs du jour et ta base de
          ravito.
        </p>
      </section>

      <section
        aria-label="Objectifs du jour"
        className="flex flex-col gap-2.5 sm:gap-5 sm:border-y sm:border-border sm:py-7"
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] sm:gap-8">
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
          className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-label text-muted-foreground"
        >
          {today.sources.map((source) => (
            <li key={source.text} className="inline-flex items-center gap-1.5">
              {source.tag ? <SourceTag tag={source.tag} /> : null}
              {source.text}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="nutrition-timeline"
        className="flex flex-col gap-1 sm:gap-4.5"
      >
        <div className="flex flex-col gap-0.5 sm:flex-row sm:flex-wrap sm:items-baseline sm:justify-between sm:gap-3">
          <h2
            id="nutrition-timeline"
            className="text-[17px] font-semibold sm:text-title"
          >
            {today.timeline.title}
          </h2>
          <span className="pb-1.5 text-label text-muted-foreground sm:pb-0 sm:text-body">
            {today.timeline.caption}
          </span>
        </div>
        <ol className="flex flex-col sm:grid sm:grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] sm:gap-3">
          {today.timeline.steps.map((step) => (
            <TimelineStep key={step.key} step={step} />
          ))}
        </ol>
      </section>

      <FuelingBase base={today.base} rehearsals={today.rehearsals} />

      <section
        aria-labelledby="nutrition-days"
        className="flex flex-col gap-3.5"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2
            id="nutrition-days"
            className="text-[17px] font-semibold sm:text-title"
          >
            Les 7 prochains jours
          </h2>
          <span className="text-body text-muted-foreground max-sm:hidden">
            Selon ton plan
          </span>
        </div>
        <DayRows days={days} />
      </section>

      <section
        aria-labelledby="nutrition-method"
        className="flex max-w-205 flex-col gap-3.5"
      >
        <h2
          id="nutrition-method"
          className="text-[17px] font-semibold sm:text-title"
        >
          Comment on calcule
        </h2>
        <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-2.5 text-body">
          {today.method.map((row) => (
            <div key={row.label} className="contents">
              <dt className="flex flex-wrap items-center gap-2 text-secondary-foreground">
                {row.label}
                {row.tag ? <SourceTag tag={row.tag} /> : null}
              </dt>
              <dd className="text-right text-title font-semibold tabular-nums">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="text-body leading-[1.55] text-muted-foreground">
          {today.neatEstimated
            ? "L’activité hors entraînement est estimée tant que les calories quotidiennes Garmin ne sont pas disponibles. "
            : ""}
          Pas d’objectif de poids : un déficit léger se demande à Léa, jamais un
          jour long, en affûtage ou avec un signal de santé ouvert.
        </p>
      </section>

      <AskLea href={today.coachHref} className="min-h-12 sm:hidden" />
    </div>
  );
}

export function NutritionMissing({ missing }: { missing: string[] }) {
  return (
    <div className="flex flex-col gap-6.5">
      <section className="flex max-w-140 flex-col gap-3 rounded-2xl border border-border bg-muted p-4.5">
        <MonoLabel tone="warning">Données manquantes</MonoLabel>
        <h1 className="text-[22px] leading-[1.15] font-semibold tracking-[-0.02em]">
          Complète ton profil pour voir tes objectifs.
        </h1>
        <p className="text-body leading-normal text-secondary-foreground">
          Sans ces informations, Stride ne calcule aucun chiffre plutôt que de
          deviner.
        </p>
        {missing.length ? (
          <ul className="flex flex-col gap-2 text-body">
            {missing.map((field) => (
              <li key={field} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-warning"
                />
                {field}
              </li>
            ))}
          </ul>
        ) : null}
        <Button asChild className="min-h-12">
          <Link href="/settings/profile">Compléter mon profil</Link>
        </Button>
      </section>
    </div>
  );
}
