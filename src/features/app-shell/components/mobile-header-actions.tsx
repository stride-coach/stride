"use client";

import { Suspense } from "react";
import Link from "next/link";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { MobileSearchButton } from "@/features/search/components/search-trigger";
import { cn } from "@/lib/utils";
import type { ShellGoal } from "../shell";
import { AccountAvatarMenu } from "./account-menu";
import { useSeasonSelection } from "./season-menu";
import { useShellIdentity } from "./shell-identity";

function GoalCountdown({ goal }: { goal: ShellGoal }) {
  return (
    <Link
      href="/races"
      aria-label={`Objectif : ${goal.name}, ${goal.countdown}`}
      className="relative inline-flex h-5 items-center rounded-sm border border-control-border px-1.75 text-label text-secondary-foreground tabular-nums after:absolute after:-inset-x-1 after:-inset-y-2.5"
    >
      {goal.countdown}
    </Link>
  );
}

function SeasonGoalCountdown({ goal }: { goal: ShellGoal }) {
  const { selected, onPlan } = useSeasonSelection();
  if (onPlan && selected && selected.status !== "current") return null;
  return <GoalCountdown goal={goal} />;
}

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
        <Suspense fallback={<GoalCountdown goal={goal} />}>
          <SeasonGoalCountdown goal={goal} />
        </Suspense>
      )}
      <MobileSearchButton />
      <NotificationBell />
      <AccountAvatarMenu athlete={athlete} modelDetail={modelDetail} />
    </div>
  );
}
