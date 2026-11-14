import { Suspense } from "react";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { StrideLogo } from "@/components/stride/stride-logo";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { SearchTrigger } from "@/features/search/components/search-trigger";
import type { ShellAthlete, ShellGoal } from "../shell";
import { AccountAvatarMenu } from "./account-menu";
import { AskCoachButton } from "./ask-coach-button";
import { SeasonMenu } from "./season-menu";

export function TopBar({
  athlete,
  goal,
  modelDetail,
  sidebarToggle = true,
}: {
  athlete: ShellAthlete;
  goal: ShellGoal | null;
  modelDetail: string;
  sidebarToggle?: boolean;
}) {
  const goalLink = goal && (
    <Link
      href="/races"
      aria-label={`Objectif : ${goal.name}, ${goal.detail}`}
      className="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 font-medium transition-colors duration-150 ease-stride hover:bg-muted"
    >
      <span className="truncate">{goal.name}</span>
      <span className="truncate font-normal text-muted-foreground tabular-nums">
        {goal.detail}
      </span>
    </Link>
  );
  const separator = (
    <span aria-hidden="true" className="text-muted-foreground">
      /
    </span>
  );
  const fallback = goalLink && (
    <>
      {separator}
      {goalLink}
    </>
  );
  return (
    <header
      data-slot="top-bar"
      className="relative z-20 hidden h-topbar shrink-0 items-center gap-2.5 pr-3.5 pl-2 md:flex print:hidden"
    >
      {sidebarToggle && (
        <SidebarTrigger
          aria-label="Afficher ou masquer la barre latérale"
          className="text-muted-foreground"
        />
      )}
      <Link
        href="/today"
        className="flex items-center gap-2 rounded-md px-1 font-semibold tracking-[-0.02em]"
      >
        <StrideLogo className="size-4.5" />
        <span className="text-body-lg">Stride</span>
      </Link>
      <Suspense fallback={fallback}>
        <SeasonMenu fallback={fallback}>{separator}</SeasonMenu>
      </Suspense>
      <SearchTrigger className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-lg:hidden" />
      <span className="ml-auto flex items-center gap-2">
        <Suspense fallback={<AskCoachButton fallback />}>
          <AskCoachButton />
        </Suspense>
        <NotificationBell />
        <AccountAvatarMenu athlete={athlete} modelDetail={modelDetail} />
      </span>
    </header>
  );
}
