import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import {
  easyDaysBefore,
  parseRacesView,
  seasonTimeline,
} from "@/features/races/overview";
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
  const pastOnly = view === "past";
  const timeline = seasonTimeline(upcoming, today, phases);
  const showSlot =
    featured?.priority === "A" &&
    !calendar.some((race) => race.priority === "B");
  const subtitle =
    upcoming.length + past.length === 0
      ? "Ajoute ta course objectif pour préparer le parcours."
      : `${upcoming.length} à venir · ${plural(past.length, "passée", "passées")}`;
  const easyDays =
    next?.date && overview.sessions.length
      ? easyDaysBefore(overview.sessions, next.date)
      : null;
  const aside = !pastOnly &&
    (timeline || showSlot || values.length > 0 || next) && (
      <aside
        aria-label="Saison"
        className="flex flex-col px-4 max-md:hidden md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
      >
        {timeline && <SeasonCard timeline={timeline} />}
        <CurrentValues values={values} />
        {next && <NextRace race={next} today={today} easyDays={easyDays} />}
        {showSlot && <OpenSlot priority="B" />}
      </aside>
    );
  return (
    <>
      <RacesTitle subtitle={subtitle} />
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
          {!pastOnly && upcoming.length === 0 && past.length > 0 && (
            <div className="px-4 py-4.5 md:px-5">
              <EmptyState title="Aucune course à venir">
                Ajoute ta prochaine course pour préparer le parcours et le
                calendrier.
              </EmptyState>
            </div>
          )}
          {!pastOnly && featured && overview.plan && (
            <div>
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
          {!pastOnly && upcoming.length > 0 && (
            <div>
              <UpcomingRaces races={upcoming} today={today} />
            </div>
          )}
          {past.length > 0 && (
            <div>
              <PastRaces races={past} results={results} />
            </div>
          )}
          {past.length === 0 && pastOnly && (
            <div className="px-4 py-4.5 md:px-5">
              <EmptyState title="Aucune course passée">
                Les courses dont la date est dépassée apparaîtront ici.
              </EmptyState>
            </div>
          )}
          <div className="px-4 py-4.5 md:hidden">
            <Button asChild variant="outline" className="w-full">
              <Link href="/races/new">Ajouter une course</Link>
            </Button>
          </div>
        </div>
        {aside}
      </div>
    </>
  );
}
