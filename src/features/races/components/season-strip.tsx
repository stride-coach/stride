import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/features/plans/view/format";
import type { SeasonProgram } from "@/features/plans/view/program";
import { weekTicks } from "../season-strip";
import { RaceCard } from "./race-ui";

function letterOf(detail: string) {
  return detail.match(/^Course ([ABC])/)?.[1] ?? "·";
}

const monthFormat = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});

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
  const left = (index: number) => `${(index / total) * 100}%`;
  const top = Math.max(
    1,
    ...season.weeks.map((week) => week.totals.durationSeconds),
  );
  const months = season.weeks.flatMap((week, index) => {
    const month = week.weekStart.slice(0, 7);
    const previous = season.weeks[index - 1]?.weekStart.slice(0, 7);
    return month !== previous
      ? [
          {
            key: month,
            index,
            label: monthFormat.format(new Date(`${week.weekStart}T00:00:00Z`)),
          },
        ]
      : [];
  });
  const racesByWeek = new Map(
    season.races.map((race) => [race.number - 1, race]),
  );
  const ticks = weekTicks(total, current);
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
      <div aria-hidden="true" className="flex flex-col gap-1.5">
        <div className="relative h-4 text-label text-muted-foreground">
          {months.map((month) => (
            <span
              key={month.key}
              className="absolute top-0 whitespace-nowrap"
              style={{ left: left(month.index) }}
            >
              {month.label}
            </span>
          ))}
        </div>
        <div className="flex h-6 gap-0.5">
          {season.bands.map((band) => (
            <span
              key={band.key}
              className={cn(
                "flex min-w-0 items-center overflow-hidden rounded-sm px-1.5 text-label whitespace-nowrap",
                band.current
                  ? "border border-control-border bg-card font-medium text-foreground"
                  : "bg-muted text-secondary-foreground",
              )}
              style={{ flexGrow: band.span, flexBasis: 0 }}
            >
              <span className="truncate">{band.name}</span>
            </span>
          ))}
        </div>
        <div className="flex h-36 items-end gap-0.5 pt-6">
          {season.weeks.map((week, index) => {
            const race = racesByWeek.get(index);
            const height = (week.totals.durationSeconds / top) * 100;
            const quality =
              week.totals.durationSeconds > 0
                ? (week.qualitySeconds / week.totals.durationSeconds) * 100
                : 0;
            return (
              <div
                key={week.weekKey}
                className={cn(
                  "relative flex h-full min-w-0 flex-1 flex-col justify-end rounded-sm",
                  index === current &&
                    "ring-1 ring-foreground ring-offset-2 ring-offset-card",
                  week.status === "past" && "opacity-45",
                )}
              >
                {race && (
                  <span
                    className={cn(
                      "absolute left-1/2 grid size-4.5 -translate-x-1/2 place-items-center rounded-sm text-label leading-none font-semibold",
                      race.raceId === raceId
                        ? "bg-primary text-primary-foreground"
                        : "border border-control-border bg-card text-secondary-foreground",
                    )}
                    style={{ bottom: `calc(${height}% + 4px)` }}
                  >
                    {letterOf(race.detail)}
                  </span>
                )}
                <span
                  className="flex w-full flex-col overflow-hidden rounded-t-xs"
                  style={{ height: `${height}%` }}
                >
                  <span
                    className="block w-full bg-intensity-4"
                    style={{ height: `${quality}%` }}
                  />
                  <span className="block w-full flex-1 bg-intensity-2" />
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative h-4 text-label text-muted-foreground tabular-nums">
          {ticks.map((tick) => (
            <span
              key={tick}
              className={cn(
                "absolute top-0 -translate-x-1/2 whitespace-nowrap",
                tick === current && "font-semibold text-foreground",
              )}
              style={{ left: `${((tick + 0.5) / total) * 100}%` }}
            >
              S{tick + 1}
            </span>
          ))}
        </div>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-3 rounded-xs bg-intensity-2"
          />
          Endurance
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-3 rounded-xs bg-intensity-4"
          />
          Qualité
        </li>
      </ul>
      <ol className="sr-only">
        {season.weeks.map((week, index) => (
          <li key={week.weekKey}>
            Semaine {index + 1}, {week.range} :{" "}
            {formatDuration(week.totals.durationSeconds)}
            {index === current ? ", cette semaine" : ""}
            {racesByWeek.get(index) ? `, ${racesByWeek.get(index)!.name}` : ""}
          </li>
        ))}
      </ol>
    </RaceCard>
  );
}
