import type { Metadata } from "next";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { zoneFills } from "@/components/stride/session-shape";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  calendarMonth,
  type CalendarMonth,
} from "@/features/plans/view/calendar";
import { intensityLabels } from "@/features/plans/view/intensity";
import { buildProgram } from "@/features/plans/view/program";
import { programText } from "@/features/plans/view/program-text";
import { requireAthlete } from "@/server/app/session";
import { loadPlanOverview, programInput } from "@/server/plans/overview";
import { loadIntensityPaces } from "@/server/plans/paces";
import { loadSessionSheet } from "@/server/plans/session-sheet";
import { cn } from "@/lib/utils";
import { CopyProgramButton } from "../_components/copy-program";
import { PlanEmpty } from "../_components/plan-empty";
import { PlanFrame } from "../_components/plan-frame";
import { SessionSheet } from "../_components/session-sheet";
import { CalendarMonthView } from "./_components/calendar-month";

export const metadata: Metadata = { title: "Calendrier · Plan" };

const frameClass = "max-w-none gap-0 px-0 pt-0 sm:gap-0 sm:px-0 md:pt-0";

function monthHref(month: string | null) {
  return month ? `/plan/calendar?month=${month}` : "/plan/calendar";
}

function MonthLink({
  month,
  label,
  children,
}: {
  month: string | null;
  label: string;
  children: React.ReactNode;
}) {
  if (!month)
    return (
      <Button variant="outline" size="icon" aria-label={label} disabled>
        {children}
      </Button>
    );
  return (
    <Button asChild variant="outline" size="icon">
      <Link href={monthHref(month)} aria-label={label}>
        {children}
      </Link>
    </Button>
  );
}

function Legend({ calendar }: { calendar: CalendarMonth }) {
  const zones = calendar.legend;
  if (zones.length === 0) return null;
  return (
    <ul
      aria-label="Légende des intensités"
      className="flex flex-wrap gap-4 px-5 py-3 text-label text-muted-foreground max-md:hidden"
    >
      {zones.map((zone) => (
        <li key={zone} className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className={cn("size-1.75 rounded-mark", zoneFills[zone])}
          />
          {intensityLabels[zone]}
        </li>
      ))}
    </ul>
  );
}

function SummaryRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string | null;
}) {
  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-baseline gap-3">
      <dt className="text-body text-secondary-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
      <dd className="text-label text-muted-foreground tabular-nums">
        {detail}
      </dd>
    </div>
  );
}

function CalendarContext({ calendar }: { calendar: CalendarMonth }) {
  const { summary } = calendar;
  return (
    <aside
      aria-label="Résumé du mois"
      className="flex flex-col border-border max-xl:hidden xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l"
    >
      <section
        aria-labelledby="calendar-summary"
        className="flex flex-col gap-3 border-b border-border px-5 py-4.5"
      >
        <h2 id="calendar-summary" className="text-label text-muted-foreground">
          {calendar.monthName}
        </h2>
        <dl className="flex flex-col gap-2.5">
          <SummaryRow
            label="Prévu"
            value={summary.planned.duration}
            detail={summary.planned.distance}
          />
          <SummaryRow
            label="Fait"
            value={summary.done.duration}
            detail={summary.done.distance}
          />
          <SummaryRow
            label="Séances"
            value={String(summary.sessions)}
            detail={
              summary.quality > 0 ? `dont ${summary.quality} de qualité` : null
            }
          />
          {summary.lightWeeks.map((week) => (
            <SummaryRow
              key={week.label}
              label="Allégée"
              value={week.label}
              detail={week.range}
            />
          ))}
        </dl>
      </section>
      {calendar.upcoming.length > 0 && (
        <section
          aria-labelledby="calendar-upcoming"
          className="flex flex-col gap-3 px-5 py-4.5"
        >
          <h2
            id="calendar-upcoming"
            className="text-label text-muted-foreground"
          >
            À venir
          </h2>
          <dl className="flex flex-col gap-2.5">
            {calendar.upcoming.map((race) => (
              <SummaryRow
                key={race.raceId}
                label={race.name}
                value={race.when}
                detail={race.detail}
              />
            ))}
          </dl>
        </section>
      )}
    </aside>
  );
}

export default async function PlanCalendarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const param = (name: string) => {
    const value = query[name];
    return typeof value === "string" ? value : null;
  };
  const sessionKey = param("session");
  const [overview, paces, sheet] = await Promise.all([
    loadPlanOverview(context),
    loadIntensityPaces(context),
    sessionKey ? loadSessionSheet(context, sessionKey) : null,
  ]);
  const input = overview ? programInput(overview, paces) : null;
  const calendar =
    input &&
    calendarMonth({
      input,
      seasons: buildProgram(input).seasons,
      month: param("month"),
    });
  if (!overview || !calendar)
    return (
      <PlanFrame>
        <PlanEmpty />
      </PlanFrame>
    );
  return (
    <PlanFrame
      className={frameClass}
      actions={
        <div className="max-md:hidden">
          <CopyProgramButton
            text={programText({
              state: overview.plan.state,
              version: overview.plan.version,
              summary: overview.plan.versionSummary,
              races: overview.races,
              today: overview.today,
              paces,
            })}
          />
        </div>
      }
    >
      <div className="flex flex-col xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-x-3 gap-y-1 px-4 pt-4 pb-3 md:flex-wrap md:px-5">
            <h1
              id="calendar-title"
              className="min-w-0 truncate text-verdict font-semibold"
            >
              {calendar.title}
            </h1>
            {calendar.subtitle && (
              <p className="text-body text-secondary-foreground max-md:hidden">
                {calendar.subtitle}
              </p>
            )}
            <nav
              aria-label="Changer de mois"
              className="ml-auto flex shrink-0 items-center gap-1.5"
            >
              <MonthLink month={calendar.previous} label="Mois précédent">
                <ChevronLeftIcon aria-hidden="true" />
              </MonthLink>
              <Button asChild variant="outline" size="md">
                <Link
                  href={monthHref(null)}
                  aria-current={calendar.isCurrent ? "date" : undefined}
                >
                  Aujourd’hui
                </Link>
              </Button>
              <MonthLink month={calendar.next} label="Mois suivant">
                <ChevronRightIcon aria-hidden="true" />
              </MonthLink>
            </nav>
          </div>
          <CalendarMonthView key={calendar.month} calendar={calendar} />
          <Legend calendar={calendar} />
        </div>
        <CalendarContext calendar={calendar} />
      </div>
      {sheet && (
        <SessionSheet
          key={sheet.panel.sessionKey}
          planId={sheet.planId}
          panel={sheet.panel}
          watch={sheet.watch}
        />
      )}
    </PlanFrame>
  );
}
