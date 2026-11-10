"use client";

import Link from "next/link";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { cn } from "@/lib/utils";
import { AccountAvatarMenu } from "./account-menu";
import { useShellIdentity } from "./shell-identity";

export function MobileHeaderActions({ className }: { className?: string }) {
  const identity = useShellIdentity();
  if (!identity) return null;
  const { athlete, goal, modelDetail } = identity;
  return (
    <div
      data-slot="mobile-header-actions"
      className={cn("flex shrink-0 items-center gap-2 md:hidden", className)}
    >
      {goal?.countdown && (
        <Link
          href="/races"
          aria-label={`Objectif : ${goal.name}, ${goal.countdown}`}
          className="inline-flex h-5 items-center rounded-sm border border-control-border px-1.75 text-label text-secondary-foreground tabular-nums"
        >
          {goal.countdown}
        </Link>
      )}
      <NotificationBell />
      <AccountAvatarMenu athlete={athlete} modelDetail={modelDetail} />
    </div>
  );
}
