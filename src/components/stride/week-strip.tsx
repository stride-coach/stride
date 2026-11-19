"use client";

import { useLayoutEffect, useRef } from "react";

export function WeekStrip({
  label,
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const list = useRef<HTMLOListElement>(null);
  useLayoutEffect(() => {
    const strip = list.current;
    const today = strip?.querySelector<HTMLElement>('li[data-today="true"]');
    if (!strip || !today || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft +=
      today.getBoundingClientRect().left -
      strip.getBoundingClientRect().left -
      Number.parseFloat(getComputedStyle(strip).paddingLeft);
  }, []);
  return (
    <ol ref={list} aria-label={label} className={className}>
      {children}
    </ol>
  );
}
