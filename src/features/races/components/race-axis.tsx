"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  nearestReading,
  type AxisLanes,
  type AxisReading,
  type RoadbookRow,
  type RoadbookTotals,
} from "../axis";
import type { MapData } from "../map";
import { useAxisFocus } from "./axis-focus";
import { km, LanesExplorer } from "./lanes-explorer";
import { MapCard, type MapSegment } from "./map-card";
import { RecalculationReport } from "./recalculation";

const recalculationTimeoutMs = 8_000;

const rowSpans: Record<number, string> = {
  2: "xl:row-span-2",
  3: "xl:row-span-3",
  4: "xl:row-span-4",
  5: "xl:row-span-5",
};

function cursorLines(reading: AxisReading) {
  return [
    [
      `km ${km(reading.distanceM)}`,
      reading.clock,
      reading.terrain.value.toLowerCase(),
    ]
      .filter(Boolean)
      .join(" · "),
    [reading.instruction.value, reading.instruction.detail]
      .filter(Boolean)
      .join(" · "),
    reading.weather?.value ?? "",
  ].filter((text) => text.length > 0);
}

function CursorFacts({
  reading,
  className,
}: {
  reading: AxisReading;
  className?: string;
}) {
  const rows = [
    { label: "Terrain", fact: reading.terrain },
    { label: "Consigne", fact: reading.instruction },
    { label: "Météo", fact: reading.weather },
    { label: "À prendre", fact: reading.intake },
  ];
  return (
    <dl
      aria-label={`Sous le curseur, km ${km(reading.distanceM)} à ${reading.clock}`}
      className={cn(
        "flex flex-col gap-1.5 border-t border-border pt-3",
        className,
      )}
    >
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
  );
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
  onHover,
  note,
}: {
  rows: RoadbookRow[];
  totals: RoadbookTotals;
  section: number;
  onSelect: (fromM: number) => void;
  onHover: (range: { fromM: number; toM: number } | null) => void;
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
        <p className="text-label text-muted-foreground">
          <span className="md:hidden">
            {rows.length} section{rows.length > 1 ? "s" : ""}
          </span>
          <span className="max-md:hidden">{note}</span>
        </p>
      </div>
      <ol className="flex flex-col overflow-hidden rounded-xl border border-border bg-card md:hidden">
        {rows.map((row) => {
          const current = row.index === section;
          return (
            <li
              key={row.index}
              aria-current={current ? "true" : undefined}
              className={cn(
                "border-b border-border last:border-b-0",
                current && "bg-muted",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(row.fromM)}
                className="flex min-h-row-touch w-full flex-col gap-1 px-4 py-3 text-left"
              >
                <span className="flex items-baseline gap-2">
                  <span className="text-muted-foreground tabular-nums">
                    {row.index}
                  </span>
                  <span className="min-w-0 flex-1 font-medium">
                    {row.section}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {row.passage}
                  </span>
                </span>
                <span className="text-label text-secondary-foreground tabular-nums">
                  {[
                    row.distance,
                    row.gain,
                    row.pace && `${row.pace} /km`,
                    `marche ${row.walk}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                {(row.weather || row.intake || row.cutoff) && (
                  <span className="text-label text-secondary-foreground">
                    {[row.weather, row.intake].filter(Boolean).join(" · ")}
                    {row.cutoff && (
                      <span
                        className={cn(
                          row.tight ? "text-warning" : "text-muted-foreground",
                        )}
                      >
                        {row.weather || row.intake ? " · " : ""}
                        {row.cutoff}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="overflow-x-auto rounded-xl border border-border bg-card max-md:hidden">
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
                  onPointerEnter={() =>
                    onHover({ fromM: row.fromM, toM: row.toM })
                  }
                  onPointerLeave={() => onHover(null)}
                  onFocus={() => onHover({ fromM: row.fromM, toM: row.toM })}
                  onBlur={() => onHover(null)}
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
  settings,
  alert,
  context,
  estimate = false,
  raceId,
  summary = null,
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
    fileName?: string | null;
  } | null;
  settings?: React.ReactNode;
  alert?: React.ReactNode;
  context?: React.ReactNode;
  estimate?: boolean;
  raceId?: string;
  summary?: React.ReactNode;
}) {
  const { cursorM, setCursorM, highlight, setHighlight } = useAxisFocus();
  const [inspecting, setInspecting] = useState(false);
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [stalled, setStalled] = useState(false);
  const busyIds = useRef(new Set<string>());
  const report = useCallback((id: string, pending: boolean) => {
    const ids = busyIds.current;
    if (ids.has(id) === pending) return;
    if (pending) ids.add(id);
    else ids.delete(id);
    if (ids.size === 0) setStalled(false);
    setBusy(new Set(ids));
  }, []);
  const recalculating = busy.size > 0;
  useEffect(() => {
    if (!recalculating) return;
    const timer = setTimeout(() => {
      setStalled(true);
      toast.error(
        "Le recalcul prend plus de temps que prévu : le plan affiché reste le précédent.",
      );
    }, recalculationTimeoutMs);
    return () => clearTimeout(timer);
  }, [recalculating]);
  const reading = readings[nearestReading(readings, cursorM)]!;
  const pick = (target: number) => {
    setCursorM(readings[nearestReading(readings, target)]!.distanceM);
    setInspecting(true);
  };
  const mainRows = (summary ? 1 : 0) + (alert ? 1 : 0) + (map ? 1 : 0) + 2;
  const profileLanes = { ...lanes, pace: [], temperature: [], fueling: [] };
  return (
    <RecalculationReport value={report}>
      <div
        className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start"
        style={{ gridTemplateRows: `repeat(${mainRows - 1}, auto) 1fr` }}
      >
        {summary && <div className="min-w-0 xl:col-start-1">{summary}</div>}
        {alert && <div className="min-w-0 xl:col-start-1">{alert}</div>}
        {map && (
          <div className="min-w-0 xl:col-start-1">
            <MapCard
              data={map.data}
              segments={map.segments}
              title={map.title}
              rainLabel={map.rainLabel}
              hasWeather={map.hasWeather}
              cursor={inspecting ? reading.position : null}
              cursorLines={cursorLines(reading)}
              highlight={highlight}
              fileName={map.fileName ?? null}
              walkLabel={`Côtes ≥ ${walkThreshold} %`}
              fullscreenPanel={<CursorPanel reading={reading} />}
              fullscreenDock={
                <LanesExplorer
                  lanes={profileLanes}
                  readings={readings}
                  cursorM={reading.distanceM}
                  onCursor={setCursorM}
                  onInspect={setInspecting}
                  highlight={highlight}
                  walkThreshold={walkThreshold}
                  raceId={raceId}
                  headingId="fullscreen-lanes"
                  title="Profil"
                  footer={
                    <CursorFacts reading={reading} className="lg:hidden" />
                  }
                />
              }
            />
          </div>
        )}
        <div className="min-w-0 xl:col-start-1">
          <LanesExplorer
            lanes={lanes}
            readings={readings}
            cursorM={reading.distanceM}
            onCursor={setCursorM}
            onInspect={setInspecting}
            highlight={highlight}
            pending={recalculating && !stalled}
            walkThreshold={walkThreshold}
            estimate={estimate}
            raceId={raceId}
            headingId="axis-lanes"
            footer={
              estimate ? null : (
                <CursorFacts reading={reading} className="md:hidden" />
              )
            }
            title={
              estimate
                ? "Au fil de la course, sans tracé"
                : "Au fil de la course"
            }
          />
        </div>
        <div
          className={cn(
            "min-w-0 max-xl:order-last xl:col-start-2 xl:row-start-1",
            rowSpans[mainRows],
          )}
        >
          <div className="flex flex-col gap-5 xl:sticky xl:top-4">
            {context}
            {!estimate && (
              <div className="max-md:hidden">
                <CursorPanel reading={reading} />
              </div>
            )}
            {settings}
          </div>
        </div>
        <div className="min-w-0 xl:col-start-1">
          <Roadbook
            rows={rows}
            totals={totals}
            section={reading.section}
            onSelect={pick}
            onHover={setHighlight}
            note={
              estimate
                ? "Estimation sans tracé : le dénivelé est réparti également"
                : "La ligne suit le curseur"
            }
          />
        </div>
      </div>
    </RecalculationReport>
  );
}
