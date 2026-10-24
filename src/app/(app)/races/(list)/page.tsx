import type { Metadata } from "next";
import { EmptyState } from "@/features/races/components/race-ui";
import {
  CalendarCard,
  FeaturedRace,
  OpenSlot,
  PastRaces,
  SeasonCard,
} from "@/features/races/components/races-overview";
import { RacesTitle } from "@/features/races/components/races-title";
import { localToday } from "@/features/app-shell/shell";
import { cn } from "@/lib/utils";
import { parseRacesView, seasonTimeline } from "@/features/races/overview";
import { requireAthlete } from "@/server/app/session";
import { readRacesOverview } from "@/server/races/overview";

export const metadata: Metadata = { title: "Courses" };

function plural(count: number, one: string, many: string) {
  return `${count} ${count > 1 ? many : one}`;
}

export default async function RacesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const view = parseRacesView(query.view);
  const today = localToday(new Date());
  const overview = await readRacesOverview(context, today);
  const { upcoming, past, featured, calendar, phases, roadGoals, results } =
    overview;
  const counts = { upcoming: upcoming.length, past: past.length };
  const upcomingClass = view === "past" ? "max-md:hidden" : undefined;
  const pastClass = view === "upcoming" ? "max-md:hidden" : undefined;
  const timeline = seasonTimeline(upcoming, today, phases);
  const showSlot =
    featured?.priority === "A" &&
    !calendar.some((race) => race.priority === "B");
  const subtitle =
    upcoming.length + past.length === 0
      ? "Ajoute ta course objectif pour préparer le parcours."
      : `${upcoming.length} à venir · ${plural(past.length, "passée", "passées")}`;
  return (
    <>
      <RacesTitle view={view} counts={counts} subtitle={subtitle} />
      {upcoming.length + past.length === 0 && (
        <EmptyState title="Aucune course pour l’instant">
          Ajoute ta course objectif pour préparer le parcours, les ravitos, la
          nutrition et l’équipement.
        </EmptyState>
      )}
      {upcoming.length === 0 && past.length > 0 && (
        <div className={upcomingClass}>
          <EmptyState title="Aucune course à venir">
            Ajoute ta prochaine course pour préparer le parcours et le
            calendrier.
          </EmptyState>
        </div>
      )}
      {timeline && (
        <div className={upcomingClass}>
          <SeasonCard timeline={timeline} />
        </div>
      )}
      {featured && overview.plan && (
        <div className={upcomingClass}>
          <FeaturedRace
            race={featured}
            today={today}
            plan={overview.plan}
            course={overview.course ?? null}
            onTrack={overview.onTrack}
          />
        </div>
      )}
      {featured && (calendar.length > 0 || showSlot) && (
        <section
          aria-label="Autres courses au calendrier"
          className={cn(
            "grid gap-5 md:grid-cols-2 md:items-start",
            upcomingClass,
          )}
        >
          {calendar.map((race) => (
            <CalendarCard
              key={race.id}
              race={race}
              today={today}
              goal={roadGoals[race.id] ?? null}
            />
          ))}
          {showSlot && (
            <div className="max-md:hidden">
              <OpenSlot priority="B" />
            </div>
          )}
        </section>
      )}
      {past.length > 0 && (
        <section className={cn("flex flex-col gap-2", pastClass)}>
          <h2 className="text-[17px] font-semibold md:text-lg">
            Courses passées
          </h2>
          <PastRaces races={past} results={results} />
        </section>
      )}
      {past.length === 0 && upcoming.length > 0 && view === "past" && (
        <div className="md:hidden">
          <EmptyState title="Aucune course passée">
            Les courses dont la date est dépassée apparaîtront ici.
          </EmptyState>
        </div>
      )}
    </>
  );
}
