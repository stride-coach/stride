"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  AxisLanes,
  AxisReading,
  RoadbookRow,
  RoadbookTotals,
} from "../axis";
import {
  centerWindow,
  fullWindow,
  isFullWindow,
  showsOverview,
  zoomWindow,
  type AxisWindow,
} from "../axis-window";
import type { MapData } from "../map";
import { MapCard, type MapSegment } from "./map-card";
import { RaceLanes, type LegendKey } from "./race-lanes";
import { RecalculationReport } from "./recalculation";

const recalculationTimeoutMs = 8_000;

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

function LegendToggle({
  pressed,
  onToggle,
  children,
}: {
  pressed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={pressed}
        onClick={onToggle}
        className="flex min-h-control-touch items-center gap-1.5 rounded-sm text-left transition-opacity duration-(--stride-duration-fast) ease-stride hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring aria-[pressed=false]:line-through aria-[pressed=false]:opacity-50 md:min-h-0"
      >
        {children}
      </button>
    </li>
  );
}

function Legend({
  lanes,
  walkThreshold,
  hidden,
  onToggle,
}: {
  lanes: AxisLanes;
  walkThreshold: number;
  hidden: ReadonlySet<LegendKey>;
  onToggle: (key: LegendKey) => void;
}) {
  const entry = (key: LegendKey, children: React.ReactNode) => (
    <LegendToggle
      key={key}
      pressed={!hidden.has(key)}
      onToggle={() => onToggle(key)}
    >
      {children}
    </LegendToggle>
  );
  return (
    <ul
      aria-label="Afficher ou masquer"
      className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground"
    >
      {lanes.walk.length > 0 &&
        entry(
          "walk",
          <>
            <Swatch className="bg-warning" />
            Côte à {walkThreshold} % ou plus : tu marches
          </>,
        )}
      {lanes.rain.length > 0 &&
        entry(
          "rain",
          <>
            <Swatch className="ring-1 ring-border" style={rainSwatch} />
            Pluie prévue
          </>,
        )}
      {lanes.night.length > 0 &&
        entry(
          "night",
          <>
            <Swatch className="bg-foreground/10 ring-1 ring-border" />
            Nuit
          </>,
        )}
      {lanes.stations.some((station) => station.cutoff) &&
        entry(
          "cutoff",
          <>
            <Swatch className="h-3 w-0.5 bg-warning" />
            Barrière horaire
          </>,
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
  raceId,
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
  raceId?: string;
}) {
  const shared = useContext(AxisCursor);
  const local = useState(0);
  const [distanceM, setDistanceM] = shared ?? local;
  const total = lanes.distanceM;
  const [window, setWindow] = useState<AxisWindow>(() => fullWindow(total));
  const [pinned, setPinned] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<LegendKey>>(() => new Set());
  const [highlight, setHighlight] = useState<{
    fromM: number;
    toM: number;
  } | null>(null);
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [stalled, setStalled] = useState(false);
  const touches = useRef(new Map<number, number>());
  const pinch = useRef<number | null>(null);
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
  const move = (next: number) => {
    const at = readings[Math.min(last, Math.max(0, next))].distanceM;
    setDistanceM(at);
    setWindow((current) =>
      at < current.fromM || at > current.toM
        ? centerWindow(current, total, at)
        : current,
    );
  };
  const pick = (target: number) => move(nearest(target));
  const zoom = useCallback(
    (centerM: number, factor: number) =>
      setWindow((current) => zoomWindow(current, total, centerM, factor)),
    [total],
  );
  const distanceAt = (event: React.PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const ratio =
      box.width > 0
        ? Math.min(1, Math.max(0, (event.clientX - box.left) / box.width))
        : 0;
    return window.fromM + ratio * (window.toM - window.fromM);
  };
  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") return;
    touches.current.set(event.pointerId, event.clientX);
    if (touches.current.size === 1) pick(distanceAt(event));
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse") {
      if (!pinned) pick(distanceAt(event));
      return;
    }
    if (!touches.current.has(event.pointerId)) return;
    touches.current.set(event.pointerId, event.clientX);
    if (touches.current.size >= 2) {
      const [first, second] = [...touches.current.values()];
      const spread = Math.abs(first! - second!);
      if (pinch.current && spread > 0) {
        const box = event.currentTarget.getBoundingClientRect();
        const middle = ((first! + second!) / 2 - box.left) / box.width;
        zoom(
          window.fromM + middle * (window.toM - window.fromM),
          spread / pinch.current,
        );
      }
      pinch.current = spread;
      return;
    }
    pick(distanceAt(event));
  };
  const onPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    touches.current.delete(event.pointerId);
    if (touches.current.size < 2) pinch.current = null;
  };
  const onClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.detail > 1) return;
    pick(distanceAt(event as React.PointerEvent<HTMLDivElement>));
    setPinned((current) => !current);
  };
  const onDoubleClick = () => {
    setWindow(fullWindow(total));
    setPinned(false);
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
    else if (event.key === "+" || event.key === "=") zoom(reading.distanceM, 2);
    else if (event.key === "-") zoom(reading.distanceM, 0.5);
    else return;
    event.preventDefault();
  };
  const toggle = (key: LegendKey) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const zoomed = !isFullWindow(window, total);
  const mainRows = (alert ? 1 : 0) + (map ? 1 : 0) + 2;
  return (
    <RecalculationReport value={report}>
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
            <Legend
              lanes={lanes}
              walkThreshold={walkThreshold}
              hidden={hidden}
              onToggle={toggle}
            />
            {zoomed && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={onDoubleClick}
              >
                Parcours entier
              </Button>
            )}
          </div>
          <RaceLanes
            lanes={lanes}
            estimate={estimate}
            weatherLabel={
              lanes.weatherNormals ? "Météo · moyennes de saison" : "Météo"
            }
            window={window}
            overview={showsOverview(window, total)}
            onWindow={setWindow}
            onZoom={zoom}
            hidden={hidden}
            highlight={highlight}
            pending={recalculating && !stalled}
            stationHref={
              raceId
                ? (id) =>
                    `/races/${raceId}/waypoints?point=${encodeURIComponent(id)}`
                : null
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
                aria-valuetext={`${readingText(reading)}${pinned ? ", épinglé" : ""}`}
                aria-keyshortcuts="+ -"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerEnd}
                onPointerCancel={onPointerEnd}
                onClick={onClick}
                onDoubleClick={onDoubleClick}
                onKeyDown={onKey}
                className="absolute inset-0 cursor-crosshair touch-pan-y rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              />
            }
          />
          <p className="text-label text-muted-foreground max-md:hidden">
            {pinned
              ? "Curseur épinglé · clique à nouveau pour le libérer"
              : "Clique pour épingler · Ctrl + molette pour zoomer · double-clic pour revenir au parcours entier"}
          </p>
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
