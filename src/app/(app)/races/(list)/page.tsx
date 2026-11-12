import type { Metadata } from "next";
import { EmptyState } from "@/features/races/components/race-ui";
import {
  CurrentValues,
  FeaturedRace,
  NextRace,
  OpenSlot,
  PastRaces,
  SeasonCard,
  UpcomingRaces,
} from "@/features/races/components/races-overview";
import { RacesTitle } from "@/features/races/components/races-title";
import { localToday } from "@/features/app-shell/shell";
import { cn } from "@/lib/utils";
import { parseRacesView, seasonTimeline } from "@/features/races/overview";
import { raceDemands } from "@/features/races/season";
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
  const { upcoming, past, featured, calendar, phases, results, values } =
    overview;
  const next = upcoming.find((race) => race.date !== null) ?? null;
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
  const aside = (timeline || showSlot || values.length > 0 || next) && (
    <aside
      aria-label="Saison"
      className={cn(
        "flex flex-col px-4 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border",
        upcomingClass,
      )}
    >
      {timeline && <SeasonCard timeline={timeline} />}
      <CurrentValues values={values} />
      {next && <NextRace race={next} today={today} />}
      {showSlot && <OpenSlot priority="B" />}
    </aside>
  );
  return (
    <>
      <RacesTitle view={view} counts={counts} subtitle={subtitle} />
      <div className="flex flex-col xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col">
          {upcoming.length + past.length === 0 && (
            <div className="px-4 py-4.5 md:px-5">
              <EmptyState title="Aucune course pour l’instant">
                Ajoute ta course objectif pour préparer le parcours, les
                ravitos, la nutrition et l’équipement.
              </EmptyState>
            </div>
          )}
          {upcoming.length === 0 && past.length > 0 && (
            <div className={cn("px-4 py-4.5 md:px-5", upcomingClass)}>
              <EmptyState title="Aucune course à venir">
                Ajoute ta prochaine course pour préparer le parcours et le
                calendrier.
              </EmptyState>
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
                demands={raceDemands(featured, overview.marks)}
              />
            </div>
          )}
          {upcoming.length > 0 && (
            <div className={upcomingClass}>
              <UpcomingRaces races={upcoming} today={today} />
            </div>
          )}
          {past.length > 0 && (
            <div className={pastClass}>
              <PastRaces races={past} results={results} />
            </div>
          )}
          {past.length === 0 && upcoming.length > 0 && view === "past" && (
            <div className="px-4 py-4.5 md:hidden">
              <EmptyState title="Aucune course passée">
                Les courses dont la date est dépassée apparaîtront ici.
              </EmptyState>
            </div>
          )}
        </div>
        {aside}
      </div>
    </>
  );
}
