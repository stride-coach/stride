"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { fitLabels, labelWidth, placeLabel } from "../axis-layout";
import type { FuelingChart, FuelingHour } from "../nutrition-view";

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
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

function Row({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="text-label text-muted-foreground">{label}</p>
      <div className={cn("relative", className)}>{children}</div>
    </div>
  );
}

export function FuelingHours({
  hours,
  chart,
  targetPerHourG,
}: {
  hours: FuelingHour[];
  chart: FuelingChart;
  targetPerHourG: number;
}) {
  const [ref, width] = useWidth();
  if (hours.length === 0) return null;
  const span = hours.length * 3600;
  const x = (at: number) => (at * chart.finishSeconds) / span;
  const top = Math.max(
    targetPerHourG * 1.25,
    ...hours.map((hour) => hour.carbsG),
  );
  const height = (value: number) => `${Math.min(100, (value / top) * 100)}%`;
  const labelEvery = hours.length > 12 ? 3 : hours.length > 6 ? 2 : 1;
  const barWidth = width / hours.length;
  const stations = chart.stations.map((station, index) => {
    const size = Math.max(labelWidth(station.name), labelWidth(station.clock));
    return {
      ...station,
      size,
      at: x(station.at),
      priority: index === 0 || index === chart.stations.length - 1 ? 1 : 0,
    };
  });
  const shownStations = fitLabels(
    stations.map(({ at, size, priority }) => ({ at, width: size, priority })),
    width,
    8,
  );
  const drinkMax = Math.max(...chart.drink.map((item) => item.mlPerHour), 1);
  const drinkMin = Math.min(...chart.drink.map((item) => item.mlPerHour));
  const drinkY = (value: number) =>
    drinkMax === drinkMin
      ? 60
      : 85 - ((value - drinkMin) / (drinkMax - drinkMin)) * 50;
  const drinkLabels = chart.drink.map((item) => ({
    ...item,
    size: labelWidth(item.label),
    at: x((item.from + item.to) / 2),
  }));
  const shownDrink = fitLabels(
    drinkLabels.map(({ at, size }) => ({ at, width: size })),
    width,
  );
  const caffeineCount = chart.intakes.filter(
    (intake) => intake.caffeine,
  ).length;
  return (
    <div ref={ref} className="flex flex-col gap-3">
      <div aria-hidden="true" className="relative h-8">
        {stations.map((station, index) =>
          shownStations[index] ? (
            <span
              key={station.id}
              className={cn(
                "absolute top-0 flex flex-col text-label leading-4 whitespace-nowrap",
                index === 0
                  ? "items-start"
                  : index === stations.length - 1
                    ? "items-end"
                    : "items-center",
              )}
              style={{
                left: placeLabel(station.at, station.size, width),
                width: station.size,
              }}
            >
              <span className="max-w-full truncate font-medium">
                {station.name}
              </span>
              <span className="text-secondary-foreground tabular-nums">
                {station.clock}
              </span>
            </span>
          ) : null,
        )}
      </div>
      <Row label="Glucides par heure">
        <ol
          aria-label="Glucides heure par heure"
          className="relative flex h-32 items-end gap-0.5 border-b border-border pt-5"
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-primary"
            style={{ bottom: height(targetPerHourG) }}
          >
            <span className="absolute right-0 bottom-0.5 text-label text-primary">
              cible {targetPerHourG} g/h
            </span>
          </span>
          {hours.map((hour) => (
            <li
              key={hour.index}
              className={cn(
                "relative flex h-full min-w-0 flex-1 items-end rounded-t-xs",
                hour.night && "bg-foreground/5",
              )}
            >
              <span className="sr-only">
                {hour.clock} : {hour.carbsG} g
                {hour.caffeine ? ", avec caféine" : ""}
                {hour.night ? ", de nuit" : ""}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "relative block w-full rounded-t-xs",
                  hour.night
                    ? "bg-secondary-foreground/25"
                    : "bg-secondary-foreground/45",
                )}
                style={{ height: height(hour.carbsG) }}
              >
                {barWidth >= 18 && hour.carbsG > 0 && (
                  <span className="absolute inset-x-0 -top-4.5 text-center text-label leading-4 text-secondary-foreground tabular-nums">
                    {hour.carbsG}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ol>
        <div
          aria-hidden="true"
          className="mt-1 flex gap-0.5 text-label text-muted-foreground tabular-nums"
        >
          {hours.map((hour) => (
            <span
              key={hour.index}
              className="min-w-0 flex-1 overflow-visible whitespace-nowrap"
            >
              {hour.index % labelEvery === 0 ? hour.clock : ""}
            </span>
          ))}
        </div>
      </Row>
      <Row label="Boisson, selon la chaleur" className="h-12">
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 100"
          preserveAspectRatio="none"
          className="absolute inset-0 block size-full"
        >
          {chart.drink.map((item) => (
            <line
              key={item.from}
              x1={x(item.from) * 1000}
              x2={x(item.to) * 1000}
              y1={drinkY(item.mlPerHour)}
              y2={drinkY(item.mlPerHour)}
              className="stroke-data-1"
              strokeWidth={2.5}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
        {drinkLabels.map((item, index) =>
          shownDrink[index] ? (
            <span
              key={item.from}
              aria-hidden="true"
              className="absolute text-center text-label leading-4 whitespace-nowrap text-secondary-foreground tabular-nums"
              style={{
                left: placeLabel(item.at, item.size, width),
                width: item.size,
                top: `calc(${drinkY(item.mlPerHour)}% - 18px)`,
              }}
            >
              {item.label}
            </span>
          ) : null,
        )}
        <ul className="sr-only">
          {chart.drink.map((item) => (
            <li key={item.from}>{item.label}</li>
          ))}
        </ul>
      </Row>
      <Row label="Prises" className="h-6">
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-1/2 border-t border-border"
        />
        {chart.intakes.map((intake, index) => (
          <span
            key={index}
            aria-hidden="true"
            className={cn(
              "absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full",
              intake.caffeine ? "size-2 bg-warning" : "size-1.5 bg-foreground",
            )}
            style={{ left: `${x(intake.at) * 100}%` }}
          />
        ))}
        {chart.stations.slice(1, -1).map((station, index) => (
          <span
            key={station.id}
            aria-hidden="true"
            className="absolute top-1/2 grid size-4.5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-foreground bg-card text-label leading-none font-medium tabular-nums"
            style={{ left: `${x(station.at) * 100}%` }}
          >
            {index + 1}
          </span>
        ))}
        <p className="sr-only">
          {chart.intakes.length} prises
          {caffeineCount > 0 ? `, dont ${caffeineCount} avec caféine` : ""}, et{" "}
          {Math.max(0, chart.stations.length - 2)} ravitaillements.
        </p>
      </Row>
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="h-2 w-3 rounded-xs bg-secondary-foreground/45"
          />
          Glucides pris dans l’heure
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-foreground"
          />
          Une prise
        </li>
        {caffeineCount > 0 && (
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-warning"
            />
            Avec caféine
          </li>
        )}
        {hours.some((hour) => hour.night) && (
          <li className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-2 w-3 rounded-xs bg-muted ring-1 ring-border"
            />
            Nuit
          </li>
        )}
      </ul>
    </div>
  );
}
