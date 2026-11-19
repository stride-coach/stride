import { cn } from "@/lib/utils";
import { formatDuration } from "@/features/plans/view/format";
import {
  chartMonths,
  chartRange,
  chartTicks,
  chartToday,
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
  style,
}: {
  letter: string;
  primary: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={style}
      className={cn(
        "grid size-4 place-items-center rounded-sm text-micro leading-none font-bold tabular-nums",
        primary
          ? "bg-race text-primary-foreground"
          : "border border-muted-foreground text-secondary-foreground",
        className,
      )}
    >
      {letter}
    </span>
  );
}

function raceSeconds(week: ProgramWeek) {
  return Math.max(
    0,
    week.totals.durationSeconds - week.easySeconds - week.qualitySeconds,
  );
}

function Bar({
  week,
  maximum,
  selected,
  past,
  onSelect,
}: {
  past: boolean;
  week: ProgramWeek;
  maximum: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const muted = week.isLight || (!past && week.status === "past");
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
        !past && week.status === "past" && !selected && "opacity-55",
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
          "bg-intensity-4",
          muted ? "opacity-45" : "opacity-90",
          "rounded-t-mark",
        )}
        style={{ height: `${(week.qualitySeconds / maximum) * 100}%` }}
      />
      <span
        className={cn("bg-intensity-2", muted && "opacity-45")}
        style={{ height: `${(week.easySeconds / maximum) * 100}%` }}
      />
      <span
        className={cn("bg-race", muted && "opacity-45")}
        style={{ height: `${(raceSeconds(week) / maximum) * 100}%` }}
      />
    </button>
  );
}

export function ProgramChart({
  weeks,
  bands,
  past = false,
  today: todayDate = null,
  selected,
  onSelect,
}: {
  past?: boolean;
  today?: string | null;
  weeks: ProgramWeek[];
  bands: ProgramBand[];
  selected: string | null;
  onSelect: (weekKey: string) => void;
}) {
  const maximum = Math.max(
    1,
    ...weeks.map(
      (week) => week.easySeconds + week.qualitySeconds + raceSeconds(week),
    ),
  );
  const hasRace = weeks.some((week) => raceSeconds(week) > 0);
  const columns = {
    gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))`,
  };
  const selectedIndex = weeks.findIndex((week) => week.weekKey === selected);
  const ticks = chartTicks(weeks.length, selectedIndex);
  const range = chartRange(weeks);
  const months = chartMonths(weeks);
  const today = chartToday(weeks, todayDate);
  const progress = past ? 1 : (today?.fraction ?? 0);
  const monthsLabel = today
    ? `Mois de la préparation : mois ${today.month} sur ${today.months}, aujourd’hui le ${today.label}`
    : `Mois de la préparation : ${months.map((item) => item.label).join(", ")}`;
  return (
    <section aria-labelledby="program-volume" className="flex flex-col gap-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 id="program-volume" className="font-semibold">
          {weeks.length > 1 ? `${weeks.length} semaines` : "1 semaine"}
        </h2>
        {range && (
          <span className="text-muted-foreground tabular-nums">
            {range}
            {past && " · ce que tu as couru"}
            {today &&
              ` · aujourd’hui ${today.label} · mois ${today.month} sur ${today.months}`}
          </span>
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
          {hasRace && (
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="size-2 rounded-mark bg-race"
              />
              Course
            </span>
          )}
        </span>
      </div>
      <div className="-mx-2.5 overflow-x-auto px-2.5 sm:mx-0 sm:px-0">
        <div
          style={{ "--weeks": weeks.length } as React.CSSProperties}
          className="flex min-w-[calc(var(--weeks)*2.25rem)] flex-col gap-2 sm:min-w-0"
        >
          <div
            role="img"
            aria-label={monthsLabel}
            style={columns}
            className="relative grid h-7.5 gap-x-0.75 sm:gap-x-1.5"
          >
            {months.map((item, index) => {
              const current = today?.month === index + 1;
              return (
                <span
                  key={item.start}
                  style={column(item.start, item.span)}
                  className={cn(
                    "flex h-5.5 items-baseline gap-1.25 overflow-hidden border-l border-control-border pl-1.5 text-micro leading-4 whitespace-nowrap sm:pl-1.75 sm:text-label",
                    index === months.length - 1 && "border-r",
                    current
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                  <span className="text-micro font-normal text-muted-foreground tabular-nums opacity-75">
                    {Math.round(item.seconds / 3600)} h
                  </span>
                </span>
              );
            })}
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-1.5 h-px bg-control-border"
            />
            {progress > 0 && (
              <span
                aria-hidden="true"
                className="absolute bottom-1.25 left-0 h-0.75 rounded-mark bg-primary"
                style={{ width: `${progress * 100}%` }}
              />
            )}
            {today && (
              <span
                aria-hidden="true"
                title={`Aujourd’hui · ${today.label}`}
                className="absolute bottom-0.5 size-2.25 -translate-x-1/2 rounded-full bg-primary ring-2 ring-card"
                style={{ left: `${today.fraction * 100}%` }}
              />
            )}
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
            aria-hidden="true"
            style={columns}
            className="grid gap-x-0.75 sm:gap-x-1.5"
          >
            {weeks.map((week) => (
              <span
                key={week.weekKey}
                className={cn(
                  "text-center text-micro leading-none font-semibold whitespace-nowrap tabular-nums",
                  week.weekKey === selected
                    ? "text-foreground"
                    : "text-secondary-foreground",
                )}
              >
                {formatDuration(week.totals.durationSeconds)}
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
                past={past}
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
            {weeks.map((week) => (
              <span
                key={week.weekKey}
                className="text-center text-micro leading-none whitespace-nowrap text-muted-foreground tabular-nums"
              >
                {week.totals.distanceMeters === null
                  ? "–"
                  : `${week.totals.distanceEstimated ? "≈" : ""}${formatInteger(week.totals.distanceMeters / 1000)}`}
              </span>
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
