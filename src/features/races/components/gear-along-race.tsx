"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { axisTicks } from "../axis";
import { fitLabels, labelWidth, placeLabel } from "../axis-layout";
import type { GearRow } from "../gear-weather";
import { RaceCard } from "./race-ui";

type Range = { fromM: number; toM: number };

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
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

function Labels({
  items,
  width,
  className,
}: {
  items: { key: string; at: number; lines: string[]; priority?: number }[];
  width: number;
  className?: string;
}) {
  const sized = items.map((item) => ({
    ...item,
    size: Math.max(...item.lines.map((line) => labelWidth(line))),
  }));
  const shown = fitLabels(
    sized.map(({ at, size, priority }) => ({ at, width: size, priority })),
    width,
    6,
  );
  return sized.map((item, index) =>
    shown[index] ? (
      <span
        key={item.key}
        className={cn(
          "absolute top-0 flex flex-col items-center text-label leading-4 whitespace-nowrap",
          className,
        )}
        style={{
          left: placeLabel(item.at, item.size, width),
          width: item.size,
        }}
      >
        {item.lines.map((line, position) => (
          <span
            key={position}
            className={
              position === 0 ? "font-medium" : "text-secondary-foreground"
            }
          >
            {line}
          </span>
        ))}
      </span>
    ) : null,
  );
}

export function GearAlongRace({
  rows,
  distanceM,
  stations,
  temperatures,
  night,
  rain,
  normals,
}: {
  rows: GearRow[];
  distanceM: number;
  stations: { id: string; name: string; clock: string; distanceM: number }[];
  temperatures: { distanceM: number; label: string }[];
  night: Range[];
  rain: Range[];
  normals: boolean;
}) {
  const [ref, width] = useWidth();
  if (rows.length === 0) return null;
  const at = (meters: number) =>
    distanceM > 0 ? Math.min(1, Math.max(0, meters / distanceM)) : 0;
  const pct = (meters: number) => `${at(meters) * 100}%`;
  const span = (range: Range) => ({
    left: pct(range.fromM),
    width: `${Math.max(0.4, (at(range.toM) - at(range.fromM)) * 100)}%`,
  });
  const lastStation = stations.length - 1;
  return (
    <RaceCard aria-labelledby="gear-along">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 id="gear-along" className="font-semibold">
          Ce que tu portes, au fil de la course
        </h2>
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-4 rounded-full bg-foreground"
            />
            Sur toi
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-4 rounded-full bg-muted-foreground/30"
            />
            Dans le sac
          </li>
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-full border-2 border-foreground bg-card"
            />
            Tu changes
          </li>
        </ul>
      </div>
      <div className="flex flex-col">
        <div ref={ref} aria-hidden="true" className="relative h-9">
          <Labels
            width={width}
            items={stations.map((station, index) => ({
              key: station.id,
              at: at(station.distanceM),
              lines: [station.name, station.clock],
              priority: index === 0 || index === lastStation ? 1 : 0,
            }))}
          />
        </div>
        {temperatures.length > 0 && (
          <>
            <div aria-hidden="true" className="relative h-5">
              <Labels
                width={width}
                className="[&>span]:font-normal [&>span]:text-secondary-foreground"
                items={temperatures.map((item) => ({
                  key: `${item.distanceM}`,
                  at: at(item.distanceM),
                  lines: [item.label],
                }))}
              />
            </div>
          </>
        )}
        <ul className="flex flex-col">
          {rows.map((row) => (
            <li key={row.key} className="flex flex-col gap-1 pt-2">
              <span className="text-label font-medium">
                {row.label}
                <span className="sr-only">
                  {" : "}
                  {row.spans
                    .map(
                      (part) =>
                        `${part.state === "on" ? "sur toi" : "dans le sac"} du km ${Math.round(part.fromM / 1000)} au km ${Math.round(part.toM / 1000)}`,
                    )
                    .join(", ")}
                </span>
              </span>
              <span aria-hidden="true" className="relative h-4">
                {night.map((range) => (
                  <span
                    key={`night-${range.fromM}`}
                    className="absolute inset-y-0 bg-foreground/6"
                    style={span(range)}
                  />
                ))}
                {rain.map((range) => (
                  <span
                    key={`rain-${range.fromM}`}
                    className="absolute inset-y-0"
                    style={{
                      ...span(range),
                      backgroundImage:
                        "repeating-linear-gradient(135deg, color-mix(in oklab, var(--secondary-foreground) 25%, transparent) 0 1px, transparent 1px 6px)",
                    }}
                  />
                ))}
                {row.spans.map((part) => (
                  <span
                    key={`${part.fromM}-${part.state}`}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2",
                      part.state === "on"
                        ? "h-2 rounded-full bg-foreground"
                        : "h-2 rounded-full bg-muted-foreground/30",
                    )}
                    style={span(part)}
                  />
                ))}
                {row.changes.map((meters) => (
                  <span
                    key={meters}
                    className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground bg-card"
                    style={{ left: pct(meters) }}
                  />
                ))}
              </span>
            </li>
          ))}
        </ul>
        <div
          aria-hidden="true"
          className="relative mt-2 h-5 border-t border-border text-label text-muted-foreground tabular-nums"
        >
          <Labels
            width={width}
            className="pt-1 [&>span]:font-normal [&>span]:text-muted-foreground"
            items={axisTicks(distanceM).map((tick) => ({
              key: `${tick.distanceM}`,
              at: at(tick.distanceM),
              lines: [tick.label],
            }))}
          />
        </div>
      </div>
      <p className="text-label text-pretty text-muted-foreground">
        {normals
          ? "Avant la prévision, la liste suit les moyennes de saison. Ensuite elle suit la météo à l’heure de ton passage."
          : "La liste suit la prévision à l’heure de ton passage."}
      </p>
    </RaceCard>
  );
}
