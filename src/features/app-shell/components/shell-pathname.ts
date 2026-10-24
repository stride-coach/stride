"use client";

import { usePathname, useSelectedLayoutSegments } from "next/navigation";

export function useShellPathname() {
  const pathname = usePathname();
  const segments = useSelectedLayoutSegments();
  if (!pathname.startsWith("/plan/sessions/")) return pathname;
  return `/${segments.filter((segment) => !segment.startsWith("(")).join("/")}`;
}
