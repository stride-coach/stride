import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import type { SeasonProgram } from "@/features/plans/view/program";
import { RaceCard } from "./race-ui";

function letterOf(detail: string) {
  return detail.match(/^Course ([ABC])/)?.[1] ?? "·";
}

export function SeasonStrip({
  season,
  raceId,
}: {
  season: SeasonProgram;
  raceId: string;
}) {
  const total = season.weeks.length;
  if (total === 0) return null;
  const current = season.weeks.findIndex((week) => week.status === "current");
  const position = (index: number) => `${((index + 0.5) / total) * 100}%`;
  return (
    <RaceCard aria-labelledby="prep-program">
      <div className="flex items-baseline gap-3">
        <h2 id="prep-program" className="font-semibold">
          Le programme · {total} semaine{total > 1 ? "s" : ""}
        </h2>
        <Link
          href={season.href}
          className="ml-auto text-label text-primary hover:text-foreground"
        >
          Voir le plan
        </Link>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="relative h-6">
          {season.races.map((race) => (
            <span
              key={race.raceId}
              title={`${race.name} · ${race.when}`}
              className={cn(
                "absolute top-0 grid size-5 -translate-x-1/2 place-items-center rounded-sm text-label font-semibold",
                race.raceId === raceId
                  ? "bg-primary text-primary-foreground"
                  : "border border-control-border bg-card text-secondary-foreground",
              )}
              style={{ left: position(race.number - 1) }}
            >
              <span aria-hidden="true">{letterOf(race.detail)}</span>
              <span className="sr-only">
                {race.name}, semaine {race.number}
              </span>
            </span>
          ))}
        </div>
        <div className="relative flex h-6 gap-0.5" aria-hidden="true">
          {season.bands.map((band) => (
            <span
              key={band.key}
              className={cn(
                "flex min-w-0 items-center overflow-hidden rounded-sm px-1.5 text-label whitespace-nowrap",
                band.current
                  ? "bg-primary/20 text-foreground"
                  : "bg-muted text-secondary-foreground",
              )}
              style={{ flexGrow: band.span, flexBasis: 0 }}
            >
              <span className="truncate">{band.name}</span>
            </span>
          ))}
          {current >= 0 && (
            <span
              className="absolute -inset-y-1 w-0.5 rounded-full bg-foreground"
              style={{ left: position(current) }}
            />
          )}
        </div>
        <p className="flex justify-between text-label text-muted-foreground tabular-nums">
          <span>S1</span>
          {current >= 0 && current > 0 && current < total - 1 && (
            <span>S{current + 1} · cette semaine</span>
          )}
          <span>S{total}</span>
        </p>
      </div>
      <p className="sr-only">
        {season.bands
          .map((band) => `${band.name} : ${band.span} semaines`)
          .join(", ")}
        {current >= 0 ? `. Tu es en semaine ${current + 1}.` : ""}
      </p>
    </RaceCard>
  );
}
