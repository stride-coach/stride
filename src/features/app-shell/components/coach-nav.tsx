"use client";

import { useShellPathname } from "./shell-pathname";
import { NavBadge, NavItem } from "@/components/stride/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import {
  coachAttentionLabel,
  coachWaiting,
  type CoachAttention,
} from "../coach-attention";

export function CoachNavItem({
  attention,
}: {
  attention: CoachAttention | null;
}) {
  const pathname = useShellPathname();
  const active = pathname === "/coach" || pathname.startsWith("/coach/");
  const waiting = coachWaiting(attention);
  return (
    <NavItem
      href="/coach"
      icon={<StrideMark className="stroke-current" strokeWidth="1.8" />}
      label="Coach"
      isActive={active}
      attention={waiting > 0}
      badge={
        attention && waiting > 0 ? (
          <NavBadge kind="count" className="top-4">
            <span aria-hidden="true">{waiting}</span>
            <span className="sr-only">{coachAttentionLabel(attention)}</span>
          </NavBadge>
        ) : undefined
      }
    />
  );
}
