"use client";

import { useShellPathname } from "./shell-pathname";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { NavBadge, NavItem } from "@/components/stride/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import {
  coachAttentionLabel,
  coachWaiting,
  type CoachAttention,
} from "../coach-attention";

const subClass =
  "min-h-7.5 pl-4 text-body text-muted-foreground data-[active=true]:bg-transparent data-[active=true]:text-foreground";

export function CoachNavItem({
  attention,
}: {
  attention: CoachAttention | null;
}) {
  const pathname = useShellPathname();
  const active = pathname === "/coach" || pathname.startsWith("/coach/");
  const team = pathname === "/coach/team";
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
    >
      {active && (
        <SidebarMenuSub className="mx-0 ml-5 gap-px border-l-0 px-0 py-0.5">
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild isActive={!team} className={subClass}>
              <Link href="/coach" aria-current={team ? undefined : "page"}>
                Conversation
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
          <SidebarMenuSubItem>
            <SidebarMenuSubButton asChild isActive={team} className={subClass}>
              <Link href="/coach/team" aria-current={team ? "page" : undefined}>
                Le staff
              </Link>
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        </SidebarMenuSub>
      )}
    </NavItem>
  );
}
