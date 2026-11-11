"use client";

import { useEffect, useRef } from "react";
import {
  reliefContours,
  reliefRestSpeed,
  reliefSpeed,
} from "@/components/stride/relief-contours";
import { useDataActivity } from "@/features/data-activity/components/provider";
import { cn } from "@/lib/utils";

const reliefStep = 2000 / 39;
const frameMs = 33;
const maxElapsedSeconds = 0.1;

const corners = {
  "top-right": {
    width: 1040,
    height: 760,
    shape: { cx: 1040, cy: -45.6, count: 19, step: reliefStep },
    position: "top-0 right-0",
    mask: "[mask-image:radial-gradient(100%_100%_at_100%_0%,#000_0%,rgb(0_0_0/0.9)_35%,rgb(0_0_0/0.4)_65%,transparent_100%)]",
  },
  "bottom-left": {
    width: 520,
    height: 560,
    shape: { cx: -20.8, cy: 571.2, count: 13, step: reliefStep },
    position: "bottom-0 left-0",
    mask: "[mask-image:radial-gradient(100%_100%_at_0%_100%,#000_0%,rgb(0_0_0/0.9)_35%,rgb(0_0_0/0.4)_65%,transparent_100%)]",
  },
} as const;

const still = {
  "top-right": reliefContours(corners["top-right"].shape),
  "bottom-left": reliefContours(corners["bottom-left"].shape),
};

export function Relief({
  corner,
  className,
}: {
  corner: keyof typeof corners;
  className?: string;
}) {
  const { width, height, shape, position, mask } = corners[corner];
  const busy = useDataActivity()?.busy ?? false;
  const busyNow = useRef(busy);
  const group = useRef<SVGGElement>(null);

  useEffect(() => {
    busyNow.current = busy;
  }, [busy]);

  useEffect(() => {
    const element = group.current;
    if (!element) return;
    const polygons = Array.from(element.querySelectorAll("polygon"));
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number | null = null;
    let phase = 0;
    let speed = reliefRestSpeed;
    let last: number | null = null;
    let painted = -Infinity;
    const paint = () => {
      const contours = reliefContours({ ...shape, phase });
      polygons.forEach((polygon, index) =>
        polygon.setAttribute("points", contours[index].points),
      );
    };
    const tick = (now: number) => {
      if (last !== null) {
        const elapsed = Math.min(maxElapsedSeconds, (now - last) / 1000);
        speed = reliefSpeed(speed, busyNow.current, elapsed);
        phase += speed * elapsed;
      }
      last = now;
      if (now - painted >= frameMs) {
        painted = now;
        paint();
      }
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      last = null;
      if (motion.matches) {
        phase = 0;
        paint();
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    start();
    motion.addEventListener("change", start);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      motion.removeEventListener("change", start);
    };
  }, [shape]);

  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-slot="relief"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn(
        "pointer-events-none absolute fill-none",
        position,
        mask,
        className,
      )}
    >
      <g ref={group}>
        {still[corner].map((contour, index) => (
          <polygon
            key={index}
            points={contour.points}
            className={
              contour.strong
                ? "stroke-relief-strong stroke-[1.4]"
                : "stroke-relief stroke-1"
            }
          />
        ))}
      </g>
    </svg>
  );
}
