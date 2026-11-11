import { Suspense } from "react";
import { DataActivityProvider } from "@/features/data-activity/components/provider";
import { NotificationsProvider } from "@/features/notifications/components/notifications-context";
import type { NotificationFeed } from "@/features/notifications/model";
import { PullToSync } from "@/features/data-activity/components/pull-to-sync";
import {
  DataActivityStatus,
  DataActivityFeedback,
} from "@/features/data-activity/components/status";
import {
  NavActivitiesIcon,
  NavPlanIcon,
  NavProgressIcon,
  NavRacesIcon,
  NavTodayIcon,
} from "@/components/stride/nav-icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarInset,
  SidebarMenu,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  shellProfileDetail,
  type ShellAccount,
  type ShellBadge,
  type ShellAthlete,
  type ShellGoal,
  type ShellNavigation,
  type ShellSeason,
} from "@/features/app-shell/shell";
import { AppMobileTabBar } from "./app-mobile-tab-bar";
import { CoachNavItem } from "./coach-nav";
import { PlanSidebarGroup, PlanSidebarGroupLoading } from "./plan-nav";
import { ProgressSidebarGroup } from "@/features/progress/components/progress-nav";
import { ShellNavItem } from "./shell-nav-item";
import { TopBar } from "./top-bar";
import { ShellIdentityProvider } from "./shell-identity";
import { Relief } from "@/components/stride/relief";
import { ShortcutHelp } from "./shortcut-help";

type Navigation = { navigation: Promise<ShellNavigation> };

async function TodayNavItem({ navigation }: Navigation) {
  const { todayBadge } = await navigation;
  return <TodayNavLink badge={todayBadge} />;
}

function TodayNavLink({ badge = null }: { badge?: ShellBadge | null }) {
  return (
    <ShellNavItem
      href="/today"
      icon={<NavTodayIcon />}
      label="Aujourd’hui"
      badge={badge}
    />
  );
}

async function CoachNav({ navigation }: Navigation) {
  const { coachAttention } = await navigation;
  return <CoachNavItem attention={coachAttention} />;
}

async function PlanNav({ navigation }: Navigation) {
  const { planNav, planHistoryCount } = await navigation;
  return <PlanSidebarGroup nav={planNav} historyCount={planHistoryCount} />;
}

async function MobileTabBar({ navigation }: Navigation) {
  const { coachAttention } = await navigation;
  return <AppMobileTabBar attention={coachAttention} />;
}

export function AppShell({
  athlete,
  account,
  goal,
  seasons,
  navigation,
  notifications,
  notificationsAt,
  defaultOpen,
  children,
}: {
  athlete: ShellAthlete;
  account: ShellAccount;
  goal: ShellGoal | null;
  seasons: Promise<ShellSeason[]>;
  navigation: Promise<ShellNavigation>;
  notifications: Promise<NotificationFeed | null>;
  notificationsAt: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const modelDetail = shellProfileDetail(account);
  return (
    <ShellIdentityProvider value={{ athlete, goal, seasons, modelDetail }}>
      <NotificationsProvider feed={notifications} now={notificationsAt}>
        <DataActivityProvider>
          <SidebarProvider
            defaultOpen={defaultOpen}
            className="relative h-svh flex-col overflow-hidden md:bg-shell print:h-auto print:overflow-visible"
          >
            <ShortcutHelp />
            <Relief corner="top-right" className="max-md:hidden print:hidden" />
            <Relief
              corner="bottom-left"
              className="max-md:hidden print:hidden"
            />
            <TopBar athlete={athlete} goal={goal} modelDetail={modelDetail} />
            <div className="relative flex min-h-0 flex-1">
              <Sidebar
                variant="inset"
                collapsible="icon"
                className="md:top-topbar md:h-[calc(100svh-var(--spacing-topbar))] print:hidden"
              >
                <SidebarContent>
                  <SidebarGroup>
                    <SidebarMenu>
                      <Suspense fallback={<TodayNavLink />}>
                        <TodayNavItem navigation={navigation} />
                      </Suspense>
                      <ShellNavItem
                        href="/plan"
                        icon={<NavPlanIcon />}
                        label="Plan"
                      />
                      <ShellNavItem
                        href="/activities"
                        icon={<NavActivitiesIcon />}
                        label="Activités"
                      />
                      <ShellNavItem
                        href="/health/fitness"
                        match={["/health"]}
                        icon={<NavProgressIcon />}
                        label="Santé"
                      />
                      <ShellNavItem
                        href="/races"
                        icon={<NavRacesIcon />}
                        label="Courses"
                      />
                      <Suspense fallback={<CoachNavItem attention={null} />}>
                        <CoachNav navigation={navigation} />
                      </Suspense>
                    </SidebarMenu>
                  </SidebarGroup>
                  <Suspense fallback={<PlanSidebarGroupLoading />}>
                    <PlanNav navigation={navigation} />
                  </Suspense>
                  <ProgressSidebarGroup />
                </SidebarContent>
                <SidebarFooter>
                  <DataActivityStatus
                    compact
                    className="hidden justify-center group-data-[collapsible=icon]:flex"
                  />
                  <DataActivityStatus className="px-2 text-label group-data-[collapsible=icon]:hidden max-md:hidden" />
                </SidebarFooter>
                <SidebarRail />
              </Sidebar>
              <SidebarInset className="group/inset relative h-svh min-h-0 overflow-hidden md:h-[calc(100svh-var(--spacing-topbar)-0.5rem)] md:peer-data-[variant=inset]:mt-0 md:peer-data-[variant=inset]:rounded-xl print:h-auto print:overflow-visible md:print:h-auto">
                <DataActivityFeedback />
                <PullToSync>{children}</PullToSync>
                <Suspense fallback={<AppMobileTabBar attention={null} />}>
                  <MobileTabBar navigation={navigation} />
                </Suspense>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </DataActivityProvider>
      </NotificationsProvider>
    </ShellIdentityProvider>
  );
}
