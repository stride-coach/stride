"use client";

import { useState, type PointerEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type InspectorTone =
  | "foreground"
  | "danger"
  | "provider"
  | "success"
  | "warning"
  | "accent"
  | "zone-3"
  | "muted";

export type InspectorPoint = {
  x: number;
  title: string;
  rows: { label: string; value: string; tone?: InspectorTone }[];
  note?: string;
};

const dots: Record<InspectorTone, string> = {
  foreground: "bg-foreground",
  danger: "bg-destructive",
  provider: "bg-foreground",
  success: "bg-primary",
  warning: "bg-warning",
  accent: "bg-primary",
  "zone-3": "bg-intensity-3",
  muted: "bg-muted-foreground",
};

export function ChartInspector({
  label,
  points,
  className,
  children,
}: {
  label: string;
  points: InspectorPoint[];
  className?: string;
  children: ReactNode;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const point = selected === null ? null : points[selected];
  const inspect = (event: PointerEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width;
    let nearest = 0;
    points.forEach((item, index) => {
      if (Math.abs(item.x - x) < Math.abs(points[nearest].x - x))
        nearest = index;
    });
    setSelected(nearest);
  };
  const last = points.length - 1;
  return (
    <div
      data-slot="chart-inspector"
      role="group"
      aria-label={`${label} · survole ou utilise les flèches pour lire chaque valeur`}
      tabIndex={points.length ? 0 : -1}
      className={cn(
        "relative touch-pan-y rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      onFocus={() => setSelected((current) => current ?? last)}
      onBlur={() => setSelected(null)}
      onPointerMove={inspect}
      onPointerDown={inspect}
      onPointerLeave={(event) => {
        if (event.pointerType === "mouse") setSelected(null);
      }}
      onPointerCancel={() => setSelected(null)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setSelected(null);
        else if (
          ["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
        ) {
          event.preventDefault();
          setSelected(
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? last
                : Math.max(
                    0,
                    Math.min(
                      last,
                      (selected ?? last) + (event.key === "ArrowLeft" ? -1 : 1),
                    ),
                  ),
          );
        }
      }}
    >
      {children}
      {point && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 w-px bg-muted-foreground"
            style={{ left: `${point.x * 100}%` }}
          />
          <div
            role="status"
            className={cn(
              "pointer-events-none absolute top-0 z-10 flex w-max max-w-64 min-w-40 flex-col gap-1.5 rounded-lg border border-control-border bg-card px-3 py-2.5 shadow-float",
              point.x > 0.6 ? "-translate-x-full" : "",
            )}
            style={{
              left: `calc(${point.x * 100}% ${point.x > 0.6 ? "- 10px" : "+ 10px"})`,
            }}
          >
            <p className="text-label font-medium text-foreground tabular-nums">
              {point.title}
            </p>
            {point.rows.map((row, index) => (
              <p
                key={`${row.label}-${index}`}
                className="flex items-baseline justify-between gap-4 text-label"
              >
                <span className="flex items-center gap-1.5 text-secondary-foreground">
                  {row.tone && (
                    <span
                      aria-hidden="true"
                      className={cn("size-1.5 rounded-full", dots[row.tone])}
                    />
                  )}
                  {row.label}
                </span>
                <span className="text-body font-semibold tabular-nums">
                  {row.value}
                </span>
              </p>
            ))}
            {point.note && (
              <p className="text-label text-pretty text-muted-foreground">
                {point.note}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
