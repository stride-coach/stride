"use client";

import { usePathname } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";

const planTabs = [
  { href: "/plan", label: "Programme" },
  { href: "/plan/calendar", label: "Calendrier" },
  { href: "/plan/history", label: "Historique" },
] as const;

function useCurrentHref() {
  const pathname = usePathname();
  return (
    planTabs.find(
      (tab) =>
        tab.href !== "/plan" &&
        (pathname === tab.href || pathname.startsWith(`${tab.href}/`)),
    )?.href ?? "/plan"
  );
}

export function PlanHeaderNav() {
  const currentHref = useCurrentHref();
  return (
    <div className="flex min-w-0 items-stretch gap-5 self-stretch">
      <span className="flex items-center font-semibold">Plan</span>
      <nav
        aria-label="Sections du plan"
        className="flex min-w-0 items-stretch gap-5"
      >
        {planTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === currentHref ? "page" : undefined}
            className={cn(
              "flex items-center border-b-2 px-0.5 whitespace-nowrap transition-colors duration-150 ease-stride focus-visible:outline-offset-[-2px]",
              tab.href === currentHref
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function PlanTabs() {
  const currentHref = useCurrentHref();
  return (
    <nav
      aria-label="Sections du plan"
      className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5 md:hidden"
    >
      {planTabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === currentHref ? "page" : undefined}
          className={cn(
            "inline-flex min-h-control-touch shrink-0 items-center rounded-full border px-3 whitespace-nowrap transition-colors duration-150 ease-stride",
            tab.href === currentHref
              ? "border-control-border bg-muted font-medium text-foreground"
              : "border-border text-muted-foreground hover:text-foreground",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
