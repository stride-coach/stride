import { cn } from "@/lib/utils";
import type { FuelingHour } from "../nutrition-view";

export function FuelingHours({
  hours,
  targetPerHourG,
}: {
  hours: FuelingHour[];
  targetPerHourG: number;
}) {
  if (hours.length === 0) return null;
  const top = Math.max(
    targetPerHourG * 1.25,
    ...hours.map((hour) => hour.carbsG),
  );
  const height = (value: number) => `${Math.min(100, (value / top) * 100)}%`;
  const labelEvery = hours.length > 12 ? 3 : hours.length > 6 ? 2 : 1;
  return (
    <div className="flex flex-col gap-2">
      <ol
        aria-label="Glucides heure par heure"
        className="relative flex h-28 items-end gap-0.5 border-b border-border"
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary"
          style={{ bottom: height(targetPerHourG) }}
        />
        {hours.map((hour) => (
          <li
            key={hour.index}
            className={cn(
              "relative flex h-full min-w-0 flex-1 items-end rounded-t-xs",
              hour.night && "bg-muted",
            )}
          >
            <span className="sr-only">
              {hour.clock} : {hour.carbsG} g
              {hour.caffeine ? ", avec caféine" : ""}
              {hour.night ? ", de nuit" : ""}
            </span>
            <span
              aria-hidden="true"
              className="block w-full rounded-t-xs bg-primary/60"
              style={{ height: height(hour.carbsG) }}
            />
            {hour.caffeine && (
              <span
                aria-hidden="true"
                className="absolute left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-warning"
                style={{ bottom: `calc(${height(hour.carbsG)} + 4px)` }}
              />
            )}
          </li>
        ))}
      </ol>
      <div
        aria-hidden="true"
        className="flex gap-0.5 text-label text-muted-foreground tabular-nums"
      >
        {hours.map((hour) => (
          <span
            key={hour.index}
            className="min-w-0 flex-1 overflow-visible whitespace-nowrap"
          >
            {hour.index % labelEvery === 0 ? hour.clock : ""}
          </span>
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-3 rounded-xs bg-primary/60"
          />
          Glucides pris dans l’heure
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="w-3 border-t border-dashed border-primary"
          />
          Cible de {targetPerHourG} g/h
        </li>
        {hours.some((hour) => hour.caffeine) && (
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-1.5 rounded-full bg-warning"
            />
            Avec caféine
          </li>
        )}
        {hours.some((hour) => hour.night) && (
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-3 rounded-xs bg-muted ring-1 ring-border"
            />
            Nuit
          </li>
        )}
      </ul>
    </div>
  );
}
