"use client";

import { useEffect, useState } from "react";
import type { PlanProfileData, PlanProfileStation } from "../timeline";

const stationStroke: Record<PlanProfileStation["tone"], string> = {
  start: "stroke-foreground",
  finish: "stroke-foreground",
  aid: "stroke-primary",
  water: "stroke-data-2",
  base: "stroke-warning",
};

function km(meters: number) {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(
    meters / 1000,
  );
}

function useCurrentSegment(count: number) {
  const [current, setCurrent] = useState(1);
  useEffect(() => {
    if (!count || typeof IntersectionObserver === "undefined") return;
    const cards = [
      ...document.querySelectorAll<HTMLElement>("[data-segment-index]"),
    ].filter((card) => card.offsetParent !== null);
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number(
            (entry.target as HTMLElement).dataset.segmentIndex,
          );
          if (entry.isIntersecting) visible.add(index);
          else visible.delete(index);
        }
        if (visible.size) setCurrent(Math.min(...visible));
      },
      { rootMargin: "-25% 0px -55% 0px" },
    );
    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [count]);
  return current;
}

export function PlanProfile({
  data,
  variant,
  caption,
}: {
  data: PlanProfileData;
  variant: "card" | "sticky";
  caption?: string;
}) {
  const current = useCurrentSegment(data.segments.length);
  const segment =
    data.segments.find((item) => item.index === current) ?? data.segments[0];
  const width = variant === "card" ? 300 : 350;
  const height = variant === "card" ? 110 : 60;
  const bottom = height - 4;
  const elevations = data.elevation.map(([, ele]) => ele);
  const low = Math.min(...elevations);
  const high = Math.max(...elevations);
  const x = (meters: number) =>
    data.distanceM > 0 ? (meters / data.distanceM) * width : 0;
  const y = (ele: number) =>
    high > low
      ? 6 + (1 - (ele - low) / (high - low)) * (bottom - 6)
      : bottom / 2;
  const line = data.elevation
    .map(([meters, ele]) => `${x(meters).toFixed(1)},${y(ele).toFixed(1)}`)
    .join(" ");
  const band = (range: { fromM: number; toM: number }) => ({
    x: x(range.fromM),
    width: Math.max(0, x(range.toM) - x(range.fromM)),
  });
  const route = segment
    ? `T${segment.index} · ${variant === "card" ? `${segment.route} · ` : ""}km ${km(segment.fromM)} → ${km(segment.toM)}`
    : null;
  return (
    <>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label={data.label}
        className="block"
      >
        {data.night.map((range) => (
          <rect
            key={`night-${range.fromM}`}
            {...band(range)}
            y={0}
            height={bottom}
            className="fill-data-2 opacity-10"
          />
        ))}
        {data.rain.map((range) => (
          <rect
            key={`rain-${range.fromM}`}
            {...band(range)}
            y={0}
            height={bottom}
            className="fill-data-2 opacity-10"
          />
        ))}
        {segment && (
          <rect
            {...band(segment)}
            y={0}
            height={bottom}
            className="fill-primary opacity-10"
          />
        )}
        {line && (
          <>
            <polygon
              points={`0,${bottom} ${line} ${width},${bottom}`}
              className="fill-muted"
            />
            <polyline
              points={line}
              fill="none"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
              className="stroke-secondary-foreground"
            />
          </>
        )}
        {data.stations.map((station) => (
          <line
            key={`${station.tone}-${station.distanceM}`}
            x1={x(station.distanceM)}
            x2={x(station.distanceM)}
            y1={6}
            y2={bottom}
            strokeOpacity={0.35}
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
            className={stationStroke[station.tone]}
          />
        ))}
      </svg>
      {variant === "card" ? (
        <span className="text-body">{route}</span>
      ) : (
        <span className="truncate text-label font-medium text-muted-foreground">
          {[route, caption].filter(Boolean).join(" · ")}
        </span>
      )}
    </>
  );
}
