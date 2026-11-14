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
import { isActivePath, showsTabBar } from "../mobile-nav";
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
  const waiting = coachWaiting(attention);
  if (!showsTabBar(pathname)) return null;
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
    <MobileTabBar className="md:hidden print:hidden">
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
              data-kind="dot"
              aria-hidden="true"
              className="absolute top-1.75 left-[calc(50%+7px)] size-1.75 rounded-full bg-primary ring-2 ring-card"
            />
          ) : undefined
        }
      />
      {tab("/activities", <TabActivitiesIcon />, "Activités")}
      {tab("/health/fitness", <TabProgressIcon />, "Santé", ["/health"])}
    </MobileTabBar>
  );
}
