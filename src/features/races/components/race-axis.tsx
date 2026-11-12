"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type {
  AxisLanes,
  AxisReading,
  RoadbookRow,
  RoadbookTotals,
} from "../axis";
import type { MapData } from "../map";
import { MapCard, type MapSegment } from "./map-card";

const width = 1000;

type Range = { fromM: number; toM: number };

function x(distanceM: number, total: number) {
  return (distanceM / total) * width;
}

function Bands({
  ranges,
  total,
  height,
  className,
}: {
  ranges: Range[];
  total: number;
  height: number;
  className: string;
}) {
  return ranges.map((range) => (
    <rect
      key={`${range.fromM}-${range.toM}`}
      x={x(range.fromM, total)}
      width={Math.max(1, x(range.toM, total) - x(range.fromM, total))}
      y={0}
      height={height}
      className={className}
    />
  ));
}

function Lane({
  label,
  short,
  height,
  children,
}: {
  label: string;
  short?: string;
  height: number;
  children: React.ReactNode;
}) {
  return (
    <div className="contents">
      <span className="flex items-center border-t border-border pr-3 text-label text-muted-foreground">
        {short ? (
          <>
            <span className="sm:hidden">{short}</span>
            <span className="max-sm:hidden">{label}</span>
          </>
        ) : (
          label
        )}
      </span>
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full border-t border-border"
        style={{ height }}
      >
        {children}
      </svg>
    </div>
  );
}

function scale(values: number[], low: number, high: number) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  return (value: number) => high - ((value - min) / span) * (high - low);
}

function ProfileLane({ lanes }: { lanes: AxisLanes }) {
  const height = 88;
  const total = lanes.distanceM;
  const y = scale(
    lanes.elevation.map(([, ele]) => ele),
    10,
    height - 4,
  );
  const line = (points: [number, number][]) =>
    points
      .map(
        ([distanceM, ele], index) =>
          `${index === 0 ? "M" : "L"}${x(distanceM, total).toFixed(1)},${y(ele).toFixed(1)}`,
      )
      .join("");
  const area = `${line(lanes.elevation)}L${width},${height}L0,${height}Z`;
  return (
    <Lane label="Profil" height={height}>
      <Bands
        ranges={lanes.night}
        total={total}
        height={height}
        className="fill-muted"
      />
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
      {lanes.stations.map((station) => (
        <line
          key={`${station.distanceM}-${station.name}`}
          x1={x(station.distanceM, total)}
          x2={x(station.distanceM, total)}
          y1={0}
          y2={height}
          className={station.cutoff ? "stroke-warning" : "stroke-border"}
          strokeDasharray={station.cutoff ? undefined : "3 3"}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </Lane>
  );
}

function PaceLane({ lanes }: { lanes: AxisLanes }) {
  const height = 36;
  const paces = lanes.pace.flatMap((item) =>
    item.secondsPerKm === null ? [] : [item.secondsPerKm],
  );
  if (paces.length === 0) return null;
  const y = scale(
    paces.map((pace) => -pace),
    8,
    height - 8,
  );
  return (
    <Lane label="Allure" height={height}>
      <Bands
        ranges={lanes.night}
        total={lanes.distanceM}
        height={height}
        className="fill-muted"
      />
      {lanes.pace.map((item) =>
        item.secondsPerKm === null ? null : (
          <line
            key={item.fromM}
            x1={x(item.fromM, lanes.distanceM)}
            x2={x(item.toM, lanes.distanceM)}
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

function WeatherLane({ lanes }: { lanes: AxisLanes }) {
  const height = 36;
  if (lanes.temperature.length === 0) return null;
  const y = scale(
    lanes.temperature.map((item) => item.temperature),
    8,
    height - 8,
  );
  const line = lanes.temperature
    .map(
      (item, index) =>
        `${index === 0 ? "M" : "L"}${x(item.distanceM, lanes.distanceM).toFixed(1)},${y(item.temperature).toFixed(1)}`,
    )
    .join("");
  return (
    <Lane label="Météo" height={height}>
      <Bands
        ranges={lanes.night}
        total={lanes.distanceM}
        height={height}
        className="fill-muted"
      />
      <Bands
        ranges={lanes.rain}
        total={lanes.distanceM}
        height={height}
        className="fill-primary/25"
      />
      <path
        d={line}
        className="fill-none stroke-foreground"
        strokeWidth={1.5}
        vectorEffect="non-scaling-stroke"
      />
    </Lane>
  );
}

function FuelingLane({ lanes }: { lanes: AxisLanes }) {
  const height = 32;
  const rates = lanes.fueling.map((item) =>
    item.toM > item.fromM ? item.carbsG / (item.toM - item.fromM) : 0,
  );
  const max = Math.max(...rates, 0);
  if (max === 0) return null;
  return (
    <Lane label="Ravitaillement" short="Ravito" height={height}>
      <Bands
        ranges={lanes.night}
        total={lanes.distanceM}
        height={height}
        className="fill-muted"
      />
      {lanes.fueling.map((item, index) => {
        const barHeight = (rates[index] / max) * (height - 8);
        return (
          <rect
            key={item.fromM}
            x={x(item.fromM, lanes.distanceM) + 1}
            width={Math.max(
              1,
              x(item.toM, lanes.distanceM) - x(item.fromM, lanes.distanceM) - 2,
            )}
            y={height - barHeight}
            height={barHeight}
            className="fill-primary/45"
          />
        );
      })}
    </Lane>
  );
}

function Swatch({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-3 rounded-xs", className)}
    />
  );
}

function Legend({
  lanes,
  walkThreshold,
}: {
  lanes: AxisLanes;
  walkThreshold: number;
}) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground">
      {lanes.walk.length > 0 && (
        <li className="flex items-center gap-1.5">
          <Swatch className="bg-warning" />
          Côte à {walkThreshold} % ou plus : tu marches
        </li>
      )}
      {lanes.rain.length > 0 && (
        <li className="flex items-center gap-1.5">
          <Swatch className="bg-primary/25" />
          Pluie prévue
        </li>
      )}
      {lanes.night.length > 0 && (
        <li className="flex items-center gap-1.5">
          <Swatch className="bg-muted ring-1 ring-border" />
          Nuit
        </li>
      )}
      {lanes.stations.some((station) => station.cutoff) && (
        <li className="flex items-center gap-1.5">
          <Swatch className="h-3 w-0.5 bg-warning" />
          Barrière horaire
        </li>
      )}
    </ul>
  );
}

function km(distanceM: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    distanceM / 1000,
  );
}

function readingText(reading: AxisReading) {
  return [
    `km ${km(reading.distanceM)}, ${reading.clock}`,
    reading.terrain.value,
    reading.instruction.value,
    reading.weather?.value,
  ]
    .filter(Boolean)
    .join(", ");
}

function CursorPanel({ reading }: { reading: AxisReading }) {
  const rows = [
    { label: "Terrain", fact: reading.terrain },
    { label: "Consigne", fact: reading.instruction },
    { label: "Météo", fact: reading.weather },
    { label: "À prendre", fact: reading.intake },
    { label: "Lumière", fact: reading.light },
  ];
  return (
    <section
      aria-labelledby="axis-cursor"
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5 xl:sticky xl:top-4"
    >
      <div className="flex items-baseline gap-3">
        <h2
          id="axis-cursor"
          className="text-label font-medium text-muted-foreground"
        >
          Sous le curseur
        </h2>
        <span aria-live="polite" className="ml-auto font-semibold tabular-nums">
          km {km(reading.distanceM)} · {reading.clock}
        </span>
      </div>
      <dl className="flex flex-col gap-2">
        {rows.map(({ label, fact }) =>
          fact ? (
            <div
              key={label}
              className="grid grid-cols-[76px_minmax(0,1fr)] items-baseline gap-x-3"
            >
              <dt className="text-secondary-foreground">{label}</dt>
              <dd className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-2">
                <span className="font-medium text-pretty">{fact.value}</span>
                {fact.detail && (
                  <span className="text-label text-muted-foreground tabular-nums">
                    {fact.detail}
                  </span>
                )}
              </dd>
            </div>
          ) : null,
        )}
      </dl>
    </section>
  );
}

function Roadbook({
  rows,
  totals,
  section,
  onSelect,
}: {
  rows: RoadbookRow[];
  totals: RoadbookTotals;
  section: number;
  onSelect: (fromM: number) => void;
}) {
  const head =
    "px-2 py-2 text-left text-label font-normal text-muted-foreground";
  const cell = "px-2 py-2.5 align-top tabular-nums";
  const number = "whitespace-nowrap text-right";
  return (
    <section
      aria-labelledby="axis-roadbook"
      className="flex min-w-0 flex-col gap-2"
    >
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 id="axis-roadbook" className="font-semibold">
          Carnet de route
        </h2>
        <p className="text-label text-muted-foreground">
          La ligne suit le curseur
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-180 border-collapse text-body">
          <thead className="border-b border-border">
            <tr>
              <th scope="col" className={head}>
                Section
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Dist.
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                D+
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Allure
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Marche
              </th>
              <th scope="col" className={head}>
                Météo
              </th>
              <th scope="col" className={head}>
                Ce que tu prends
              </th>
              <th scope="col" className={cn(head, "text-right")}>
                Passage
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const current = row.index === section;
              return (
                <tr
                  key={row.index}
                  aria-current={current ? "true" : undefined}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    current && "bg-muted",
                  )}
                >
                  <th scope="row" className={cn(cell, "text-left font-normal")}>
                    <button
                      type="button"
                      onClick={() => onSelect(row.fromM)}
                      className="flex min-h-control-touch items-baseline gap-2 text-left hover:text-primary md:min-h-0"
                    >
                      <span className="text-muted-foreground">{row.index}</span>
                      <span className="font-medium">{row.section}</span>
                    </button>
                  </th>
                  <td className={cn(cell, number)}>{row.distance}</td>
                  <td className={cn(cell, number, "text-secondary-foreground")}>
                    {row.gain ?? "—"}
                  </td>
                  <td className={cn(cell, number)}>{row.pace ?? "—"}</td>
                  <td className={cn(cell, number, "text-secondary-foreground")}>
                    {row.walk}
                  </td>
                  <td
                    className={cn(
                      cell,
                      "whitespace-nowrap text-secondary-foreground",
                    )}
                  >
                    {row.weather ?? "—"}
                  </td>
                  <td className={cn(cell, "text-pretty")}>
                    {row.intake ?? "—"}
                  </td>
                  <td className={cn(cell, "text-right whitespace-nowrap")}>
                    <span className="font-semibold">{row.passage}</span>
                    {row.cutoff && (
                      <span
                        className={cn(
                          "block text-label",
                          row.tight ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        {row.cutoff}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t border-border">
            <tr>
              <th scope="row" className={cn(cell, "text-left font-medium")}>
                Total
              </th>
              <td className={cn(cell, number, "font-medium")}>
                {totals.distance}
              </td>
              <td className={cn(cell, number, "font-medium")}>
                {totals.gain ?? "—"}
              </td>
              <td className={cell} />
              <td className={cn(cell, number, "font-medium")}>{totals.walk}</td>
              <td className={cell} />
              <td className={cn(cell, "text-secondary-foreground")}>
                {totals.carbs ?? "—"}
              </td>
              <td className={cn(cell, "text-right font-semibold")}>
                {totals.finish}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

export function RaceAxis({
  lanes,
  readings,
  rows,
  totals,
  walkThreshold,
  map,
}: {
  lanes: AxisLanes;
  readings: AxisReading[];
  rows: RoadbookRow[];
  totals: RoadbookTotals;
  walkThreshold: number;
  map: {
    data: MapData;
    segments: MapSegment[];
    title: string;
    rainLabel: "Météo" | "Averses";
    hasWeather: boolean;
  };
}) {
  const [index, setIndex] = useState(0);
  const reading = readings[index] ?? readings[0];
  const last = readings.length - 1;
  const move = (next: number) => setIndex(Math.min(last, Math.max(0, next)));
  const pick = (distanceM: number) =>
    move(
      readings.reduce(
        (best, item, position) =>
          Math.abs(item.distanceM - distanceM) <
          Math.abs(readings[best].distanceM - distanceM)
            ? position
            : best,
        0,
      ),
    );
  const onPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    if (box.width <= 0) return;
    const ratio = Math.min(
      1,
      Math.max(0, (event.clientX - box.left) / box.width),
    );
    pick(ratio * lanes.distanceM);
  };
  const onKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowUp: 1,
      ArrowLeft: -1,
      ArrowDown: -1,
      PageUp: 10,
      PageDown: -10,
    };
    if (event.key in steps) move(index + steps[event.key]);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(last);
    else return;
    event.preventDefault();
  };
  const left = `${(reading.distanceM / lanes.distanceM) * 100}%`;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
      <div className="min-w-0 xl:col-start-1">
        <MapCard
          data={map.data}
          segments={map.segments}
          title={map.title}
          rainLabel={map.rainLabel}
          hasWeather={map.hasWeather}
          cursor={reading.position}
          walkLabel={`Côtes ≥ ${walkThreshold} %`}
        />
      </div>
      <section
        aria-labelledby="axis-lanes"
        className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5 xl:col-start-1"
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="axis-lanes" className="font-semibold">
            Au fil de la course
          </h2>
          <Legend lanes={lanes} walkThreshold={walkThreshold} />
        </div>
        <div className="relative">
          <div className="grid grid-cols-[88px_minmax(0,1fr)] max-sm:grid-cols-[64px_minmax(0,1fr)]">
            <ProfileLane lanes={lanes} />
            <PaceLane lanes={lanes} />
            <WeatherLane lanes={lanes} />
            <FuelingLane lanes={lanes} />
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label="Position sur le parcours"
            aria-valuemin={0}
            aria-valuemax={Math.round(lanes.distanceM / 100) / 10}
            aria-valuenow={Math.round(reading.distanceM / 100) / 10}
            aria-valuetext={readingText(reading)}
            onPointerMove={onPointer}
            onPointerDown={onPointer}
            onKeyDown={onKey}
            className="absolute inset-y-0 right-0 left-22 cursor-crosshair touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring max-sm:left-16"
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 w-px bg-foreground"
              style={{ left }}
            />
          </div>
        </div>
        <p className="flex justify-between text-label text-muted-foreground tabular-nums">
          <span className="pl-22 max-sm:pl-16">km 0</span>
          <span>km {km(lanes.distanceM)}</span>
        </p>
      </section>
      <div className="min-w-0 xl:col-start-2 xl:row-span-3 xl:row-start-1">
        <CursorPanel reading={reading} />
      </div>
      <div className="min-w-0 xl:col-start-1">
        <Roadbook
          rows={rows}
          totals={totals}
          section={reading.section}
          onSelect={pick}
        />
      </div>
    </div>
  );
}
