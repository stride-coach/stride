import type { Metadata } from "next";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { SettingsNotice } from "@/features/settings/components/settings-notice";
import { RaceWizard } from "@/features/settings/components/race-wizard";
import { localToday } from "@/features/app-shell/shell";
import {
  goalFocuses,
  racePriorities,
  resolveRaceSnapshots,
  type GoalFocus,
} from "@/features/onboarding/goals";
import {
  daysUntil,
  formatRaceDistance,
  formatRaceLongDate,
  formatRaceShortDate,
  formatKm,
  formatTarget,
  priorityMissingCopy,
  splitRaces,
} from "@/features/settings/goals-view";
import { cn } from "@/lib/utils";
import { PriorityBadge } from "@/features/races/components/races-overview";
import { requireAthleteAccount } from "@/server/app/session";
import { readGoals } from "@/server/onboarding/goals";
import { readRaceCourses } from "@/server/races/courses";
import { saveSettingsGoal } from "@/server/settings/actions";

export const metadata: Metadata = { title: "Objectifs et courses · Réglages" };

const focusLabels: Record<GoalFocus, string> = {
  general_fitness: "Forme générale",
  faster: "Courir plus vite",
  short_distance: "5 km ou 10 km",
  half_marathon_marathon: "Semi-marathon ou marathon",
  trail: "Trail",
  ultra_trail: "Ultra-trail",
};

const columns =
  "md:grid-cols-[2.75rem_minmax(0,1.6fr)_7.5rem_8.75rem_6.875rem_4.375rem]";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="px-1 text-body-lg font-semibold md:border-b md:border-border md:px-0 md:pb-2.5">
      {children}
    </h2>
  );
}

export default async function GoalsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    course?: string;
    priorite?: string;
  }>;
}) {
  const [context, query] = await Promise.all([
    requireAthleteAccount(),
    searchParams,
  ]);
  const [goals, courses] = await Promise.all([
    readGoals(context),
    readRaceCourses(context),
  ]);
  const today = localToday(new Date());
  const races = goals.races.map((race) => ({
    id: race.id,
    revision: race.revision,
    values: race.values,
  }));
  const { upcoming, past, primary, missing } = splitRaces(
    resolveRaceSnapshots(races, courses),
    today,
  );
  const editing =
    query.course && query.course !== "nouvelle"
      ? (races.find((race) => race.id === query.course) ?? null)
      : null;
  const plan = editing
    ? await context.client
        .from("race_plans")
        .select("start_time, cutoff_duration_seconds")
        .eq("user_id", context.userId)
        .eq("race_id", editing.id)
        .maybeSingle()
    : null;
  const requestedPriority = racePriorities.find(
    (priority) => priority === query.priorite,
  );
  const wizardOpen = query.course === "nouvelle" || editing !== null;
  const primaryName =
    races.find(
      (race) =>
        race.values.priority === "A" &&
        race.id !== editing?.id &&
        race.values.name,
    )?.values.name ?? null;
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col gap-2 px-1 md:px-0">
        <h1 className="text-verdict font-semibold">Objectifs et courses</h1>
        <p className="max-w-150 text-body-lg text-pretty text-secondary-foreground">
          Ta course A structure tout le plan. La changer crée une proposition de
          plan que tu peux relire avant.
        </p>
      </div>
      <SettingsNotice
        status={query.status}
        savedMessage="Objectif enregistré."
      />
      {wizardOpen && (
        <RaceWizard
          key={editing?.id ?? "nouvelle"}
          mode={editing ? "edit" : "create"}
          race={
            editing
              ? {
                  id: editing.id,
                  revision: editing.revision ?? 1,
                  values: editing.values,
                  startTime: plan?.data?.start_time?.slice(0, 5) ?? null,
                  cutoffSeconds: plan?.data?.cutoff_duration_seconds ?? null,
                }
              : undefined
          }
          defaultPriority={requestedPriority ?? "B"}
          primaryName={primaryName}
        />
      )}
      {primary && (
        <section className="flex flex-col gap-2 md:gap-3">
          <SectionTitle>Objectif principal</SectionTitle>
          <div className="flex flex-col gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5 md:flex-row md:flex-wrap md:items-center md:gap-4">
            <div className="flex min-w-0 items-start gap-3 md:min-w-55 md:flex-1 md:items-center">
              <PriorityBadge priority="A" />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-title font-semibold">
                  <span className="sr-only">Course A · </span>
                  {primary.values.name}
                </span>
                <span className="text-secondary-foreground">
                  {[
                    formatRaceLongDate(primary.values.race_date),
                    formatKm(primary.values.distance_km),
                    primary.values.elevation_gain_m
                      ? `${new Intl.NumberFormat("fr-FR").format(primary.values.elevation_gain_m)} m D+`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            </div>
            <div className="flex items-end justify-between gap-4 max-md:border-t max-md:border-border max-md:pt-3 md:contents">
              <div className="flex flex-col gap-0.5 md:items-end">
                <span
                  data-slot="metric"
                  className="text-metric font-semibold tabular-nums"
                >
                  {primary.values.race_date
                    ? `${daysUntil(primary.values.race_date, today)} jours`
                    : "—"}
                </span>
                {primary.values.target_duration_seconds !== null && (
                  <span className="text-label text-secondary-foreground">
                    Cible {formatTarget(primary.values.target_duration_seconds)}
                  </span>
                )}
              </div>
              <Link
                href={`/races/${primary.id}`}
                className="inline-flex min-h-control-touch items-center font-medium text-primary hover:text-foreground md:min-h-0"
              >
                Plan de course →
              </Link>
            </div>
          </div>
        </section>
      )}
      <section className="flex flex-col gap-2 md:gap-0">
        <div
          className={cn(
            "hidden gap-4 border-b border-border pb-2.5 text-label text-muted-foreground md:grid",
            columns,
          )}
        >
          <span>Prio</span>
          <span>À venir</span>
          <span>Date</span>
          <span>Distance</span>
          <span>Cible</span>
          <span />
        </div>
        <h2 className="px-1 text-body-lg font-semibold md:hidden">À venir</h2>
        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
          {upcoming.map((race) => (
            <div
              key={race.id}
              className={cn(
                "grid min-h-row-touch grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5 pr-2 pl-4 md:min-h-row md:gap-4 md:pr-0 md:pl-0",
                columns,
              )}
            >
              <PriorityBadge priority={race.values.priority} />
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate font-medium">
                  <span className="sr-only">
                    Course {race.values.priority} ·{" "}
                  </span>
                  {race.values.name ?? "Course sans nom"}
                </span>
                <span className="text-label text-secondary-foreground md:hidden">
                  {formatRaceShortDate(race.values.race_date)} ·{" "}
                  {formatRaceDistance(race.values)}
                  {race.values.target_duration_seconds !== null &&
                    ` · cible ${formatTarget(race.values.target_duration_seconds)}`}
                </span>
              </div>
              <span className="hidden text-secondary-foreground tabular-nums md:block">
                {formatRaceShortDate(race.values.race_date)}
              </span>
              <span className="hidden font-semibold tabular-nums md:block">
                {formatRaceDistance(race.values)}
              </span>
              <span className="hidden font-semibold tabular-nums md:block">
                {formatTarget(race.values.target_duration_seconds)}
              </span>
              <Link
                href={`/settings/goals?course=${race.id}`}
                className="inline-flex min-h-control-touch items-center justify-end px-2.5 text-secondary-foreground hover:text-foreground md:min-h-control md:px-0 md:pr-3.5"
              >
                Modifier
              </Link>
            </div>
          ))}
          {missing.map((priority) => (
            <div
              key={priority}
              className={cn(
                "grid min-h-row-touch grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2.5 pr-2 pl-4 last:border-b-0 md:min-h-row md:gap-4 md:pr-0 md:pl-0",
                columns,
              )}
            >
              <PriorityBadge priority={priority} planned={false} />
              <span className="text-secondary-foreground md:col-span-4 md:max-w-xl">
                {priorityMissingCopy[priority]}
              </span>
              <Link
                href={`/settings/goals?course=nouvelle&priorite=${priority}`}
                className="inline-flex min-h-control-touch items-center justify-end px-2.5 font-medium text-primary hover:text-foreground md:min-h-control md:px-0 md:pr-3.5"
              >
                Ajouter
              </Link>
            </div>
          ))}
        </div>
      </section>
      {past.length > 0 && (
        <section className="flex flex-col gap-2 md:gap-0">
          <h2 className="px-1 text-body-lg font-semibold md:border-b md:border-border md:px-0 md:pb-2.5">
            Courses passées
          </h2>
          <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
            {past.map((race) => (
              <div
                key={race.id}
                className="grid min-h-row grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-border px-4 py-2.5 last:border-b-0 md:grid-cols-[minmax(0,1.6fr)_7.5rem_8.75rem_6.875rem] md:gap-4 md:px-0"
              >
                <span className="truncate">
                  {race.values.name ?? "Course sans nom"}
                </span>
                <span className="font-semibold tabular-nums md:order-last">
                  {race.values.target_duration_seconds !== null
                    ? formatTarget(race.values.target_duration_seconds)
                    : "Terminé"}
                </span>
                <span className="text-secondary-foreground tabular-nums md:order-2">
                  {formatRaceShortDate(race.values.race_date)}
                </span>
                <span className="text-right font-semibold text-secondary-foreground tabular-nums md:order-3 md:text-left md:text-foreground">
                  {formatKm(race.values.distance_km)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
      <section className="flex flex-col gap-2 md:gap-3">
        <SectionTitle>Objectif de course</SectionTitle>
        <form
          action={saveSettingsGoal}
          className="flex flex-col gap-3 md:max-w-md"
        >
          <input
            type="hidden"
            name="revision"
            value={goals.goal.revision ?? ""}
          />
          <label htmlFor="focus" className="font-medium">
            Quel est ton objectif ?
          </label>
          <select
            id="focus"
            name="focus"
            defaultValue={goals.goal.values.focus ?? ""}
            className="h-control-auto w-full rounded-lg border border-input bg-card px-3"
          >
            {goalFocuses.map((focus) => (
              <option key={focus} value={focus}>
                {focusLabels[focus]}
              </option>
            ))}
          </select>
          <Button type="submit" className="self-start">
            Enregistrer l’objectif
          </Button>
        </form>
      </section>
    </div>
  );
}
