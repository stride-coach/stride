"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { galetFrame, type GaletFrame, type GaletState } from "../galet";
import { staff, type StaffAgent } from "../staff";

type Painter = (seconds: number) => void;

const painters = new Set<Painter>();
let frame: number | null = null;

function tick(milliseconds: number) {
  const seconds = milliseconds / 1000;
  for (const paint of painters) paint(seconds);
  frame = painters.size > 0 ? requestAnimationFrame(tick) : null;
}

function subscribe(paint: Painter) {
  painters.add(paint);
  if (frame === null) frame = requestAnimationFrame(tick);
  return () => {
    painters.delete(paint);
    if (painters.size === 0 && frame !== null) {
      cancelAnimationFrame(frame);
      frame = null;
    }
  };
}

function apply(
  elements: {
    body: SVGPolygonElement;
    halo: SVGPolygonElement;
    eyes: SVGGElement;
    left: SVGRectElement;
    right: SVGRectElement;
  },
  next: GaletFrame,
) {
  elements.body.setAttribute("points", next.body);
  elements.halo.setAttribute("points", next.halo);
  elements.halo.setAttribute("opacity", next.haloOpacity.toFixed(2));
  elements.eyes.setAttribute(
    "transform",
    `translate(${next.eyeShift.x.toFixed(1)},${next.eyeShift.y})`,
  );
  for (const eye of [elements.left, elements.right]) {
    eye.setAttribute("height", next.eyeHeight.toFixed(1));
    eye.setAttribute("y", next.eyeY.toFixed(1));
  }
}

export function StaffAvatar({
  agent,
  size,
  state = "idle",
  decorative = false,
  className,
}: {
  agent: StaffAgent;
  size: 22 | 30 | 48;
  state?: GaletState;
  decorative?: boolean;
  className?: string;
}) {
  const body = useRef<SVGPolygonElement>(null);
  const halo = useRef<SVGPolygonElement>(null);
  const eyes = useRef<SVGGElement>(null);
  const left = useRef<SVGRectElement>(null);
  const right = useRef<SVGRectElement>(null);
  const still = galetFrame(agent, state, 0, false);

  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const elements = {
      body: body.current,
      halo: halo.current,
      eyes: eyes.current,
      left: left.current,
      right: right.current,
    };
    if (
      !elements.body ||
      !elements.halo ||
      !elements.eyes ||
      !elements.left ||
      !elements.right
    )
      return;
    const ready = elements as {
      [Key in keyof typeof elements]: NonNullable<(typeof elements)[Key]>;
    };
    let unsubscribe: (() => void) | null = null;
    let visible = true;
    const start = () => {
      unsubscribe?.();
      unsubscribe = null;
      if (motion.matches || !visible) {
        apply(ready, galetFrame(agent, state, 0, false));
        return;
      }
      unsubscribe = subscribe((seconds) =>
        apply(ready, galetFrame(agent, state, seconds)),
      );
    };
    const observer =
      typeof IntersectionObserver === "undefined"
        ? null
        : new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting === visible) return;
            visible = entry.isIntersecting;
            start();
          });
    observer?.observe(ready.body.ownerSVGElement ?? ready.body);
    start();
    motion.addEventListener("change", start);
    return () => {
      observer?.disconnect();
      motion.removeEventListener("change", start);
      unsubscribe?.();
    };
  }, [agent, state]);

  return (
    <svg
      viewBox="0 0 100 100"
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : staff[agent].name}
      aria-hidden={decorative || undefined}
      data-slot="staff-avatar"
      data-state={state}
      className={cn("shrink-0 overflow-visible", className)}
      style={{ width: size, height: size }}
    >
      <polygon
        ref={halo}
        points={still.halo}
        fill="none"
        strokeWidth={3}
        opacity={still.haloOpacity}
        className="stroke-primary"
      />
      <polygon ref={body} points={still.body} className="fill-foreground" />
      <g
        ref={eyes}
        transform={`translate(${still.eyeShift.x},${still.eyeShift.y})`}
      >
        <rect
          ref={left}
          x={36.5}
          y={still.eyeY}
          width={8}
          height={still.eyeHeight}
          rx={4}
          className="fill-background"
        />
        <rect
          ref={right}
          x={55.5}
          y={still.eyeY}
          width={8}
          height={still.eyeHeight}
          rx={4}
          className="fill-background"
        />
      </g>
    </svg>
  );
}

export function StaffStack({
  agents,
  size,
  className,
}: {
  agents: readonly StaffAgent[];
  size: 22;
  className?: string;
}) {
  return (
    <span aria-hidden="true" className={cn("flex", className)}>
      {agents.map((agent, index) => (
        <StaffAvatar
          key={agent}
          agent={agent}
          size={size}
          decorative
          className={cn(index > 0 && "-ml-1")}
        />
      ))}
    </span>
  );
}
