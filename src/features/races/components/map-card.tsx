"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { formatKm } from "../format";
import { fullscreenMapParam, raceWorkspaceId, type MapData } from "../map";
import { RaceMap, type MapLayers } from "./race-map";

function LayerChip({
  pressed,
  onPressedChange,
  children,
  className,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Toggle
      variant="segment"
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn(
        "min-h-control-touch rounded-md border border-border bg-card px-2.5 text-label text-secondary-foreground hover:bg-muted data-[state=on]:border-control-border data-[state=on]:bg-muted data-[state=on]:font-medium data-[state=on]:text-foreground md:min-h-7",
        className,
      )}
    >
      {children}
    </Toggle>
  );
}

export type MapSegment = {
  fromM: number;
  toM: number;
  km: string;
  gainM: number | null;
};

function segmentRows(data: MapData, segments: MapSegment[]) {
  return segments.map((segment, index) => {
    const arrival = data.markers.find(
      (marker) => Math.abs(marker.distanceM - segment.toM) < 1,
    );
    const night = data.night.some(
      (range) => segment.toM > range.fromM && segment.toM <= range.toM,
    );
    return {
      key: `${segment.fromM}-${segment.toM}`,
      label: `T${index + 1}`,
      name: arrival?.name ?? `km ${formatKm(segment.toM)}`,
      clock: arrival?.clock ?? null,
      detail: [
        segment.km,
        segment.gainM !== null ? `+${segment.gainM} m` : null,
        night ? "nuit" : null,
      ]
        .filter(Boolean)
        .join(" · "),
    };
  });
}

function subscribeNever() {
  return () => {};
}

function SegmentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5.5 min-w-7 items-center justify-center rounded-sm border border-control-border bg-muted px-1 text-label font-semibold tabular-nums">
      {label}
    </span>
  );
}

function FullscreenMap({
  onClose,
  data,
  segments,
  layers,
  chips,
  label,
  title,
  dock = null,
  panel = null,
  cursor = null,
  cursorLines = [],
  highlight = null,
  notes,
}: {
  onClose: () => void;
  data: MapData;
  segments: MapSegment[];
  layers: MapLayers;
  chips: React.ReactNode;
  label: string;
  title: string;
  dock?: React.ReactNode;
  panel?: React.ReactNode;
  cursor?: { lat: number; lon: number } | null;
  cursorLines?: string[];
  highlight?: { fromM: number; toM: number } | null;
  notes?: Record<string, string[]>;
}) {
  const rows = segmentRows(data, segments);
  const close = useRef<HTMLButtonElement>(null);
  const container = useSyncExternalStore(
    subscribeNever,
    () => document.getElementById(raceWorkspaceId) ?? document.body,
    () => null,
  );
  const closeHandler = useRef(onClose);
  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);
  useEffect(() => {
    if (!container) return;
    close.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeHandler.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [container]);
  if (!container) return null;
  if (dock)
    return createPortal(
      <section
        role="dialog"
        aria-label={`Carte plein écran · ${title}`}
        className="fixed inset-0 z-50 flex flex-col bg-background md:absolute md:z-30"
      >
        <div className="flex min-h-11 shrink-0 items-center gap-3 border-b border-border px-4 pt-[env(safe-area-inset-top)] md:px-5">
          <h2 className="min-w-0 truncate text-label font-medium text-muted-foreground">
            {title} · Carte
          </h2>
          <button
            ref={close}
            type="button"
            onClick={onClose}
            className="ml-auto inline-flex min-h-control-touch shrink-0 items-center gap-2 rounded-sm text-label font-medium text-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:min-h-0"
          >
            Quitter le plein écran
            <kbd className="rounded-sm border border-control-border px-1.25 text-label text-muted-foreground max-md:hidden">
              Échap
            </kbd>
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          <RaceMap
            data={data}
            layers={layers}
            label={label}
            notes={notes}
            cooperative={false}
            overlay={chips}
            onClose={onClose}
            closeButton={false}
            cursor={cursor}
            cursorLines={cursorLines}
            highlight={highlight}
            className="absolute inset-0"
          />
          {panel && (
            <div className="absolute top-14 left-3 z-10 w-72 max-lg:hidden">
              {panel}
            </div>
          )}
        </div>
        <div className="max-h-[45%] shrink-0 overflow-y-auto border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:p-4">
          {dock}
        </div>
      </section>,
      container,
    );
  return createPortal(
    <section
      role="dialog"
      aria-label={`Carte plein écran · ${title}`}
      className="fixed inset-0 z-50 bg-background md:absolute md:z-30"
    >
      <RaceMap
        data={data}
        layers={layers}
        label={label}
        notes={notes}
        cooperative={false}
        overlay={chips}
        onClose={onClose}
        closeRef={close}
        className="absolute inset-0"
      />
      {rows.length > 0 && (
        <aside
          aria-label="Tronçons"
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 rounded-t-2xl border-t border-border bg-card/95 px-4 pt-2.5 pb-[max(1.875rem,env(safe-area-inset-bottom))] md:inset-x-auto md:top-16 md:bottom-auto md:left-5 md:max-h-[calc(100%-6rem)] md:w-83 md:gap-0 md:overflow-y-auto md:rounded-xl md:border md:bg-card md:p-4 md:shadow-float"
        >
          <span
            aria-hidden="true"
            className="h-1 w-9 self-center rounded-mark bg-control-border md:hidden"
          />
          <span className="text-label font-medium text-muted-foreground md:pb-2.5">
            <span className="md:hidden">Tronçons · glisse pour voir</span>
            <span className="max-md:hidden">Tronçons · scénario cible</span>
          </span>
          <ol className="flex gap-2 max-md:[scrollbar-width:none] max-md:overflow-x-auto md:flex-col md:gap-0">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex w-37.5 shrink-0 flex-col gap-1 rounded-lg border border-border p-2.5 md:grid md:w-auto md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-x-2.5 md:gap-y-0.5 md:rounded-none md:border-0 md:border-t md:px-0 md:py-3"
              >
                <span className="self-start md:row-span-2">
                  <SegmentBadge label={row.label} />
                </span>
                <span className="truncate text-body">
                  {row.name}
                  {row.clock && (
                    <span className="md:hidden"> · {row.clock}</span>
                  )}
                </span>
                <span className="font-semibold tabular-nums max-md:hidden">
                  {row.clock ?? ""}
                </span>
                <span className="text-label text-muted-foreground md:col-start-2">
                  {row.detail}
                </span>
              </li>
            ))}
          </ol>
        </aside>
      )}
    </section>,
    container,
  );
}

export function MapCard({
  data,
  segments = [],
  title,
  rainLabel,
  hasWeather,
  kind = "trail",
  cursor = null,
  cursorLines = [],
  highlight = null,
  fileName = null,
  walkLabel = "Marche",
  fullscreenDock = null,
  fullscreenPanel = null,
  notes,
}: {
  data: MapData;
  segments?: MapSegment[];
  title: string;
  rainLabel: "Météo" | "Averses" | "Pluie";
  hasWeather: boolean;
  kind?: "road" | "trail";
  cursor?: { lat: number; lon: number } | null;
  cursorLines?: string[];
  highlight?: { fromM: number; toM: number } | null;
  fileName?: string | null;
  walkLabel?: string;
  fullscreenDock?: React.ReactNode;
  fullscreenPanel?: React.ReactNode;
  notes?: Record<string, string[]>;
}) {
  const road = kind === "road";
  const pathname = usePathname();
  const fullscreen = useSearchParams().has(fullscreenMapParam);
  const opener = useRef<HTMLButtonElement>(null);
  const [layers, setLayers] = useState<MapLayers>({
    markers: !road,
    walk: false,
    night: !road,
    rain: false,
  });
  const toggle = (key: keyof MapLayers) => (pressed: boolean) =>
    setLayers((current) => ({ ...current, [key]: pressed }));
  const setFullscreen = (open: boolean) => {
    window.history.replaceState(
      null,
      "",
      open ? `${pathname}?${fullscreenMapParam}` : pathname,
    );
    if (!open) requestAnimationFrame(() => opener.current?.focus());
  };
  const chips = road ? null : (
    <>
      <LayerChip pressed={layers.markers} onPressedChange={toggle("markers")}>
        Passages
      </LayerChip>
      {data.night.length > 0 && (
        <LayerChip pressed={layers.night} onPressedChange={toggle("night")}>
          Nuit
        </LayerChip>
      )}
      <LayerChip pressed={layers.walk} onPressedChange={toggle("walk")}>
        {walkLabel}
      </LayerChip>
      {hasWeather && (
        <LayerChip
          pressed={layers.rain}
          onPressedChange={toggle("rain")}
          className="max-md:hidden"
        >
          {rainLabel}
        </LayerChip>
      )}
    </>
  );
  const label = `Carte du parcours, ${formatKm(data.distanceM)} km${road ? "" : `, ${data.markers.length} points de passage`}`;
  return (
    <section
      aria-label="Carte du parcours"
      className="min-w-0 overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="flex min-h-10 items-center gap-3 border-b border-border px-4 py-1.5">
        <h2 className="min-w-0 truncate text-label font-medium text-muted-foreground">
          Carte
          {fileName && (
            <span className="font-normal">
              {" · "}
              {fileName}
            </span>
          )}
        </h2>
        <button
          ref={opener}
          type="button"
          onClick={() => setFullscreen(true)}
          className="ml-auto inline-flex min-h-control-touch shrink-0 items-center rounded-sm text-label font-medium text-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring md:min-h-0"
        >
          Plein écran
        </button>
      </div>
      <RaceMap
        data={data}
        layers={layers}
        label={label}
        notes={notes}
        overlay={
          chips && <div className="flex gap-1.5 max-md:hidden">{chips}</div>
        }
        onFullscreen={() => setFullscreen(true)}
        fullscreenButton={false}
        cursor={cursor}
        cursorLines={cursorLines}
        highlight={highlight}
        className="h-56 md:h-105"
      />
      {fullscreen && (
        <FullscreenMap
          onClose={() => setFullscreen(false)}
          data={data}
          segments={segments}
          layers={layers}
          chips={chips}
          label={label}
          notes={notes}
          title={title}
          dock={fullscreenDock}
          panel={fullscreenPanel}
          cursor={cursor}
          cursorLines={cursorLines}
          highlight={highlight}
        />
      )}
    </section>
  );
}
