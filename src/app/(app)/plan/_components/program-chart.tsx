import { cn } from "@/lib/utils";
import { formatDuration } from "@/features/plans/view/format";
import {
  chartMonths,
  chartRange,
  chartTicks,
} from "@/features/plans/view/program-chart";
import {
  chartDescription,
  type ProgramBand,
  type ProgramWeek,
} from "@/features/plans/view/program";
import { formatInteger } from "@/features/progress/format";

function column(start: number, span: number) {
  return { gridColumn: `${start + 1} / span ${span}` };
}

function RaceMark({
  letter,
  primary,
  className,
}: {
  letter: string;
  primary: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid size-4 place-items-center rounded-sm text-micro leading-none font-bold tabular-nums",
        primary
          ? "bg-primary text-primary-foreground"
          : "border border-muted-foreground text-secondary-foreground",
        className,
      )}
    >
      {letter}
    </span>
  );
}

function Bar({
  week,
  maximum,
  selected,
  onSelect,
}: {
  week: ProgramWeek;
  maximum: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const muted = week.isLight || week.status === "past";
  const distance =
    week.totals.distanceMeters !== null
      ? formatInteger(week.totals.distanceMeters / 1000)
      : null;
  const approximate = week.totals.distanceEstimated;
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={[
        `Semaine ${week.number}, ${week.range}`,
        formatDuration(week.totals.durationSeconds),
        distance ? `${approximate ? "environ " : ""}${distance} km` : null,
      ]
        .filter(Boolean)
        .join(", ")}
      title={`S${week.number} · ${formatDuration(week.totals.durationSeconds)}`}
      onClick={onSelect}
      className={cn(
        "relative flex h-24 min-w-0 flex-col justify-end rounded-xs outline-offset-3 transition-opacity duration-150 ease-stride hover:opacity-100 sm:h-37.5",
        selected && "outline-1 outline-foreground",
        week.status === "past" && !selected && "opacity-55",
      )}
    >
      {week.race && (
        <RaceMark
          letter={week.race.letter}
          primary={week.race.primary}
          className="absolute -top-5.5 left-1/2 -translate-x-1/2"
        />
      )}
      <span
        className={cn(
          "rounded-t-mark bg-intensity-4",
          muted ? "opacity-45" : "opacity-90",
        )}
        style={{ height: `${(week.qualitySeconds / maximum) * 100}%` }}
      />
      <span
        className={cn("bg-intensity-2", muted && "opacity-45")}
        style={{ height: `${(week.easySeconds / maximum) * 100}%` }}
      />
    </button>
  );
}

export function ProgramChart({
  weeks,
  bands,
  selected,
  onSelect,
}: {
  weeks: ProgramWeek[];
  bands: ProgramBand[];
  selected: string | null;
  onSelect: (weekKey: string) => void;
}) {
  const maximum = Math.max(
    1,
    ...weeks.map((week) => week.easySeconds + week.qualitySeconds),
  );
  const columns = {
    gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
  };
  const selectedIndex = weeks.findIndex((week) => week.weekKey === selected);
  const ticks = chartTicks(weeks.length, selectedIndex);
  const range = chartRange(weeks);
  return (
    <section aria-labelledby="program-volume" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="program-volume" className="font-semibold">
          {weeks.length > 1 ? `${weeks.length} semaines` : "1 semaine"}
        </h2>
        {range && (
          <span className="text-muted-foreground tabular-nums">{range}</span>
        )}
        <span className="ml-auto flex gap-3.5 text-label text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-mark bg-intensity-2"
            />
            Facile
          </span>
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-mark bg-intensity-4"
            />
            Qualité
          </span>
        </span>
      </div>
      <div className="-mx-2.5 overflow-x-auto px-2.5 sm:mx-0 sm:px-0">
        <div
          style={{ "--weeks": weeks.length } as React.CSSProperties}
          className="flex min-w-[calc(var(--weeks)*1.5rem)] flex-col gap-2 sm:min-w-0"
        >
          <div
            aria-hidden="true"
            style={columns}
            className="grid gap-x-0.75 sm:gap-x-1.5"
          >
            {chartMonths(weeks).map((item) => (
              <span
                key={item.start}
                style={column(item.start, item.span)}
                className="text-micro whitespace-nowrap text-muted-foreground"
              >
                {item.label}
              </span>
            ))}
          </div>
          <div
            aria-hidden="true"
            style={columns}
            className="grid gap-x-0.75 sm:gap-x-1.5"
          >
            {bands.map((band) => (
              <span
                key={`${band.key}-${band.start}`}
                style={column(band.start, band.span)}
                className={cn(
                  "flex h-6 min-w-0 items-center overflow-hidden rounded-md border bg-muted px-2 text-label font-medium whitespace-nowrap",
                  band.current
                    ? "border-control-border text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                <span className="truncate">{band.name}</span>
              </span>
            ))}
          </div>
          <div
            role="group"
            aria-label={chartDescription(weeks)}
            style={columns}
            className="grid items-end gap-x-0.75 pt-5.5 sm:gap-x-1.5"
          >
            {weeks.map((week) => (
              <Bar
                key={week.weekKey}
                week={week}
                maximum={maximum}
                selected={week.weekKey === selected}
                onSelect={() => onSelect(week.weekKey)}
              />
            ))}
          </div>
          <div
            aria-hidden="true"
            style={columns}
            className="grid gap-x-0.75 sm:gap-x-1.5"
          >
            {weeks.map((week, index) => (
              <span
                key={week.weekKey}
                className={cn(
                  "text-center text-micro font-medium whitespace-nowrap tabular-nums",
                  week.weekKey === selected
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                {ticks.has(index) ? `S${week.number}` : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
