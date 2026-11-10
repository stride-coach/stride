import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Chip } from "@/components/stride/chip";
import { Status } from "@/components/stride/status";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { coachRequestHref } from "@/features/coach/request";
import {
  formatClock,
  formatDecimal,
  formatHours,
  formatInteger,
  formatKm,
  formatPace,
} from "../format";
import type {
  RaceTimeline,
  TimelineSegment,
  TimelineStation,
} from "../timeline";
import { WeatherIcon } from "./weather-icon";

const dotTone: Record<TimelineStation["kind"], string> = {
  start: "border-foreground",
  finish: "border-foreground",
  aid: "border-primary",
  water: "border-data-2",
  base: "border-warning",
  summit: "border-foreground",
  caution: "border-foreground",
  instruction: "border-foreground",
};

function kmText(meters: number) {
  return formatKm(meters).replace(/,0$/, "");
}

function marginText(seconds: number) {
  const sign = seconds < 0 ? "−" : "+";
  return `${sign}${formatHours(Math.abs(seconds))}`;
}

function CutoffPill({
  station,
  compact = false,
}: {
  station: TimelineStation;
  compact?: boolean;
}) {
  if (station.cutoffMinutes === null) return null;
  const late = (station.marginSeconds ?? 0) < 0;
  return (
    <Status
      level={late ? "alert" : "ok"}
      className={cn(compact && "text-micro")}
    >
      {compact && station.marginSeconds !== null
        ? marginText(station.marginSeconds)
        : `barrière ${formatClock(station.cutoffMinutes)}${
            station.marginSeconds !== null
              ? ` · marge ${late ? "−" : ""}${formatHours(Math.abs(station.marginSeconds))}`
              : ""
          }`}
    </Status>
  );
}

function StationWeatherText({
  station,
  sky = true,
}: {
  station: TimelineStation;
  sky?: boolean;
}) {
  if (!station.weather && !station.night) return null;
  const parts = [
    station.weather ? `${station.weather.temperature} °C` : null,
    sky ? (station.weather?.sky ?? (station.night ? "nuit" : null)) : null,
  ].filter(Boolean);
  return (
    <span className="inline-flex items-center gap-1.25">
      {station.night && <WeatherIcon glyph="moon" className="size-3" />}
      {parts.join(" · ") || (station.night ? "nuit" : null)}
    </span>
  );
}

function Station({ station }: { station: TimelineStation }) {
  const dot = (
    <span
      aria-hidden="true"
      className={cn(
        "block shrink-0 rounded-full border-2 bg-card",
        dotTone[station.kind],
      )}
    />
  );
  return (
    <li className="break-inside-avoid">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1 py-3 max-md:hidden print:grid">
        <span className="flex justify-center pt-0.75 [&>span]:size-3.5">
          {dot}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h3 className="font-semibold">{station.name}</h3>
            <span className="text-secondary-foreground tabular-nums">
              km {kmText(station.distanceM)}
            </span>
            <CutoffPill station={station} />
          </div>
          {station.refill && (
            <p className="text-body text-secondary-foreground">
              {station.refill}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span
            data-slot="metric"
            className="text-title font-semibold tabular-nums"
          >
            {formatClock(station.clockMinutes)}
          </span>
          <span className="text-label text-muted-foreground">
            <StationWeatherText station={station} />
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-0.75 py-3 md:hidden print:hidden">
        <span className="pt-0.75 [&>span]:size-3.5">{dot}</span>
        <h3 className="font-semibold">{station.name}</h3>
        <span
          data-slot="metric"
          className="text-title font-semibold tabular-nums"
        >
          {formatClock(station.clockMinutes)}
        </span>
        <span />
        <span className="flex items-center gap-1.25 text-label text-muted-foreground">
          km {kmText(station.distanceM)}
          {(station.weather || station.night) && " · "}
          <StationWeatherText station={station} sky={false} />
        </span>
        <span className="justify-self-end">
          <CutoffPill station={station} compact />
        </span>
        {station.refill && (
          <p className="col-start-2 col-end-4 text-label text-secondary-foreground">
            {station.refill}
          </p>
        )}
      </div>
    </li>
  );
}

function Value({
  label,
  short,
  value,
  unit,
}: {
  label: string;
  short: string;
  value: string;
  unit?: string;
}) {
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <span className="text-label text-secondary-foreground">
        <span className="max-md:hidden print:inline">{label}</span>
        <span className="md:hidden print:hidden">{short}</span>
      </span>
      <span
        data-slot="metric"
        className="font-semibold whitespace-nowrap tabular-nums md:text-title"
      >
        {value}
        {unit && (
          <span
            className={cn(
              "text-label font-normal text-secondary-foreground",
              unit === "/km" && "max-md:hidden print:inline",
            )}
          >
            {" "}
            {unit}
          </span>
        )}
      </span>
    </span>
  );
}

function Segment({
  segment,
  raceId,
}: {
  segment: TimelineSegment;
  raceId: string;
}) {
  const ask = coachRequestHref(
    `Au stratège : une question sur le tronçon T${segment.index} (${segment.fromName} → ${segment.toName}).`,
    null,
    raceId,
  );
  return (
    <li className="grid break-inside-avoid grid-cols-[20px_minmax(0,1fr)] gap-2.5 md:grid-cols-[28px_minmax(0,1fr)] md:gap-3.5 print:grid-cols-[28px_minmax(0,1fr)] print:gap-3.5">
      <span aria-hidden="true" className="flex justify-center">
        <span
          className={cn(
            "w-0.5",
            segment.night ? "bg-data-2" : "bg-control-border",
          )}
        />
      </span>
      <article
        data-segment-index={segment.index}
        aria-label={`Tronçon T${segment.index}, ${segment.fromName} → ${segment.toName}`}
        className={cn(
          "my-0.5 flex min-w-0 flex-col gap-2 rounded-lg border border-border bg-muted p-3 md:gap-2.5 md:px-3.5 md:py-3",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <span className="inline-flex h-5.5 min-w-7 items-center justify-center rounded-sm border border-control-border bg-card text-label font-semibold tabular-nums">
            T{segment.index}
          </span>
          <span className="font-semibold">
            {formatKm(segment.toM - segment.fromM).replace(/,0$/, "")} km
          </span>
          <span className="text-label text-secondary-foreground md:text-body">
            +{formatInteger(segment.gainM ?? 0)}
            <span className="max-md:hidden print:inline"> m</span> · −
            {formatInteger(segment.lossM ?? 0)}
            <span className="max-md:hidden print:inline"> m</span>
          </span>
          {segment.night && (
            <Chip className="max-md:hidden print:inline-flex">
              <WeatherIcon glyph="moon" className="size-3" />
              de nuit
            </Chip>
          )}
          <span
            data-slot="metric"
            className="ml-auto font-semibold tabular-nums md:text-body-lg"
          >
            {formatHours(segment.movingSeconds)}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 md:gap-2.5">
          <Value
            label="Allure en courant"
            short="Allure"
            value={
              segment.runPaceSecondsPerKm === null
                ? "—"
                : formatPace(segment.runPaceSecondsPerKm)
            }
            unit={segment.runPaceSecondsPerKm === null ? undefined : "/km"}
          />
          <Value
            label="Marche"
            short="Marche"
            value={formatDecimal(segment.walkM / 1000).replace(/,0$/, "")}
            unit="km"
          />
          <Value
            label="Glucides"
            short="Glucides"
            value={formatInteger(segment.carbsG)}
            unit="g"
          />
        </div>
        {segment.items && (
          <div className="flex items-start gap-2 text-label text-secondary-foreground md:text-body">
            <span className="shrink-0 font-medium text-muted-foreground max-md:hidden print:inline">
              À manger
            </span>
            <span>{segment.items}</span>
          </div>
        )}
        {segment.note && (
          <div className="flex items-start gap-2 text-label md:text-body">
            <StrideMark className="mt-0.5 size-3 shrink-0" />
            <span className="flex-1">{segment.note}</span>
            <Link
              href={ask}
              className="text-label whitespace-nowrap text-primary hover:text-foreground max-md:hidden print:hidden"
            >
              Demander au stratège
            </Link>
          </div>
        )}
        <Link
          href={ask}
          className={cn(
            "flex min-h-control-touch items-center self-start text-label text-primary hover:text-foreground md:min-h-6 print:hidden",
            segment.note && "md:hidden",
          )}
        >
          Demander au stratège
        </Link>
      </article>
    </li>
  );
}

export function PlanTimeline({
  timeline,
  raceId,
}: {
  timeline: RaceTimeline;
  raceId: string;
}) {
  const items: React.ReactNode[] = [];
  timeline.stations.forEach((station, index) => {
    items.push(<Station key={station.id} station={station} />);
    const segment = timeline.segments[index];
    if (segment && index < timeline.stations.length - 1)
      items.push(
        <Segment
          key={`segment-${segment.id}`}
          segment={segment}
          raceId={raceId}
        />,
      );
  });
  return (
    <ol aria-label="Plan de course par tronçon" className="flex flex-col">
      {items}
    </ol>
  );
}
