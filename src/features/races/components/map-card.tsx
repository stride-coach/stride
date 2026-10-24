"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Toggle } from "@/components/ui/toggle";
import { XIcon } from "lucide-react";
import { MonoLabel } from "@/components/stride/mono-label";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatKm } from "../format";
import type { MapData } from "../map";
import { RaceMap, type MapLayers } from "./race-map";

export function LayerChip({
  pressed,
  onPressedChange,
  dot,
  children,
  className,
}: {
  pressed: boolean;
  onPressedChange: (pressed: boolean) => void;
  dot: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Toggle
      variant="segment"
      pressed={pressed}
      onPressedChange={onPressedChange}
      className={cn(
        "min-h-8 gap-1.75 rounded-full border border-border-strong px-3 text-meta text-muted data-[state=on]:border-dim data-[state=on]:bg-surface-raised data-[state=on]:text-foreground",
        className,
      )}
    >
      <span aria-hidden="true" className={cn("size-1.75 rounded-full", dot)} />
      {children}
    </Toggle>
  );
}

export type MapSegment = {
  fromM: number;
  toM: number;
  km: string;
  detail: string;
};

function segmentRows(data: MapData, segments: MapSegment[]) {
  return segments.map((segment, index) => {
    const arrival = data.markers.find(
      (marker) => Math.abs(marker.distanceM - segment.toM) < 1,
    );
    return {
      key: `${segment.fromM}-${segment.toM}`,
      label: `T${index + 1}`,
      name: arrival?.name ?? `km ${formatKm(segment.toM)}`,
      clock: arrival?.clock ?? null,
      detail: `${segment.km} · ${segment.detail}`,
    };
  });
}

function SegmentBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-5.5 min-w-7 items-center justify-center rounded-control border border-border-strong bg-surface-raised px-1 font-metric text-xs font-semibold">
      {label}
    </span>
  );
}

function FullscreenMap({
  open,
  onOpenChange,
  onCloseAutoFocus,
  data,
  segments,
  layers,
  chips,
  label,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCloseAutoFocus: (event: Event) => void;
  data: MapData;
  segments: MapSegment[];
  layers: MapLayers;
  chips: React.ReactNode;
  label: string;
  title: string;
}) {
  const rows = segmentRows(data, segments);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        className="inset-0 top-0 left-0 flex h-dvh max-h-none w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none bg-background p-0 ring-0 sm:max-w-none data-open:zoom-in-100 data-closed:zoom-out-100"
      >
        <div className="flex min-h-14 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-5">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm font-normal text-muted-foreground">
            {title} <span aria-hidden="true">/</span>{" "}
            <span className="text-foreground">Carte</span>
          </DialogTitle>
          {chips && (
            <div className="hidden flex-wrap gap-2 md:flex">{chips}</div>
          )}
          <DialogClose asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label="Quitter le plein écran"
              className="shrink-0 max-sm:size-11"
            >
              <XIcon className="size-4" />
            </Button>
          </DialogClose>
        </div>
        <div className="flex min-h-0 flex-1 max-md:flex-col">
          <RaceMap
            data={data}
            layers={layers}
            label={label}
            cooperative={false}
            className="min-h-0 flex-1"
          />
          {(chips || rows.length > 0) && (
            <aside
              aria-label="Tronçons"
              className="flex shrink-0 flex-col gap-1 border-border bg-surface-inset max-md:border-t max-md:px-4 max-md:pt-2.5 max-md:pb-[max(1rem,env(safe-area-inset-bottom))] md:w-80 md:overflow-y-auto md:border-l md:p-4"
            >
              {chips && (
                <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-2 md:hidden">
                  {chips}
                </div>
              )}
              {rows.length > 0 && (
                <>
                  <MonoLabel size="nano" className="pb-1.5">
                    <span className="md:hidden">
                      Tronçons · glisse pour voir
                    </span>
                    <span className="max-md:hidden">
                      Tronçons · scénario cible
                    </span>
                  </MonoLabel>
                  <ol className="flex gap-2 max-md:[scrollbar-width:none] max-md:overflow-x-auto md:flex-col md:gap-0">
                    {rows.map((row) => (
                      <li
                        key={row.key}
                        className="grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-0.5 max-md:w-40 max-md:rounded-card max-md:border max-md:border-border max-md:p-2.5 md:border-t md:border-border md:py-2.25"
                      >
                        <SegmentBadge label={row.label} />
                        <span className="truncate text-meta">{row.name}</span>
                        <span className="font-metric text-[15px] leading-none font-semibold tabular-nums">
                          {row.clock ?? ""}
                        </span>
                        <span className="col-span-3 text-[11px] text-muted-foreground md:col-start-2">
                          {row.detail}
                        </span>
                      </li>
                    ))}
                  </ol>
                </>
              )}
            </aside>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function MapCard({
  data,
  segments = [],
  title,
  fileName,
  rainLabel,
  hasWeather,
  walkThreshold,
  kind = "trail",
}: {
  data: MapData;
  segments?: MapSegment[];
  title: string;
  walkThreshold: number;
  fileName: string;
  rainLabel: "Météo" | "Averses";
  hasWeather: boolean;
  kind?: "road" | "trail";
}) {
  const road = kind === "road";
  const [fullscreen, setFullscreen] = useState(false);
  const opener = useRef<HTMLButtonElement>(null);
  const [layers, setLayers] = useState<MapLayers>({
    markers: !road,
    walk: !road,
    night: !road,
    rain: !road && rainLabel === "Averses",
  });
  const toggle = (key: keyof MapLayers) => (pressed: boolean) =>
    setLayers((current) => ({ ...current, [key]: pressed }));
  const chips = road ? null : (
    <>
      <LayerChip
        pressed={layers.markers}
        onPressedChange={toggle("markers")}
        dot="bg-foreground"
      >
        Ravitos
      </LayerChip>
      <LayerChip
        pressed={layers.walk}
        onPressedChange={toggle("walk")}
        dot="bg-accent"
      >
        <span className="max-sm:hidden">Marche ≥ {walkThreshold} %</span>
        <span className="sm:hidden">Marche</span>
      </LayerChip>
      {data.night.length > 0 && (
        <LayerChip
          pressed={layers.night}
          onPressedChange={toggle("night")}
          dot="bg-night"
        >
          Nuit
        </LayerChip>
      )}
      {hasWeather && (
        <LayerChip
          pressed={layers.rain}
          onPressedChange={toggle("rain")}
          dot="bg-provider"
        >
          {rainLabel}
        </LayerChip>
      )}
    </>
  );
  const label = `Carte du parcours, ${formatKm(data.distanceM)} km${road ? "" : `, ${data.markers.length} points de passage`}`;
  return (
    <section className="flex min-w-0 flex-col overflow-hidden rounded-panel border border-border bg-surface">
      <div className="hidden flex-wrap items-center justify-between gap-2.5 border-b border-border px-5 py-4 sm:flex">
        <MonoLabel asChild>
          <h2>Parcours · {fileName}</h2>
        </MonoLabel>
        <div className="flex flex-wrap gap-2">{chips}</div>
      </div>
      <RaceMap
        data={data}
        layers={layers}
        label={label}
        fullscreenRef={opener}
        onFullscreen={() => setFullscreen(true)}
        className="h-60 sm:h-105"
      />
      {chips && (
        <div className="flex [scrollbar-width:none] gap-2 overflow-x-auto px-3 py-3 sm:hidden">
          {chips}
        </div>
      )}
      <FullscreenMap
        open={fullscreen}
        onOpenChange={setFullscreen}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
        data={data}
        segments={segments}
        layers={layers}
        chips={chips}
        label={label}
        title={title}
      />
    </section>
  );
}
