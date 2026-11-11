import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import {
  NavActivitiesIcon,
  NavPlanIcon,
  NavProgressIcon,
  NavRacesIcon,
  NavTodayIcon,
  TabActivitiesIcon,
  TabCoachIcon,
  TabPlanIcon,
  TabProgressIcon,
  TabTodayIcon,
} from "@/components/stride/nav-icons";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarInset,
  SidebarMenu,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { MonoLabel } from "@/components/stride/mono-label";
import { MobileTab, MobileTabBar } from "@/components/stride/mobile-tab-bar";
import { NavBadge, NavItem } from "@/components/stride/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import { SyncStatus } from "@/components/stride/sync-status";

export const metadata: Metadata = { title: "Shell · Design system" };

const shell = "/design-system/shell";

export default async function ShellPage() {
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <Sidebar variant="inset" collapsible="icon">
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Training</SidebarGroupLabel>
            <SidebarMenu>
              <NavItem
                href={shell}
                icon={<NavTodayIcon />}
                label="Today"
                isActive
                attention
                badge={
                  <NavBadge kind="value" tone="warning">
                    58
                  </NavBadge>
                }
              />
              <NavItem
                href={`${shell}#coach`}
                icon={
                  <StrideMark className="stroke-current" strokeWidth="1.8" />
                }
                label="Coach"
                attention
                badge={<NavBadge kind="count">2</NavBadge>}
              />
              <NavItem
                href={`${shell}#plan`}
                icon={<NavPlanIcon />}
                label="Plan"
              />
              <NavItem
                href={`${shell}#activities`}
                icon={<NavActivitiesIcon />}
                label="Activities"
              />
              <NavItem
                href={`${shell}#progress`}
                icon={<NavProgressIcon />}
                label="Progress"
              />
              <NavItem
                href={`${shell}#races`}
                icon={<NavRacesIcon />}
                label="Races"
              />
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarRail />
      </Sidebar>
      <SidebarInset className="min-h-svh pb-24 md:min-h-[calc(100svh-1rem)] md:pb-0">
        <header className="flex h-14 items-center gap-3 border-b border-border px-4">
          <SidebarTrigger />
          <Separator
            orientation="vertical"
            className="data-vertical:h-4 data-vertical:self-center"
          />
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 text-body"
          >
            <Link
              href="/design-system"
              className="text-muted-foreground hover:text-foreground"
            >
              Design system
            </Link>
            <span aria-hidden="true" className="text-muted-foreground">
              /
            </span>
            <span aria-current="page">App shell</span>
          </nav>
        </header>
        <div className="flex max-w-3xl flex-col gap-6 p-5 sm:p-10">
          <MonoLabel>Wed 7 Oct · Rebuild · Week 2</MonoLabel>
          <h1 className="text-verdict font-semibold text-balance sm:text-display">
            A sidebar that carries context, not just links.
          </h1>
          <p className="text-body text-pretty text-secondary-foreground">
            Expanded at 264 px with an inset work area. Press{" "}
            <kbd className="text-label tabular-nums">⌘B</kbd> or use the trigger
            to collapse to the 56 px icon rail, where badges become dots and
            labels move to tooltips. Below 768 px the sidebar becomes a sheet
            and the bottom tabs keep daily use one thumb away.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge>Sidebar · inset</Badge>
            <Badge>collapsible=&quot;icon&quot;</Badge>
            <Badge>Sheet on mobile</Badge>
          </div>
          <SyncStatus state="importing" progress={71}>
            Importing from Garmin · now at 2020
          </SyncStatus>
        </div>
      </SidebarInset>
      <MobileTabBar className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        <MobileTab href={shell} icon={<TabTodayIcon />} label="Aujourd’hui" />
        <MobileTab href={`${shell}#plan`} icon={<TabPlanIcon />} label="Plan" />
        <MobileTab
          href={`${shell}#coach`}
          icon={<TabCoachIcon />}
          label="Coach"
          accessibleLabel="Coach, 2 questions en attente"
          isActive
          badge={
            <NavBadge
              kind="count"
              className="-top-1 -right-1 translate-y-0 ring-2 ring-background"
            >
              <span aria-hidden="true">2</span>
            </NavBadge>
          }
        />
        <MobileTab
          href={`${shell}#activities`}
          icon={<TabActivitiesIcon />}
          label="Activités"
        />
        <MobileTab
          href={`${shell}#progress`}
          icon={<TabProgressIcon />}
          label="Progression"
        />
      </MobileTabBar>
    </SidebarProvider>
  );
}
