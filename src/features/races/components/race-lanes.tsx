"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import { axisTicksBetween, type AxisLanes } from "../axis";
import { fitLabels, labelWidth, placeLabel } from "../axis-layout";
import {
  centerWindow,
  isFullWindow,
  panWindow,
  resizeWindow,
  windowLabel,
  windowRatio,
  type AxisWindow,
} from "../axis-window";

const svgWidth = 1000;
const profileHeight = 88;
const laneHeight = 36;
const fuelingHeight = 32;
const overviewHeight = 28;

export type LegendKey = "walk" | "rain" | "night" | "cutoff";

type Range = { fromM: number; toM: number };

type View = {
  total: number;
  window: AxisWindow;
  at: (distanceM: number) => number;
  x: (distanceM: number) => number;
  box: (height: number) => string;
};

function makeView(total: number, window: AxisWindow): View {
  const x = (distanceM: number) =>
    total > 0 ? (distanceM / total) * svgWidth : 0;
  return {
    total,
    window,
    at: (distanceM) => windowRatio(window, distanceM),
    x,
    box: (height) =>
      `${x(window.fromM)} 0 ${Math.max(1, x(window.toM) - x(window.fromM))} ${height}`,
  };
}

function visible(at: number) {
  return at >= -0.001 && at <= 1.001;
}

function span(view: View, range: Range) {
  const from = Math.max(0, view.at(range.fromM));
  const to = Math.min(1, view.at(range.toM));
  return to > from ? { left: from, width: to - from } : null;
}

function scale(values: number[], low: number, high: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return (value: number) => high - ((value - min) / range) * (high - low);
}

function useWidth<Element extends HTMLElement>() {
  const ref = useRef<Element>(null);
  const [width, setWidth] = useState(800);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(element.getBoundingClientRect().width);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function ValueLabels({
  items,
  width,
  className,
}: {
  items: { key: string; at: number; text: string; top: number }[];
  width: number;
  className?: string;
}) {
  const sized = items
    .filter((item) => visible(item.at))
    .map((item) => ({ ...item, size: labelWidth(item.text) }));
  const shown = fitLabels(
    sized.map((item) => ({ at: item.at, width: item.size })),
    width,
  );
  return sized.map((item, index) =>
    shown[index] ? (
      <span
        key={item.key}
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute text-center text-label leading-4 whitespace-nowrap tabular-nums",
          className,
        )}
        style={{
          left: placeLabel(item.at, item.size, width),
          width: item.size,
          top: item.top,
        }}
      >
        {item.text}
      </span>
    ) : null,
  );
}

function Lane({
  label,
  height,
  view,
  className,
  children,
  overlay,
}: {
  label: string;
  height: number;
  view: View;
  className?: string;
  children: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <p className="pt-2 pb-1 text-label text-muted-foreground">{label}</p>
      <div className="relative" style={{ height }}>
        <svg
          aria-hidden="true"
          viewBox={view.box(height)}
          preserveAspectRatio="none"
          className="absolute inset-0 block size-full"
        >
          {children}
        </svg>
        {overlay}
      </div>
    </div>
  );
}

function elevationLine(
  points: [number, number][],
  view: View,
  y: (ele: number) => number,
) {
  return points
    .map(
      ([distanceM, ele], index) =>
        `${index === 0 ? "M" : "L"}${view.x(distanceM).toFixed(1)},${y(ele).toFixed(1)}`,
    )
    .join("");
}

function ProfileLane({
  lanes,
  view,
  showWalk,
}: {
  lanes: AxisLanes;
  view: View;
  showWalk: boolean;
}) {
  const values = [
    ...lanes.elevation.map(([, ele]) => ele),
    ...lanes.elevationTicks.map((tick) => tick.ele),
  ];
  const y = scale(values, 10, profileHeight - 4);
  const line = elevationLine(lanes.elevation, view, y);
  const area = `${line}L${svgWidth},${profileHeight}L0,${profileHeight}Z`;
  return (
    <Lane
      label="Profil"
      height={profileHeight}
      view={view}
      overlay={lanes.elevationTicks.map((tick) => (
        <span
          key={tick.ele}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 -translate-y-1/2 rounded-xs bg-card/80 px-0.5 text-label leading-4 text-muted-foreground tabular-nums"
          style={{ top: y(tick.ele) }}
        >
          {tick.label}
        </span>
      ))}
    >
      {lanes.elevationTicks.map((tick) => (
        <line
          key={tick.ele}
          x1={0}
          x2={svgWidth}
          y1={y(tick.ele)}
          y2={y(tick.ele)}
          className="stroke-border"
          strokeDasharray="2 4"
          vectorEffect="non-scaling-stroke"
        />
      ))}
      <path d={area} className="fill-secondary-foreground/15" />
      <path
        d={line}
        className="fill-none stroke-secondary-foreground"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      {showWalk &&
        lanes.walk.map((range) => {
          const points = lanes.elevation.filter(
            ([distanceM]) => distanceM >= range.fromM && distanceM <= range.toM,
          );
          return points.length > 1 ? (
            <path
              key={`${range.fromM}-${range.toM}`}
              d={elevationLine(points, view, y)}
              className="fill-none stroke-warning"
              strokeWidth={3}
              vectorEffect="non-scaling-stroke"
            />
          ) : null;
        })}
    </Lane>
  );
}

function PaceLane({
  lanes,
  view,
  width,
}: {
  lanes: AxisLanes;
  view: View;
  width: number;
}) {
  const paces = lanes.pace.flatMap((item) =>
    item.secondsPerKm === null ? [] : [item.secondsPerKm],
  );
  if (paces.length === 0) return null;
  const y = scale(
    paces.map((pace) => -pace),
    20,
    laneHeight - 6,
  );
  return (
    <Lane
      label="Allure"
      height={laneHeight}
      view={view}
      className="max-sm:hidden"
      overlay={
        <ValueLabels
          width={width}
          className="text-secondary-foreground"
          items={lanes.pace.flatMap((item) => {
            const range = span(view, item);
            return item.secondsPerKm === null || item.label === null || !range
              ? []
              : [
                  {
                    key: `${item.fromM}`,
                    at: range.left + range.width / 2,
                    text: item.label,
                    top: y(-item.secondsPerKm) - 18,
                  },
                ];
          })}
        />
      }
    >
      {lanes.pace.map((item) =>
        item.secondsPerKm === null ? null : (
          <line
            key={item.fromM}
            x1={view.x(item.fromM)}
            x2={view.x(item.toM)}
            y1={y(-item.secondsPerKm)}
            y2={y(-item.secondsPerKm)}
            className="stroke-primary"
            strokeWidth={2.5}
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}
    </Lane>
  );
}

function WeatherLane({
  lanes,
  view,
  width,
  label,
}: {
  lanes: AxisLanes;
  view: View;
  width: number;
  label: string;
}) {
  if (lanes.temperature.length === 0) return null;
  const y = scale(
    lanes.temperature.map((item) => item.temperature),
    20,
    laneHeight - 6,
  );
  const line = lanes.temperature
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"}${view.x(item.distanceM).toFixed(1)},${y(item.temperature).toFixed(1)}`,
    )
    .join("");
  return (
    <Lane
      label={label}
      height={laneHeight}
      view={view}
      overlay={
        <ValueLabels
          width={width}
          className="text-secondary-foreground"
          items={lanes.temperature.map((item) => ({
            key: `${item.distanceM}`,
            at: view.at(item.distanceM),
            text: item.label,
            top: y(item.temperature) - 18,
          }))}
        />
      }
    >
      <path
        d={line}
        className="fill-none stroke-foreground"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </Lane>
  );
}

function FuelingLane({
  lanes,
  view,
  width,
}: {
  lanes: AxisLanes;
  view: View;
  width: number;
}) {
  const rates = lanes.fueling.map((item) =>
    item.perHour !== null
      ? item.perHour
      : item.toM > item.fromM
        ? item.carbsG / (item.toM - item.fromM)
        : 0,
  );
  const max = Math.max(...rates, 0);
  if (max === 0) return null;
  const barHeight = (index: number) =>
    (rates[index]! / max) * (fuelingHeight - 18);
  const gap = (view.x(view.window.toM) - view.x(view.window.fromM)) / 500;
  return (
    <Lane
      label="Ravitaillement"
      height={fuelingHeight}
      view={view}
      overlay={
        <ValueLabels
          width={width}
          className="text-secondary-foreground"
          items={lanes.fueling.flatMap((item, index) => {
            const range = span(view, item);
            return item.label === null || !range
              ? []
              : [
                  {
                    key: `${item.fromM}`,
                    at: range.left + range.width / 2,
                    text: item.label,
                    top: fuelingHeight - barHeight(index) - 17,
                  },
                ];
          })}
        />
      }
    >
      {lanes.fueling.map((item, index) => (
        <rect
          key={item.fromM}
          x={view.x(item.fromM) + gap}
          width={Math.max(gap, view.x(item.toM) - view.x(item.fromM) - 2 * gap)}
          y={fuelingHeight - barHeight(index)}
          height={barHeight(index)}
          className="fill-primary/45"
        />
      ))}
    </Lane>
  );
}

function BandLabels({
  lanes,
  view,
  width,
  hidden,
}: {
  lanes: AxisLanes;
  view: View;
  width: number;
  hidden: ReadonlySet<LegendKey>;
}) {
  const bands = [
    ...(hidden.has("rain") ? [] : lanes.rain),
    ...(hidden.has("night") ? [] : lanes.night),
  ]
    .flatMap((band) => {
      const range = span(view, band);
      return range
        ? [{ band, at: range.left, size: labelWidth(band.label) }]
        : [];
    })
    .sort((left, right) => left.at - right.at);
  const place = (at: number, size: number) =>
    Math.min(width - size, Math.max(0, at * width));
  const shown = fitLabels(
    bands.map(({ at, size }) => ({
      at: (place(at, size) + size / 2) / Math.max(1, width),
      width: size,
    })),
    width,
  );
  return (
    <div aria-hidden="true" className="relative h-4">
      {bands.map((item, index) =>
        shown[index] ? (
          <span
            key={`${item.band.fromM}-${item.band.label}`}
            className="pointer-events-none absolute top-0 text-label leading-4 whitespace-nowrap text-secondary-foreground"
            style={{ left: place(item.at, item.size) }}
          >
            {item.band.label}
          </span>
        ) : null,
      )}
    </div>
  );
}

const rainPattern = {
  backgroundImage:
    "repeating-linear-gradient(135deg, color-mix(in oklab, var(--secondary-foreground) 30%, transparent) 0 1px, transparent 1px 6px)",
};

function Bands({
  ranges,
  view,
  className,
  style,
}: {
  ranges: Range[];
  view: View;
  className: string;
  style?: React.CSSProperties;
}) {
  return ranges.map((range) => {
    const place = span(view, range);
    return place ? (
      <span
        key={`${range.fromM}-${range.toM}`}
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-y-0", className)}
        style={{
          ...style,
          left: `${place.left * 100}%`,
          width: `max(1px, ${place.width * 100}%)`,
        }}
      />
    ) : null;
  });
}

function StationHeader({
  lanes,
  view,
  width,
  stationHref,
}: {
  lanes: AxisLanes;
  view: View;
  width: number;
  stationHref: ((id: string) => string) | null;
}) {
  const last = lanes.stations.length - 1;
  const items = lanes.stations
    .map((station, index) => {
      const lines = [station.name, station.clock, station.cutoff ?? ""];
      const size = Math.max(...lines.map((line) => labelWidth(line)));
      return {
        station,
        index,
        size,
        at: view.at(station.distanceM),
        priority: index === 0 || index === last ? 2 : station.cutoff ? 1 : 0,
      };
    })
    .filter((item) => visible(item.at));
  const shown = fitLabels(
    items.map(({ at, size, priority }) => ({ at, width: size, priority })),
    width,
    8,
  );
  const tall = lanes.stations.some((station) => station.cutoff);
  return (
    <div className={cn("relative", tall ? "h-12" : "h-8.5")}>
      {items.map((item, index) => {
        if (!shown[index]) return null;
        const { station } = item;
        const content = (
          <>
            <span className="max-w-full truncate font-medium text-foreground">
              {station.name}
            </span>
            <span className="text-secondary-foreground tabular-nums">
              {station.clock}
            </span>
            {station.cutoff && (
              <span className="text-warning tabular-nums">
                {station.cutoff}
              </span>
            )}
          </>
        );
        const className = cn(
          "absolute top-0 flex flex-col rounded-sm text-label leading-4 whitespace-nowrap",
          item.at <= 0.001
            ? "items-start"
            : item.at >= 0.999
              ? "items-end"
              : "items-center",
        );
        const style = {
          left: placeLabel(item.at, item.size, width),
          width: item.size,
        };
        const editable =
          stationHref !== null && item.index !== 0 && item.index !== last;
        return editable ? (
          <Link
            key={`${station.distanceM}-${station.name}`}
            href={stationHref!(station.id)}
            aria-label={`Modifier ${station.name}, passage ${station.clock}`}
            className={cn(
              className,
              "focus-visible:outline-2 focus-visible:outline-ring hover:[&>span:first-child]:text-primary",
            )}
            style={style}
          >
            {content}
          </Link>
        ) : (
          <span
            key={`${station.distanceM}-${station.name}`}
            aria-hidden="true"
            className={className}
            style={style}
          >
            {content}
          </span>
        );
      })}
    </div>
  );
}

function Overview({
  lanes,
  window,
  onWindow,
}: {
  lanes: AxisLanes;
  window: AxisWindow;
  onWindow: (window: AxisWindow) => void;
}) {
  const total = lanes.distanceM;
  const drag = useRef<{
    mode: "pan" | "from" | "to";
    startX: number;
    start: AxisWindow;
  } | null>(null);
  const full = { fromM: 0, toM: total };
  const view = makeView(total, full);
  const y = scale(
    lanes.elevation.map(([, ele]) => ele),
    3,
    overviewHeight - 2,
  );
  const line = elevationLine(lanes.elevation, view, y);
  const left = (window.fromM / total) * 100;
  const width = ((window.toM - window.fromM) / total) * 100;
  const distanceAt = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    return box.width > 0 ? ((event.clientX - box.left) / box.width) * total : 0;
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const handle = target.dataset.handle as "from" | "to" | undefined;
    let start = window;
    if (!handle && !target.dataset.window) {
      start = centerWindow(window, total, distanceAt(event));
      onWindow(start);
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { mode: handle ?? "pan", startX: event.clientX, start };
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    if (current.mode === "pan")
      onWindow(
        panWindow(
          current.start,
          total,
          ((event.clientX - current.startX) / box.width) * total,
        ),
      );
    else
      onWindow(
        resizeWindow(current.start, total, current.mode, distanceAt(event)),
      );
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  return (
    <div className="flex flex-col gap-1">
      <p className="flex items-baseline justify-between text-label text-muted-foreground">
        <span>Aperçu du parcours</span>
        <span aria-live="polite" className="tabular-nums">
          {isFullWindow(window, total)
            ? "Parcours entier"
            : windowLabel(window)}
        </span>
      </p>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative touch-none rounded-sm bg-muted select-none"
        style={{ height: overviewHeight }}
      >
        <svg
          aria-hidden="true"
          viewBox={view.box(overviewHeight)}
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 block size-full"
        >
          <path
            d={`${line}L${svgWidth},${overviewHeight}L0,${overviewHeight}Z`}
            className="fill-secondary-foreground/25"
          />
        </svg>
        <div
          data-window="true"
          aria-hidden="true"
          className="absolute inset-y-0 cursor-grab rounded-sm border border-primary bg-primary/10 active:cursor-grabbing"
          style={{ left: `${left}%`, width: `${width}%` }}
        >
          <span
            data-handle="from"
            className="absolute inset-y-0 -left-1.5 w-3 cursor-ew-resize"
          />
          <span
            data-handle="to"
            className="absolute inset-y-0 -right-1.5 w-3 cursor-ew-resize"
          />
        </div>
      </div>
    </div>
  );
}

export function RaceLanes({
  lanes,
  estimate,
  weatherLabel,
  window,
  overview,
  onWindow,
  onZoom,
  hidden,
  highlight,
  pending,
  stationHref,
  cursorM,
  cursorLabel,
  slider,
}: {
  lanes: AxisLanes;
  estimate: boolean;
  weatherLabel: string;
  window: AxisWindow;
  overview: boolean;
  onWindow: (window: AxisWindow) => void;
  onZoom: (centerM: number, factor: number) => void;
  hidden: ReadonlySet<LegendKey>;
  highlight: Range | null;
  pending: boolean;
  stationHref: ((id: string) => string) | null;
  cursorM: number;
  cursorLabel: string;
  slider: React.ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const area = useRef<HTMLDivElement>(null);
  const view = makeView(lanes.distanceM, window);
  const zoom = useRef(onZoom);
  useEffect(() => {
    zoom.current = onZoom;
  }, [onZoom]);
  useEffect(() => {
    const element = area.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const box = element.getBoundingClientRect();
      if (box.width <= 0) return;
      const ratio = (event.clientX - box.left) / box.width;
      const current = view.window;
      zoom.current(
        current.fromM + ratio * (current.toM - current.fromM),
        Math.exp(-event.deltaY / 300),
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [view.window]);
  const cursor = view.at(cursorM);
  const pillWidth = labelWidth(cursorLabel) + 12;
  const marked = highlight ? span(view, highlight) : null;
  return (
    <div ref={ref} className="flex min-w-0 flex-col gap-2">
      {overview && (
        <Overview lanes={lanes} window={window} onWindow={onWindow} />
      )}
      <div
        aria-busy={pending || undefined}
        className={cn(
          "flex min-w-0 flex-col transition-opacity duration-(--stride-duration-base) ease-stride",
          pending && "opacity-45",
        )}
      >
        <StationHeader
          lanes={lanes}
          view={view}
          width={width}
          stationHref={stationHref}
        />
        <BandLabels lanes={lanes} view={view} width={width} hidden={hidden} />
        <div ref={area} className="relative overflow-hidden">
          {!hidden.has("night") && (
            <Bands
              ranges={lanes.night}
              view={view}
              className="bg-foreground/6"
            />
          )}
          {!hidden.has("rain") && (
            <Bands
              ranges={lanes.rain}
              view={view}
              className=""
              style={rainPattern}
            />
          )}
          {marked && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 border-x border-primary/50 bg-primary/15"
              style={{
                left: `${marked.left * 100}%`,
                width: `${marked.width * 100}%`,
              }}
            />
          )}
          {lanes.stations.map((station, index) => {
            const at = view.at(station.distanceM);
            if (
              index === 0 ||
              index === lanes.stations.length - 1 ||
              !visible(at) ||
              (station.cutoff && hidden.has("cutoff"))
            )
              return null;
            return (
              <span
                key={`${station.distanceM}-${station.name}`}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-y-0 w-0 border-l",
                  station.cutoff
                    ? "border-warning"
                    : "border-dashed border-control-border",
                )}
                style={{ left: `${at * 100}%` }}
              />
            );
          })}
          {!estimate && (
            <ProfileLane
              lanes={lanes}
              view={view}
              showWalk={!hidden.has("walk")}
            />
          )}
          <PaceLane lanes={lanes} view={view} width={width} />
          {!estimate && (
            <WeatherLane
              lanes={lanes}
              view={view}
              width={width}
              label={weatherLabel}
            />
          )}
          <FuelingLane lanes={lanes} view={view} width={width} />
          {visible(cursor) && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px bg-primary"
              style={{ left: `${cursor * 100}%` }}
            />
          )}
          {slider}
        </div>
        <div
          aria-hidden="true"
          className="relative mt-1 h-6 border-t border-border"
        >
          <ValueLabels
            width={width}
            className="text-muted-foreground"
            items={axisTicksBetween(window.fromM, window.toM).map((tick) => ({
              key: `${tick.distanceM}`,
              at: view.at(tick.distanceM),
              text: tick.label,
              top: 4,
            }))}
          />
          {visible(cursor) && (
            <span
              className="pointer-events-none absolute top-0.5 rounded-sm bg-primary px-1.5 text-center text-label leading-5 font-medium whitespace-nowrap text-primary-foreground tabular-nums"
              style={{
                left: placeLabel(cursor, pillWidth, width),
                width: pillWidth,
              }}
            >
              {cursorLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
