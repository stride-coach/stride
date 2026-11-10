"use client";

import { useShellPathname } from "./shell-pathname";
import {
  TabActivitiesIcon,
  TabCoachIcon,
  TabPlanIcon,
  TabProgressIcon,
  TabTodayIcon,
} from "@/components/stride/nav-icons";
import { MobileTab, MobileTabBar } from "@/components/stride/mobile-tab-bar";
import { isActivePath, mobileTabBarVisible } from "../mobile-nav";
import {
  coachActionLabel,
  coachWaiting,
  type CoachAttention,
} from "../coach-attention";

export function AppMobileTabBar({
  attention,
}: {
  attention: CoachAttention | null;
}) {
  const pathname = useShellPathname();
  if (!mobileTabBarVisible(pathname)) return null;
  const waiting = coachWaiting(attention);
  const tab = (
    href: string,
    icon: React.ReactNode,
    label: string,
    match: string[] = [],
  ) => (
    <MobileTab
      href={href}
      icon={icon}
      label={label}
      isActive={[href, ...match].some((path) => isActivePath(pathname, path))}
    />
  );
  return (
    <MobileTabBar className="relative z-10 shrink-0 md:hidden print:hidden">
      {tab("/today", <TabTodayIcon />, "Aujourd’hui")}
      {tab("/plan", <TabPlanIcon />, "Plan")}
      <MobileTab
        href="/coach"
        icon={<TabCoachIcon />}
        label="Coach"
        accessibleLabel={coachActionLabel(attention)}
        isActive={isActivePath(pathname, "/coach")}
        badge={
          waiting > 0 ? (
            <span
              data-kind="count"
              aria-hidden="true"
              className="absolute top-0 left-1/2 ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-micro font-semibold text-primary-foreground tabular-nums ring-2 ring-background"
            >
              {waiting}
            </span>
          ) : undefined
        }
      />
      {tab("/activities", <TabActivitiesIcon />, "Activités", ["/gear"])}
      {tab("/progress", <TabProgressIcon />, "Santé", ["/nutrition"])}
    </MobileTabBar>
  );
}
