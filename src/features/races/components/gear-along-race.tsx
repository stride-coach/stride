import { RaceCard } from "./race-ui";
import type { WeatherGear } from "../gear-weather";

export function GearAlongRace({
  items,
  distanceM,
  normals,
}: {
  items: WeatherGear[];
  distanceM: number;
  normals: boolean;
}) {
  if (items.length === 0) return null;
  const left = (meters: number) =>
    `${(Math.min(meters, distanceM) / distanceM) * 100}%`;
  const width = (fromM: number, toM: number) =>
    `${Math.max(0.6, ((Math.min(toM, distanceM) - fromM) / distanceM) * 100)}%`;
  return (
    <RaceCard aria-labelledby="gear-along">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 id="gear-along" className="font-semibold">
          Ce que tu portes, au fil de la course
        </h2>
        <p className="text-label text-muted-foreground">
          décidé par la météo et la nuit
        </p>
      </div>
      <ul className="flex flex-col">
        {items.map((item) => (
          <li
            key={item.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 border-t border-border py-2.5 first:border-t-0 first:pt-0 md:grid-cols-[13rem_minmax(0,1fr)_9rem]"
          >
            <span className="flex flex-col">
              <span className="font-medium">{item.label}</span>
              <span className="text-label text-muted-foreground">
                {item.reason}
              </span>
            </span>
            <span className="text-right text-label text-secondary-foreground tabular-nums md:order-last">
              {item.where}
            </span>
            <span
              aria-hidden="true"
              className="relative col-span-2 h-2 rounded-full bg-muted md:col-span-1"
            >
              {item.ranges.map((range) => (
                <span
                  key={`${range.fromM}-${range.toM}`}
                  className={
                    item.key === "torch"
                      ? "absolute inset-y-0 rounded-full bg-foreground/70"
                      : item.key === "jacket"
                        ? "absolute inset-y-0 rounded-full bg-primary"
                        : "absolute inset-y-0 rounded-full bg-warning"
                  }
                  style={{
                    left: left(range.fromM),
                    width: width(range.fromM, range.toM),
                  }}
                />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between text-label text-muted-foreground tabular-nums md:mr-[calc(9rem+1rem)] md:ml-[calc(13rem+1rem)]">
        <span>km 0</span>
        <span>km {Math.round(distanceM / 1000)}</span>
      </p>
      <p className="text-label text-pretty text-muted-foreground">
        {normals
          ? "Avant la prévision, la liste suit les moyennes de saison. Ensuite elle suit la météo à l’heure de ton passage."
          : "La liste suit la prévision à l’heure de ton passage."}
      </p>
    </RaceCard>
  );
}
