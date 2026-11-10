"use client";

import { useEffect, useMemo, useState, type PointerEvent } from "react";
import { MonoLabel } from "@/components/stride/mono-label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import {
  availableModes,
  type ColorMode,
} from "@/features/activities/route-colors";
import type { RouteView } from "@/features/activities/track";
import {
  chartHeight,
  chartWidth,
  dataSeriesKeys,
  dataSeriesLabels,
  defaultDataSeries,
  type ChartsView,
  type DataSeriesKey,
} from "../charts";
import { RouteMap } from "./route-map";

const kilometers = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

const strokes: Record<DataSeriesKey, string> = {
  pace: "stroke-provider",
  heartRate: "stroke-destructive",
  power: "stroke-primary",
  cadence: "stroke-foreground",
  elevation: "stroke-muted-foreground",
};

const swatches: Record<DataSeriesKey, string> = {
  pace: "bg-provider",
  heartRate: "bg-destructive",
  power: "bg-primary",
  cadence: "bg-foreground",
  elevation: "bg-muted-foreground",
};

const texts: Record<DataSeriesKey, string> = {
  pace: "text-provider",
  heartRate: "text-destructive",
  power: "text-primary",
  cadence: "text-foreground",
  elevation: "text-muted-foreground",
};

function DataChart({
  view,
  active,
  cursor,
  onCursor,
}: {
  view: ChartsView;
  active: DataSeriesKey[];
  cursor: number | null;
  onCursor: (index: number | null) => void;
}) {
  const shown = view.series.filter((series) => active.includes(series.key));
  const last = view.xs.length - 1;
  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * chartWidth;
    let nearest = 0;
    view.xs.forEach((value, index) => {
      if (Math.abs(value - x) < Math.abs(view.xs[nearest] - x)) nearest = index;
    });
    onCursor(nearest);
  };
  const x = cursor === null ? null : view.xs[cursor];
  const names = shown.map((series) => series.label).join(", ");
  return (
    <div className="relative border-t border-border px-3 pt-3 pb-2">
      <div
        role="group"
        aria-label={`Inspecter ${names} · flèches pour parcourir, Échap pour fermer`}
        tabIndex={0}
        className="relative touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-focus"
        onFocus={() => onCursor(cursor ?? 0)}
        onBlur={() => onCursor(null)}
        onPointerMove={inspect}
        onPointerDown={inspect}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") onCursor(null);
        }}
        onPointerCancel={() => onCursor(null)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onCursor(null);
          else if (
            ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
          ) {
            event.preventDefault();
            const step = Math.max(1, Math.round(view.xs.length / 100));
            onCursor(
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? last
                  : Math.max(
                      0,
                      Math.min(
                        last,
                        (cursor ?? 0) +
                          (event.key === "ArrowLeft" ? -step : step),
                      ),
                    ),
            );
          }
        }}
      >
        <svg
          role="img"
          aria-label={`${names} selon ${view.axis === "elapsed time" ? "le temps écoulé" : "la position des échantillons"}`}
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          preserveAspectRatio="none"
          className="block h-42.5 w-full lg:h-55"
        >
          {view.bands.map((band) => (
            <rect
              key={band.label}
              x={band.x}
              width={band.width}
              y={0}
              height={chartHeight}
              className="fill-surface-current"
            />
          ))}
          {view.relief && <path d={view.relief} className="fill-muted" />}
          {shown.map((series) => (
            <path
              key={series.key}
              d={series.path}
              fill="none"
              className={strokes[series.key]}
              strokeWidth={1.8}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {x !== null && (
            <line
              aria-hidden="true"
              x1={x}
              x2={x}
              y1={0}
              y2={chartHeight}
              className="stroke-dim"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        {cursor !== null && x !== null && (
          <div
            role="status"
            className={cn(
              "pointer-events-none absolute top-0.5 flex flex-col gap-0.5 rounded-lg border border-border-strong bg-muted px-2.25 py-1.5 text-xs",
              x > chartWidth * 0.6 ? "-translate-x-full" : "",
            )}
            style={{
              left: `calc(${(x / chartWidth) * 100}% ${x > chartWidth * 0.6 ? "- 0.75rem" : "+ 0.75rem"})`,
            }}
          >
            <MonoLabel size="nano">{view.positions[cursor]}</MonoLabel>
            {shown.map((series) => (
              <span key={series.key} className="flex items-baseline gap-1">
                <span aria-hidden="true" className={texts[series.key]}>
                  ●
                </span>
                <span className="sr-only">{series.label} :</span>
                {series.values[cursor] === null ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  <>
                    <span className="font-metric text-sm font-semibold tabular-nums">
                      {series.values[cursor]}
                    </span>
                    {series.unit}
                  </>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-between pt-1 font-mono text-micro text-muted-foreground uppercase">
        {view.timeLabels.map((label, index) => (
          <span key={index}>{label}</span>
        ))}
      </div>
    </div>
  );
}

export function ActivityData({
  route,
  charts,
}: {
  route: RouteView | null;
  charts: ChartsView | null;
}) {
  const available = useMemo(
    () =>
      dataSeriesKeys.filter((key) =>
        charts?.series.some((series) => series.key === key),
      ),
    [charts],
  );
  const [active, setActive] = useState<DataSeriesKey[]>(() => {
    const defaults = defaultDataSeries.filter((key) => available.includes(key));
    return defaults.length > 0 ? defaults : available.slice(0, 1);
  });
  const modes = useMemo(
    () =>
      route
        ? availableModes(route)
            .map((item) => item.mode)
            .filter((mode) => mode !== "elevation")
        : [],
    [route],
  );
  const [mode, setMode] = useState<ColorMode>(modes[0] ?? "zones");
  const [hover, setHover] = useState<number | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [fullscreen]);
  const marker =
    cursor !== null && charts ? (charts.routeIndex[cursor] ?? null) : null;
  const notes = [
    route && charts ? "Le point sur la carte suit le curseur" : null,
    charts && charts.bands.length > 0
      ? "bandes : tours rapides, estimation Stride"
      : null,
    charts?.relief ? "relief en fond" : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const note = notes.charAt(0).toUpperCase() + notes.slice(1);
  return (
    <section
      aria-labelledby="activity-data"
      className="flex min-w-0 flex-col gap-3"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <MonoLabel asChild>
          <h2 id="activity-data">Parcours et données</h2>
        </MonoLabel>
        {route && (
          <MonoLabel className="max-sm:w-full">
            {kilometers.format(route.distanceKm)} km · tracé Garmin
          </MonoLabel>
        )}
        {charts && available.length > 0 && (
          <ToggleGroup
            type="multiple"
            variant="segment"
            aria-label="Données affichées"
            value={active}
            onValueChange={(value) => {
              const next = dataSeriesKeys.filter((key) =>
                (value as string[]).includes(key),
              );
              if (next.length > 0) setActive(next);
            }}
            className="max-w-full gap-0.5 overflow-x-auto rounded-[9px] border border-border bg-card p-0.75 sm:ml-auto sm:flex-wrap"
          >
            {available.map((key) => (
              <ToggleGroupItem
                key={key}
                value={key}
                className="min-h-7.5 gap-1.5 rounded-md border-l-0 px-2.75 text-[12.5px] data-[state=on]:bg-border data-[state=on]:font-semibold"
              >
                <span
                  aria-hidden="true"
                  className={cn("h-0.5 w-2 rounded-mark", swatches[key])}
                />
                {dataSeriesLabels[key]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-panel">
        {route ? (
          <div
            role={fullscreen ? "dialog" : undefined}
            aria-label={fullscreen ? "Carte plein écran · Parcours" : undefined}
            aria-modal={fullscreen ? true : undefined}
            className={
              fullscreen
                ? "fixed inset-0 z-50 bg-background"
                : "relative h-60 lg:h-85"
            }
          >
            <RouteMap
              fullscreen={{
                open: fullscreen,
                onToggle: () => setFullscreen((open) => !open),
              }}
              view={route}
              mode={mode}
              modes={modes}
              onModeChange={setMode}
              hover={hover}
              onHover={setHover}
              marker={marker}
            />
          </div>
        ) : (
          <div aria-label="Parcours" role="region" className="px-4 py-5">
            <MonoLabel>Parcours</MonoLabel>
            <p className="mt-2 text-body text-secondary-foreground">
              Aucun tracé GPS n’est disponible pour cette activité.
            </p>
          </div>
        )}
        {charts && (
          <DataChart
            view={charts}
            active={active}
            cursor={cursor}
            onCursor={setCursor}
          />
        )}
      </div>
      {notes.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 border border-border bg-surface-current"
          />
          {note}
        </p>
      )}
    </section>
  );
}
