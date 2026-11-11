"use client";

import { useLayoutEffect, useRef } from "react";
import { countUpText } from "@/components/stride/count-up-text";

const durationMs = 500;

export function CountUp({ children }: { children: string }) {
  const element = useRef<HTMLSpanElement>(null);
  const latest = useRef(children);

  useLayoutEffect(() => {
    latest.current = children;
  }, [children]);

  useLayoutEffect(() => {
    const text = element.current?.firstChild;
    if (!(text instanceof Text)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const progress = Math.min(1, (now - start) / durationMs);
      text.data = countUpText(latest.current, progress);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    text.data = countUpText(latest.current, 0);
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      text.data = latest.current;
    };
  }, []);

  return <span ref={element}>{children}</span>;
}
