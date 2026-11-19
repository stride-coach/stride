import Link from "next/link";
import { Widget } from "@/components/stride/widget";
import { WearGauge } from "@/features/gear/components/wear-gauge";
import type { ActivityRail } from "@/server/activities/rail";
import { cn } from "@/lib/utils";

const hoursFormat = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 1,
});

function WeeklyVolume({ weeks }: { weeks: ActivityRail["weeks"] }) {
  const peak = Math.max(...weeks.map((week) => week.hours), 1);
  const label = `Volume hebdomadaire sur ${weeks.length} semaines : ${weeks
    .map((week) => `${hoursFormat.format(week.hours)} h`)
    .join(", ")}`;
  return (
    <Widget
      headingLevel={2}
      title="Volume par semaine"
      verdict={<span className="text-label text-muted-foreground">heures</span>}
    >
      <div role="img" aria-label={label} className="flex gap-1.5">
        {weeks.map((week) => (
          <span key={week.weekStart} className="flex flex-1 flex-col gap-1.5">
            <span className="flex h-18 flex-col justify-end">
              <span
                className={cn(
                  "rounded-t-xs",
                  week.current ? "bg-foreground" : "bg-data-2",
                )}
                style={{ height: `${(week.hours / peak) * 100}%` }}
              />
            </span>
            <span className="text-center text-label text-muted-foreground tabular-nums">
              {week.label}
            </span>
          </span>
        ))}
      </div>
    </Widget>
  );
}

function RecentDays({
  recent,
}: {
  recent: NonNullable<ActivityRail["recent"]>;
}) {
  const rows = [
    { label: "Durée", value: recent.duration, detail: recent.count },
    { label: "Distance", value: recent.distance, detail: recent.elevation },
  ];
  return (
    <section
      aria-labelledby="activity-rail-recent"
      className="flex flex-col gap-2 border-b border-border py-4.5"
    >
      <h2
        id="activity-rail-recent"
        className="text-label font-medium text-muted-foreground"
      >
        28 derniers jours
      </h2>
      <dl className="flex flex-col">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[84px_minmax(0,1fr)_auto] items-baseline gap-3 py-1.5"
          >
            <dt className="text-secondary-foreground">{row.label}</dt>
            <dd className="font-medium tabular-nums">{row.value}</dd>
            <dd className="text-label text-muted-foreground tabular-nums">
              {row.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Pairs({ pairs }: { pairs: ActivityRail["pairs"] }) {
  return (
    <section
      aria-labelledby="activity-rail-pairs"
      className="flex flex-col gap-2.5 py-4.5"
    >
      <h2
        id="activity-rail-pairs"
        className="text-label font-medium text-muted-foreground"
      >
        Chaussures
      </h2>
      <ul className="flex flex-col gap-3">
        {pairs.map((pair) => (
          <li key={pair.id}>
            <Link
              href={`/activities/gear/${pair.id}`}
              className="flex flex-col gap-1.5 rounded-md hover:text-foreground"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-medium">
                  {pair.model}
                </span>
                <span className="text-label whitespace-nowrap text-muted-foreground tabular-nums">
                  {pair.totalKm} km / {pair.lifespanKm}
                </span>
              </span>
              <WearGauge wear={pair.wear} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function ActivityRailAside({ rail }: { rail: ActivityRail }) {
  return (
    <aside
      aria-label="Repères"
      className="flex flex-col px-4 max-xl:hidden xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border xl:px-5"
    >
      <div className="border-b border-border py-3">
        <WeeklyVolume weeks={rail.weeks} />
      </div>
      {rail.recent && <RecentDays recent={rail.recent} />}
      {rail.pairs.length > 0 && <Pairs pairs={rail.pairs} />}
    </aside>
  );
}
