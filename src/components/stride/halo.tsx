import { useId } from "react";
import { cn } from "@/lib/utils";

type HaloScrim = "bottom" | "start" | "bottom-start";

const scrims: Record<
  HaloScrim,
  {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    stops: [offset: number, opacity: number][];
  }
> = {
  bottom: {
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 1,
    stops: [
      [0.45, 0],
      [0.85, 1],
    ],
  },
  start: {
    x1: 0,
    y1: 0,
    x2: 1,
    y2: 0,
    stops: [
      [0, 0.95],
      [0.55, 0.7],
      [0.8, 0],
    ],
  },
  "bottom-start": {
    x1: 0,
    y1: 1,
    x2: 0.4,
    y2: 0.35,
    stops: [
      [0, 0.95],
      [0.6, 0.85],
      [1, 0],
    ],
  },
};

const surfaces = {
  background: "var(--background)",
  inset: "var(--surface-inset)",
} as const;

export function Halo({
  viewBox,
  preserveAspectRatio = "xMidYMid slice",
  path,
  pool,
  width,
  trace = true,
  point,
  scrim,
  surface = "background",
  className,
}: {
  viewBox: string;
  preserveAspectRatio?: string;
  path: string;
  pool: { cx: number; cy: number; r: number };
  width: number;
  trace?: boolean;
  point?: { x: number; y: number };
  scrim?: HaloScrim;
  surface?: keyof typeof surfaces;
  className?: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [minX, minY, boxWidth, boxHeight] = viewBox.split(/[\s,]+/).map(Number);
  const region = {
    filterUnits: "userSpaceOnUse",
    x: minX - boxWidth,
    y: minY - boxHeight,
    width: boxWidth * 3,
    height: boxHeight * 3,
  } as const;
  const box = { x: minX, y: minY, width: boxWidth, height: boxHeight };
  const ribbon = `${id}-ribbon`;
  const scrimSpec = scrim ? scrims[scrim] : null;
  return (
    <svg
      data-slot="halo"
      aria-hidden="true"
      focusable="false"
      viewBox={viewBox}
      preserveAspectRatio={preserveAspectRatio}
      className={cn("pointer-events-none fill-none", className)}
    >
      <defs>
        <radialGradient
          id={`${id}-pool`}
          gradientUnits="userSpaceOnUse"
          cx={pool.cx}
          cy={pool.cy}
          r={pool.r}
        >
          <stop offset="0" style={{ stopColor: "var(--halo)" }} />
          <stop
            offset="0.5"
            style={{ stopColor: "var(--halo)", stopOpacity: 0.24 }}
          />
          <stop
            offset="1"
            style={{ stopColor: "var(--halo)", stopOpacity: 0 }}
          />
        </radialGradient>
        <linearGradient id={ribbon} x1="0" y1="1" x2="1" y2="0">
          <stop
            offset="0"
            style={{ stopColor: "var(--halo)", stopOpacity: 0 }}
          />
          <stop
            offset="0.45"
            style={{ stopColor: "var(--halo)", stopOpacity: 0.38 }}
          />
          <stop offset="0.78" style={{ stopColor: "var(--halo-core)" }} />
          <stop
            offset="1"
            style={{ stopColor: "var(--halo)", stopOpacity: 0.2 }}
          />
        </linearGradient>
        <filter id={`${id}-wide`} {...region}>
          <feGaussianBlur stdDeviation={width * 0.3} />
        </filter>
        <filter id={`${id}-narrow`} {...region}>
          <feGaussianBlur stdDeviation={width * 0.08} />
        </filter>
        <filter id={`${id}-spark`} {...region}>
          <feGaussianBlur stdDeviation={Math.max(2, width / 60)} />
        </filter>
        {scrimSpec && (
          <linearGradient
            id={`${id}-scrim`}
            x1={scrimSpec.x1}
            y1={scrimSpec.y1}
            x2={scrimSpec.x2}
            y2={scrimSpec.y2}
          >
            {scrimSpec.stops.map(([offset, opacity]) => (
              <stop
                key={offset}
                offset={offset}
                style={{ stopColor: surfaces[surface], stopOpacity: opacity }}
              />
            ))}
          </linearGradient>
        )}
      </defs>
      <g className="motion-safe:animate-halo-breathe">
        <rect
          {...box}
          fill={`url(#${id}-pool)`}
          style={{ opacity: "var(--halo-pool-opacity)" }}
        />
      </g>
      <g className="motion-safe:animate-halo-breathe" strokeLinecap="round">
        <path
          d={path}
          stroke={`url(#${ribbon})`}
          strokeWidth={width}
          filter={`url(#${id}-wide)`}
          style={{ opacity: "var(--halo-ribbon-opacity)" }}
        />
        <path
          d={path}
          stroke={`url(#${ribbon})`}
          strokeWidth={width * 0.23}
          filter={`url(#${id}-narrow)`}
          style={{ opacity: "var(--halo-ribbon-core-opacity)" }}
        />
        {trace && (
          <path
            d={path}
            className="stroke-halo-spark"
            strokeWidth={Math.max(4, width * 0.04)}
            filter={`url(#${id}-spark)`}
            style={{ opacity: "var(--halo-spark-opacity)" }}
          />
        )}
      </g>
      {trace && (
        <path
          d={path}
          pathLength={1}
          strokeDasharray="1"
          className="stroke-halo-trace motion-safe:animate-halo-draw"
          strokeWidth="2"
        />
      )}
      {point && (
        <>
          <circle
            cx={point.x}
            cy={point.y}
            r="14"
            className="fill-halo"
            filter={`url(#${id}-narrow)`}
            style={{ opacity: "calc(var(--halo-spark-opacity) * 0.5)" }}
          />
          <circle cx={point.x} cy={point.y} r="4" className="fill-halo-point" />
        </>
      )}
      {scrimSpec && <rect {...box} fill={`url(#${id}-scrim)`} />}
    </svg>
  );
}
