"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { usePathname, useSearchParams } from "next/navigation";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { recoveryPath } from "../health";

export const progressSections = [
  { href: "/health/fitness", label: "Forme" },
  { href: recoveryPath, label: "Récupération" },
  { href: "/health/records", label: "Records" },
] as const;

function useSection() {
  const pathname = usePathname();
  return (
    [...progressSections]
      .sort((a, b) => b.href.length - a.href.length)
      .find(
        (section) =>
          pathname === section.href || pathname.startsWith(`${section.href}/`),
      ) ?? progressSections[0]
  );
}

function useHref(href: string) {
  const period = useSearchParams().get("period");
  return period ? `${href}?period=${encodeURIComponent(period)}` : href;
}

function SectionLink({
  href,
  current,
  keepPeriod = true,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & {
  href: string;
  current: boolean;
  keepPeriod?: boolean;
}) {
  const withPeriod = useHref(href);
  return (
    <Link
      href={keepPeriod ? withPeriod : href}
      aria-current={current ? "page" : undefined}
      {...props}
    />
  );
}

const healthTabs = [
  ...progressSections,
  { href: "/health/nutrition", label: "Nutrition" },
] as const;

function useCurrentHref() {
  const pathname = usePathname();
  const section = useSection();
  return pathname === "/health/nutrition" ||
    pathname.startsWith("/health/nutrition/")
    ? "/health/nutrition"
    : section.href;
}

export function HealthHeaderNav() {
  const currentHref = useCurrentHref();
  return (
    <div className="flex min-w-0 items-stretch gap-5 self-stretch">
      <span className="flex items-center font-semibold">Santé</span>
      <nav
        aria-label="Sections de Santé"
        className="flex min-w-0 items-stretch gap-5"
      >
        {healthTabs.map((item) => (
          <SectionLink
            key={item.href}
            href={item.href}
            current={item.href === currentHref}
            keepPeriod={item.href !== "/health/nutrition"}
            className={cn(
              "flex items-center border-b-2 px-0.5 whitespace-nowrap transition-colors duration-150 ease-stride focus-visible:outline-offset-[-2px]",
              item.href === currentHref
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </SectionLink>
        ))}
      </nav>
    </div>
  );
}

export function HealthTabs() {
  const currentHref = useCurrentHref();
  return (
    <nav
      aria-label="Sections de Santé"
      className="flex gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5 md:hidden"
    >
      {healthTabs.map((item) => (
        <SectionLink
          key={item.href}
          href={item.href}
          current={item.href === currentHref}
          keepPeriod={item.href !== "/health/nutrition"}
          className={cn(
            "inline-flex min-h-control-touch shrink-0 items-center rounded-full border px-3 whitespace-nowrap transition-colors duration-150 ease-stride",
            item.href === currentHref
              ? "border-control-border bg-muted font-medium text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </SectionLink>
      ))}
    </nav>
  );
}

export function ProgressSidebarGroup() {
  const pathname = usePathname();
  const section = useSection();
  const onNutrition =
    pathname === "/health/nutrition" ||
    pathname.startsWith("/health/nutrition/");
  if (
    !onNutrition &&
    pathname !== "/health" &&
    !pathname.startsWith("/health/")
  )
    return null;
  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Santé</SidebarGroupLabel>
      <SidebarMenu>
        {healthTabs.map((item) => {
          const current = onNutrition
            ? item.href === "/health/nutrition"
            : item.href === section.href;
          return (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                size="sm"
                isActive={current}
                className="min-h-7.5 gap-2 text-body data-[active=true]:font-semibold"
              >
                <SectionLink
                  href={item.href}
                  current={current}
                  keepPeriod={item.href !== "/health/nutrition"}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "size-1 shrink-0 rounded-full",
                      current ? "bg-primary" : "bg-control-border",
                    )}
                  />
                  {item.label}
                </SectionLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
