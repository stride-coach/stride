import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { MonoLabel } from "@/components/stride/mono-label";
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
  aid: "border-accent",
  water: "border-provider",
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
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.25 py-0.5 text-xs whitespace-nowrap",
        late
          ? "border-danger-border text-danger"
          : "border-success-border text-success",
        compact && "text-micro",
      )}
    >
      {compact && station.marginSeconds !== null
        ? marginText(station.marginSeconds)
        : `barrière ${formatClock(station.cutoffMinutes)}${
            station.marginSeconds !== null
              ? ` · marge ${late ? "−" : ""}${formatHours(Math.abs(station.marginSeconds))}`
              : ""
          }`}
    </span>
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
        "block shrink-0 rounded-full border-2 bg-surface-inset",
        dotTone[station.kind],
      )}
    />
  );
  return (
    <li className="break-inside-avoid">
      <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-x-3.5 gap-y-1 py-3.5 max-md:hidden print:grid">
        <span className="flex justify-center pt-0.75 [&>span]:size-4">
          {dot}
        </span>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-baseline gap-2.5">
            <h3 className="text-base font-semibold">{station.name}</h3>
            <span className="font-metric text-base font-semibold text-muted-foreground tabular-nums">
              km {kmText(station.distanceM)}
            </span>
            <CutoffPill station={station} />
          </div>
          {station.refill && (
            <p className="text-meta text-muted">{station.refill}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="font-metric text-2xl font-semibold tabular-nums">
            {formatClock(station.clockMinutes)}
          </span>
          <span className="text-xs text-muted-foreground">
            <StationWeatherText station={station} />
          </span>
        </div>
      </div>
      <div className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-x-2.5 gap-y-0.75 py-3 md:hidden print:hidden">
        <span className="pt-0.75 [&>span]:size-3.5">{dot}</span>
        <h3 className="text-[0.9375rem] font-semibold">{station.name}</h3>
        <span className="font-metric text-xl font-semibold tabular-nums">
          {formatClock(station.clockMinutes)}
        </span>
        <span />
        <span className="flex items-center gap-1.25 text-xs text-muted-foreground">
          km {kmText(station.distanceM)}
          {(station.weather || station.night) && " · "}
          <StationWeatherText station={station} sky={false} />
        </span>
        <span className="justify-self-end">
          <CutoffPill station={station} compact />
        </span>
        {station.refill && (
          <p className="col-start-2 col-end-4 text-xs leading-normal text-muted">
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
      <MonoLabel size="nano" className="max-md:text-[8px]">
        <span className="max-md:hidden print:inline">{label}</span>
        <span className="md:hidden print:hidden">{short}</span>
      </MonoLabel>
      <span className="font-metric text-[1.0625rem] font-semibold tabular-nums md:text-xl">
        {value}
        {unit && (
          <span
            className={cn(
              "text-xs text-muted-foreground max-md:text-[1.0625rem] max-md:text-foreground",
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
            segment.night ? "bg-night" : "bg-border-strong",
          )}
        />
      </span>
      <article
        data-segment-index={segment.index}
        aria-label={`Tronçon T${segment.index}, ${segment.fromName} → ${segment.toName}`}
        className={cn(
          "my-0.5 flex min-w-0 flex-col gap-2 rounded-card border bg-surface p-3 md:gap-2.5 md:px-4 md:py-3.5",
          segment.night ? "border-night/35" : "border-border",
        )}
      >
        <div className="flex flex-wrap items-center gap-2 md:gap-2.5">
          <span className="inline-flex h-5.5 min-w-7 items-center justify-center rounded-control border border-border-strong bg-surface-raised font-metric text-xs font-semibold">
            T{segment.index}
          </span>
          <span className="text-meta font-semibold md:text-sm">
            {formatKm(segment.toM - segment.fromM).replace(/,0$/, "")} km
          </span>
          <span className="text-xs text-muted md:text-meta">
            +{formatInteger(segment.gainM ?? 0)}
            <span className="max-md:hidden print:inline"> m</span> · −
            {formatInteger(segment.lossM ?? 0)}
            <span className="max-md:hidden print:inline"> m</span>
          </span>
          {segment.night && (
            <span className="inline-flex items-center gap-1.25 rounded-full border border-night/35 px-2.25 py-0.5 text-xs text-night max-md:hidden print:inline-flex">
              <WeatherIcon glyph="moon" className="size-3" />
              de nuit
            </span>
          )}
          <span className="ml-auto font-metric text-[0.9375rem] font-semibold tabular-nums md:text-base">
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
          <div className="flex items-start gap-2 text-xs text-muted md:text-meta">
            <MonoLabel
              size="nano"
              className="shrink-0 pt-0.5 max-md:hidden print:inline"
            >
              À manger
            </MonoLabel>
            <span>{segment.items}</span>
          </div>
        )}
        {segment.note && (
          <div className="flex items-start gap-2 text-xs leading-normal md:text-meta">
            <StrideMark className="size-3.5 shrink-0" />
            <span className="flex-1">{segment.note}</span>
            <Link
              href={ask}
              className="text-xs whitespace-nowrap text-accent underline underline-offset-2 hover:text-foreground max-md:hidden print:hidden"
            >
              Demander au stratège
            </Link>
          </div>
        )}
        <Link
          href={ask}
          className={cn(
            "flex min-h-8 items-center self-start text-xs text-accent underline underline-offset-2 hover:text-foreground print:hidden",
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
