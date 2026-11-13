"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { AxisLanes } from "../axis";
import { fitLabels, labelWidth, placeLabel } from "../axis-layout";

const svgWidth = 1000;
const profileHeight = 88;
const laneHeight = 36;
const fuelingHeight = 32;

type Range = { fromM: number; toM: number };

function ratio(distanceM: number, total: number) {
  return total > 0 ? Math.min(1, Math.max(0, distanceM / total)) : 0;
}

function percent(distanceM: number, total: number) {
  return `${ratio(distanceM, total) * 100}%`;
}

function svgX(distanceM: number, total: number) {
  return ratio(distanceM, total) * svgWidth;
}

function scale(values: number[], low: number, high: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return (value: number) => high - ((value - min) / span) * (high - low);
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
  const sized = items.map((item) => ({ ...item, size: labelWidth(item.text) }));
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
  className,
  children,
  overlay,
}: {
  label: string;
  height: number;
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
          viewBox={`0 0 ${svgWidth} ${height}`}
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

function ProfileLane({ lanes }: { lanes: AxisLanes }) {
  const total = lanes.distanceM;
  const values = [
    ...lanes.elevation.map(([, ele]) => ele),
    ...lanes.elevationTicks.map((tick) => tick.ele),
  ];
  const y = scale(values, 10, profileHeight - 4);
  const line = (points: [number, number][]) =>
    points
      .map(
        ([distanceM, ele], index) =>
          `${index === 0 ? "M" : "L"}${svgX(distanceM, total).toFixed(1)},${y(ele).toFixed(1)}`,
      )
      .join("");
  const area = `${line(lanes.elevation)}L${svgWidth},${profileHeight}L0,${profileHeight}Z`;
  return (
    <Lane
      label="Profil"
      height={profileHeight}
      overlay={
        <>
          {lanes.elevationTicks.map((tick) => (
            <span
              key={tick.ele}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 -translate-y-1/2 rounded-xs bg-card/80 px-0.5 text-label leading-4 text-muted-foreground tabular-nums"
              style={{ top: y(tick.ele) }}
            >
              {tick.label}
            </span>
          ))}
        </>
      }
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
        d={line(lanes.elevation)}
        className="fill-none stroke-secondary-foreground"
        strokeWidth={1.25}
        vectorEffect="non-scaling-stroke"
      />
      {lanes.walk.map((range) => {
        const points = lanes.elevation.filter(
          ([distanceM]) => distanceM >= range.fromM && distanceM <= range.toM,
        );
        return points.length > 1 ? (
          <path
            key={`${range.fromM}-${range.toM}`}
            d={line(points)}
            className="fill-none stroke-warning"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
          />
        ) : null;
      })}
    </Lane>
  );
}

function PaceLane({ lanes, width }: { lanes: AxisLanes; width: number }) {
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
      className="max-sm:hidden"
      overlay={
        <ValueLabels
          width={width}
          className="text-secondary-foreground"
          items={lanes.pace.flatMap((item) =>
            item.secondsPerKm === null || item.label === null
              ? []
              : [
                  {
                    key: `${item.fromM}`,
                    at: ratio((item.fromM + item.toM) / 2, lanes.distanceM),
                    text: item.label,
                    top: y(-item.secondsPerKm) - 18,
                  },
                ],
          )}
        />
      }
    >
      {lanes.pace.map((item) =>
        item.secondsPerKm === null ? null : (
          <line
            key={item.fromM}
            x1={svgX(item.fromM, lanes.distanceM)}
            x2={svgX(item.toM, lanes.distanceM)}
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
  width,
  label,
}: {
  lanes: AxisLanes;
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
        `${index === 0 ? "M" : "L"}${svgX(item.distanceM, lanes.distanceM).toFixed(1)},${y(item.temperature).toFixed(1)}`,
    )
    .join("");
  return (
    <Lane
      label={label}
      height={laneHeight}
      overlay={
        <ValueLabels
          width={width}
          className="text-secondary-foreground"
          items={lanes.temperature.map((item) => ({
            key: `${item.distanceM}`,
            at: ratio(item.distanceM, lanes.distanceM),
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

function FuelingLane({ lanes, width }: { lanes: AxisLanes; width: number }) {
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
  return (
    <Lane
      label="Ravitaillement"
      height={fuelingHeight}
      overlay={
        <ValueLabels
          width={width}
          className="text-secondary-foreground"
          items={lanes.fueling.flatMap((item, index) =>
            item.label === null
              ? []
              : [
                  {
                    key: `${item.fromM}`,
                    at: ratio((item.fromM + item.toM) / 2, lanes.distanceM),
                    text: item.label,
                    top: fuelingHeight - barHeight(index) - 17,
                  },
                ],
          )}
        />
      }
    >
      {lanes.fueling.map((item, index) => (
        <rect
          key={item.fromM}
          x={svgX(item.fromM, lanes.distanceM) + 1}
          width={Math.max(
            1,
            svgX(item.toM, lanes.distanceM) -
              svgX(item.fromM, lanes.distanceM) -
              2,
          )}
          y={fuelingHeight - barHeight(index)}
          height={barHeight(index)}
          className="fill-primary/45"
        />
      ))}
    </Lane>
  );
}

function BandLabels({ lanes, width }: { lanes: AxisLanes; width: number }) {
  const bands = [...lanes.rain, ...lanes.night]
    .map((band) => ({
      band,
      at: ratio(band.fromM, lanes.distanceM),
      size: labelWidth(band.label),
    }))
    .sort((left, right) => left.at - right.at);
  if (bands.length === 0) return null;
  const left = (at: number, size: number) =>
    Math.min(width - size, Math.max(0, at * width));
  const shown = fitLabels(
    bands.map(({ at, size }) => ({
      at: (left(at, size) + size / 2) / Math.max(1, width),
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
            style={{ left: left(item.at, item.size) }}
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
  total,
  className,
  style,
}: {
  ranges: Range[];
  total: number;
  className: string;
  style?: React.CSSProperties;
}) {
  return ranges.map((range) => (
    <span
      key={`${range.fromM}-${range.toM}`}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-y-0", className)}
      style={{
        ...style,
        left: percent(range.fromM, total),
        width: `max(1px, ${(ratio(range.toM, total) - ratio(range.fromM, total)) * 100}%)`,
      }}
    />
  ));
}

function StationHeader({ lanes, width }: { lanes: AxisLanes; width: number }) {
  const last = lanes.stations.length - 1;
  const items = lanes.stations.map((station, index) => {
    const lines = [station.name, station.clock, station.cutoff ?? ""];
    const size = Math.max(...lines.map((line) => labelWidth(line)));
    return {
      station,
      size,
      at: ratio(station.distanceM, lanes.distanceM),
      priority: index === 0 || index === last ? 2 : station.cutoff ? 1 : 0,
    };
  });
  const shown = fitLabels(
    items.map(({ at, size, priority }) => ({ at, width: size, priority })),
    width,
    8,
  );
  const tall = lanes.stations.some((station) => station.cutoff);
  return (
    <div aria-hidden="true" className={cn("relative", tall ? "h-12" : "h-8.5")}>
      {items.map((item, index) =>
        shown[index] ? (
          <span
            key={`${item.station.distanceM}-${item.station.name}`}
            className={cn(
              "absolute top-0 flex flex-col text-label leading-4 whitespace-nowrap",
              index === 0
                ? "items-start"
                : index === last
                  ? "items-end"
                  : "items-center",
            )}
            style={{
              left: placeLabel(item.at, item.size, width),
              width: item.size,
            }}
          >
            <span className="max-w-full truncate font-medium text-foreground">
              {item.station.name}
            </span>
            <span className="text-secondary-foreground tabular-nums">
              {item.station.clock}
            </span>
            {item.station.cutoff && (
              <span className="text-warning tabular-nums">
                {item.station.cutoff}
              </span>
            )}
          </span>
        ) : null,
      )}
    </div>
  );
}

export function RaceLanes({
  lanes,
  estimate,
  weatherLabel,
  cursorM,
  cursorLabel,
  slider,
}: {
  lanes: AxisLanes;
  estimate: boolean;
  weatherLabel: string;
  cursorM: number;
  cursorLabel: string;
  slider: React.ReactNode;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const total = lanes.distanceM;
  const cursor = ratio(cursorM, total);
  const pillWidth = labelWidth(cursorLabel) + 12;
  return (
    <div ref={ref} className="flex min-w-0 flex-col">
      <StationHeader lanes={lanes} width={width} />
      <BandLabels lanes={lanes} width={width} />
      <div className="relative">
        <Bands ranges={lanes.night} total={total} className="bg-foreground/6" />
        <Bands
          ranges={lanes.rain}
          total={total}
          className=""
          style={rainPattern}
        />
        {lanes.stations.map((station, index) =>
          index === 0 || index === lanes.stations.length - 1 ? null : (
            <span
              key={`${station.distanceM}-${station.name}`}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-y-0 w-0 border-l",
                station.cutoff
                  ? "border-warning"
                  : "border-dashed border-control-border",
              )}
              style={{ left: percent(station.distanceM, total) }}
            />
          ),
        )}
        {!estimate && <ProfileLane lanes={lanes} />}
        <PaceLane lanes={lanes} width={width} />
        {!estimate && (
          <WeatherLane lanes={lanes} width={width} label={weatherLabel} />
        )}
        <FuelingLane lanes={lanes} width={width} />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 w-px bg-primary"
          style={{ left: `${cursor * 100}%` }}
        />
        {slider}
      </div>
      <div
        aria-hidden="true"
        className="relative mt-1 h-6 border-t border-border"
      >
        <ValueLabels
          width={width}
          className="text-muted-foreground"
          items={lanes.ticks.map((tick) => ({
            key: `${tick.distanceM}`,
            at: ratio(tick.distanceM, total),
            text: tick.label,
            top: 4,
          }))}
        />
        <span
          className="pointer-events-none absolute top-0.5 rounded-sm bg-primary px-1.5 text-center text-label leading-5 font-medium whitespace-nowrap text-primary-foreground tabular-nums"
          style={{
            left: placeLabel(cursor, pillWidth, width),
            width: pillWidth,
          }}
        >
          {cursorLabel}
        </span>
      </div>
    </div>
  );
}
