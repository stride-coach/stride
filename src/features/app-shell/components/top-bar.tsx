import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { StrideMark } from "@/components/stride/stride-mark";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import type { ShellAthlete, ShellGoal } from "../shell";
import { AccountAvatarMenu } from "./account-menu";

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
        <StrideMark className="size-4.5 stroke-primary" />
        <span className="text-body-lg">Stride</span>
      </Link>
      {goal && (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            /
          </span>
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
        </>
      )}
      <span className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" variant="outline">
          <Link href="/coach/new">Demander au coach</Link>
        </Button>
        <NotificationBell />
        <AccountAvatarMenu athlete={athlete} modelDetail={modelDetail} />
      </span>
    </header>
  );
}
