"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { nearestReading, type AxisLanes, type AxisReading } from "../axis";
import {
  centerWindow,
  fullWindow,
  isFullWindow,
  showsOverview,
  zoomWindow,
  type AxisWindow,
} from "../axis-window";
import { useAxisFocus, type AxisRange } from "./axis-focus";
import { RaceLanes, type LegendKey } from "./race-lanes";

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

export function km(distanceM: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    distanceM / 1000,
  );
}

export function readingText(reading: AxisReading) {
  return [
    `km ${km(reading.distanceM)}, ${reading.clock}`,
    reading.terrain.value,
    reading.instruction.value,
    reading.weather?.value,
  ]
    .filter(Boolean)
    .join(", ");
}

export function LanesExplorer({
  lanes,
  readings,
  cursorM,
  onCursor,
  highlight = null,
  pending = false,
  walkThreshold,
  estimate = false,
  raceId,
  title,
  headingId,
  actions,
  footer = null,
}: {
  lanes: AxisLanes;
  readings: AxisReading[];
  cursorM: number;
  onCursor: (distanceM: number) => void;
  highlight?: AxisRange | null;
  pending?: boolean;
  walkThreshold: number;
  estimate?: boolean;
  raceId?: string;
  title: string;
  headingId: string;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const total = lanes.distanceM;
  const [stored, setWindow] = useState<AxisWindow>(() => fullWindow(total));
  const [pinned, setPinned] = useState(false);
  const [hidden, setHidden] = useState<ReadonlySet<LegendKey>>(() => new Set());
  const touches = useRef(new Map<number, number>());
  const pinch = useRef<number | null>(null);
  const index = nearestReading(readings, cursorM);
  const reading = readings[index]!;
  const last = readings.length - 1;
  const window =
    reading.distanceM < stored.fromM || reading.distanceM > stored.toM
      ? centerWindow(stored, total, reading.distanceM)
      : stored;
  const move = (next: number) =>
    onCursor(readings[Math.min(last, Math.max(0, next))]!.distanceM);
  const pick = (target: number) => move(nearestReading(readings, target));
  const zoom = useCallback(
    (centerM: number, factor: number) =>
      setWindow((current) => zoomWindow(current, total, centerM, factor)),
    [total],
  );
  const distanceAt = (event: React.MouseEvent<HTMLDivElement>) => {
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
    pick(distanceAt(event));
    setPinned((current) => !current);
  };
  const reset = () => {
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
  return (
    <section
      aria-labelledby={headingId}
      className="flex min-w-0 flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <h2 id={headingId} className="font-semibold">
          {title}
        </h2>
        <Legend
          lanes={lanes}
          walkThreshold={walkThreshold}
          hidden={hidden}
          onToggle={toggle}
        />
        {(actions || !isFullWindow(window, total)) && (
          <div className="flex items-center gap-2 sm:ml-auto">
            {!isFullWindow(window, total) && (
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                Parcours entier
              </Button>
            )}
            {actions}
          </div>
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
        pending={pending}
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
            aria-valuemax={Math.round(total / 100) / 10}
            aria-valuenow={Math.round(reading.distanceM / 100) / 10}
            aria-valuetext={`${readingText(reading)}${pinned ? ", épinglé" : ""}`}
            aria-keyshortcuts="+ -"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onClick={onClick}
            onDoubleClick={reset}
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
      {footer}
    </section>
  );
}

export function FocusedLanes({
  lanes,
  readings,
  walkThreshold,
  raceId,
  title,
  headingId,
  actions,
}: {
  lanes: AxisLanes;
  readings: AxisReading[];
  walkThreshold: number;
  raceId: string;
  title: string;
  headingId: string;
  actions?: React.ReactNode;
}) {
  const { cursorM, setCursorM, highlight } = useAxisFocus();
  return (
    <LanesExplorer
      lanes={lanes}
      readings={readings}
      cursorM={cursorM}
      onCursor={setCursorM}
      highlight={highlight}
      walkThreshold={walkThreshold}
      raceId={raceId}
      headingId={headingId}
      title={title}
      actions={actions}
    />
  );
}
