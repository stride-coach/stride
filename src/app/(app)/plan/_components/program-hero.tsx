import { ChevronRightIcon } from "lucide-react";
import { SeasonBadge } from "@/features/app-shell/components/season-menu";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import type {
  ProgramSeasonLink,
  ProgramSeasonRace,
  SeasonProgram,
} from "@/features/plans/view/program";

export function ProgramHeader({
  program,
  eyebrow = program.eyebrow,
}: {
  program: SeasonProgram;
  eyebrow?: string;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-label font-medium text-muted-foreground">
          {eyebrow}
        </span>
        <p className="text-title font-semibold text-balance">{program.title}</p>
        {program.summary && (
          <p className="text-secondary-foreground">{program.summary}</p>
        )}
      </div>
      <dl className="flex flex-col">
        {program.kpis.map((kpi) => (
          <div
            key={kpi.key}
            className="grid min-h-7.5 grid-cols-[96px_minmax(0,1fr)] items-center gap-2.5"
          >
            <dt className="text-muted-foreground">{kpi.label}</dt>
            <dd className="flex min-w-0 items-baseline gap-2 tabular-nums">
              <span className="font-semibold">{kpi.value}</span>
              {kpi.detail && (
                <span className="truncate text-muted-foreground">
                  {kpi.detail}
                </span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function SeasonRaces({ races }: { races: ProgramSeasonRace[] }) {
  return (
    <section aria-labelledby="season-races" className="flex flex-col gap-1">
      <h2
        id="season-races"
        className="text-label font-medium text-muted-foreground"
      >
        Courses de la saison
      </h2>
      <ul className="flex flex-col">
        {races.map((race) => (
          <li
            key={race.raceId}
            className="grid grid-cols-[30px_minmax(0,1fr)_auto] items-baseline gap-2.5 border-t border-border py-2 first:border-0"
          >
            <span className="text-label text-muted-foreground tabular-nums">
              S{race.number}
            </span>
            <span className="flex min-w-0 flex-col gap-px">
              <span className="truncate font-medium">{race.name}</span>
              <span className="text-label text-muted-foreground tabular-nums">
                {race.detail}
              </span>
            </span>
            <span className="text-label whitespace-nowrap text-muted-foreground tabular-nums">
              {race.when}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function NextSeason({ season }: { season: ProgramSeasonLink }) {
  return (
    <section aria-labelledby="next-season" className="flex flex-col gap-2">
      <h2
        id="next-season"
        className="text-label font-medium text-muted-foreground"
      >
        Saison suivante
      </h2>
      <Link
        href={season.href}
        className="flex min-h-11 items-center gap-2.5 rounded-lg border border-control-border bg-card p-2.5 transition-colors duration-150 ease-stride hover:border-muted-foreground"
      >
        <SeasonBadge season={season} />
        <span className="flex min-w-0 flex-col gap-px">
          <span className="truncate font-medium">{season.name}</span>
          <span className="truncate text-label text-muted-foreground tabular-nums">
            {season.detail}
          </span>
        </span>
        <ChevronRightIcon
          aria-hidden="true"
          className="ml-auto size-3.5 shrink-0 text-muted-foreground"
        />
      </Link>
    </section>
  );
}
