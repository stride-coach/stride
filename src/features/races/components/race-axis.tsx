"use client";

import { createContext, useContext, useState } from "react";
import { cn } from "@/lib/utils";
import type {
  AxisLanes,
  AxisReading,
  RoadbookRow,
  RoadbookTotals,
} from "../axis";
import type { MapData } from "../map";
import { MapCard, type MapSegment } from "./map-card";
import { RaceLanes } from "./race-lanes";

const rowSpans: Record<number, string> = {
  2: "xl:row-span-2",
  3: "xl:row-span-3",
  4: "xl:row-span-4",
};

const rainSwatch = {
  backgroundImage:
    "repeating-linear-gradient(135deg, color-mix(in oklab, var(--secondary-foreground) 45%, transparent) 0 1px, transparent 1px 4px)",
};

function Swatch({
  className,
  style,
}: {
  className: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn("inline-block h-2 w-3 rounded-xs", className)}
      style={style}
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
          <Swatch className="ring-1 ring-border" style={rainSwatch} />
          Pluie prévue
        </li>
      )}
      {lanes.night.length > 0 && (
        <li className="flex items-center gap-1.5">
          <Swatch className="bg-foreground/10 ring-1 ring-border" />
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
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-card px-4 py-3.5"
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
  note,
}: {
  rows: RoadbookRow[];
  totals: RoadbookTotals;
  section: number;
  onSelect: (fromM: number) => void;
  note: string;
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
        <p className="text-label text-muted-foreground">{note}</p>
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

type Cursor = [number, (distanceM: number) => void];

const AxisCursor = createContext<Cursor | null>(null);

export function AxisCursorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const cursor = useState(0);
  return <AxisCursor value={cursor}>{children}</AxisCursor>;
}

export function RaceAxis({
  lanes,
  readings,
  rows,
  totals,
  walkThreshold,
  map,
  settings,
  alert,
  context,
  estimate = false,
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
  } | null;
  settings?: React.ReactNode;
  alert?: React.ReactNode;
  context?: React.ReactNode;
  estimate?: boolean;
}) {
  const shared = useContext(AxisCursor);
  const local = useState(0);
  const [distanceM, setDistanceM] = shared ?? local;
  const nearest = (target: number) =>
    readings.reduce(
      (best, item, position) =>
        Math.abs(item.distanceM - target) <
        Math.abs(readings[best].distanceM - target)
          ? position
          : best,
      0,
    );
  const index = nearest(distanceM);
  const reading = readings[index];
  const last = readings.length - 1;
  const move = (next: number) =>
    setDistanceM(readings[Math.min(last, Math.max(0, next))].distanceM);
  const pick = (target: number) => move(nearest(target));
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
    const step = steps[event.key];
    if (step !== undefined)
      move(index + (event.shiftKey && Math.abs(step) === 1 ? step * 2 : step));
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(last);
    else return;
    event.preventDefault();
  };
  const mainRows = (alert ? 1 : 0) + (map ? 1 : 0) + 2;
  return (
    <div
      className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start"
      style={{ gridTemplateRows: `repeat(${mainRows - 1}, auto) 1fr` }}
    >
      {alert && <div className="min-w-0 xl:col-start-1">{alert}</div>}
      {map && (
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
      )}
      <section
        aria-labelledby="axis-lanes"
        className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5 xl:col-start-1"
      >
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h2 id="axis-lanes" className="font-semibold">
            {estimate
              ? "Au fil de la course, sans tracé"
              : "Au fil de la course"}
          </h2>
          <Legend lanes={lanes} walkThreshold={walkThreshold} />
        </div>
        <RaceLanes
          lanes={lanes}
          estimate={estimate}
          weatherLabel={
            lanes.weatherNormals ? "Météo · moyennes de saison" : "Météo"
          }
          cursorM={reading.distanceM}
          cursorLabel={`km ${km(reading.distanceM)} · ${reading.clock}`}
          slider={
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
              className="absolute inset-0 cursor-crosshair touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          }
        />
      </section>
      <div
        className={cn(
          "min-w-0 xl:col-start-2 xl:row-start-1",
          rowSpans[mainRows],
        )}
      >
        <div className="flex flex-col gap-5 xl:sticky xl:top-4">
          {context}
          {!estimate && <CursorPanel reading={reading} />}
          {settings}
        </div>
      </div>
      <div className="min-w-0 xl:col-start-1">
        <Roadbook
          rows={rows}
          totals={totals}
          section={reading.section}
          onSelect={pick}
          note={
            estimate
              ? "Estimation sans tracé : le dénivelé est réparti également"
              : "La ligne suit le curseur"
          }
        />
      </div>
    </div>
  );
}
