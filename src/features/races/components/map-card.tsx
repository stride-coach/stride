"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { MonoLabel } from "@/components/stride/mono-label";
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
        "min-h-8.5 rounded-full border border-control-border bg-background px-3 text-body text-secondary-foreground hover:bg-muted data-[state=on]:border-muted-foreground data-[state=on]:bg-background data-[state=on]:font-semibold data-[state=on]:text-foreground",
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
    <span className="inline-flex h-5.5 min-w-7 items-center justify-center rounded-md border border-control-border bg-muted px-1 text-label font-semibold tabular-nums">
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
}: {
  onClose: () => void;
  data: MapData;
  segments: MapSegment[];
  layers: MapLayers;
  chips: React.ReactNode;
  label: string;
  title: string;
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
        cooperative={false}
        overlay={chips}
        onClose={onClose}
        closeRef={close}
        className="absolute inset-0"
      />
      {rows.length > 0 && (
        <aside
          aria-label="Tronçons"
          className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1.5 rounded-t-[1rem] border-t border-border bg-background/95 px-4 pt-2.5 pb-[max(1.875rem,env(safe-area-inset-bottom))] md:inset-x-auto md:top-16 md:bottom-auto md:left-5 md:max-h-[calc(100%-6rem)] md:w-83 md:gap-0 md:overflow-y-auto md:rounded-2xl md:border md:bg-background md:p-4"
        >
          <span
            aria-hidden="true"
            className="h-1 w-9 self-center rounded-mark bg-control-border md:hidden"
          />
          <MonoLabel size="nano" className="md:pb-2.5">
            <span className="md:hidden">Tronçons · glisse pour voir</span>
            <span className="max-md:hidden">Tronçons · scénario cible</span>
          </MonoLabel>
          <ol className="flex gap-2 max-md:[scrollbar-width:none] max-md:overflow-x-auto md:flex-col md:gap-0">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex w-37.5 shrink-0 flex-col gap-1 rounded-[10px] border border-border p-2.5 md:grid md:w-auto md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center md:gap-x-2.5 md:gap-y-0.5 md:rounded-none md:border-0 md:border-t md:px-0 md:py-3"
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
                <span className="text-[15px] leading-none font-semibold tabular-nums max-md:hidden">
                  {row.clock ?? ""}
                </span>
                <span className="text-[11px] text-muted-foreground md:col-start-2">
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
}: {
  data: MapData;
  segments?: MapSegment[];
  title: string;
  rainLabel: "Météo" | "Averses";
  hasWeather: boolean;
  kind?: "road" | "trail";
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
        Marche
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
      className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card"
    >
      <RaceMap
        data={data}
        layers={layers}
        label={label}
        overlay={
          chips && <div className="flex gap-1.5 max-md:hidden">{chips}</div>
        }
        fullscreenRef={opener}
        onFullscreen={() => setFullscreen(true)}
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
          title={title}
        />
      )}
    </section>
  );
}
