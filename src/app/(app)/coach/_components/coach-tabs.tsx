"use client";

import { usePathname } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";

const coachTabs = [
  { href: "/coach", label: "Conversation" },
  { href: "/coach/team", label: "Le staff" },
] as const;

function useCurrentTab() {
  const pathname = usePathname();
  return pathname.startsWith("/coach/team") ? "/coach/team" : "/coach";
}

export function CoachHeaderNav() {
  const current = useCurrentTab();
  return (
    <div className="flex min-w-0 items-stretch gap-5 self-stretch">
      <span className="flex items-center font-semibold">Coach</span>
      <nav
        aria-label="Sections du Coach"
        className="flex min-w-0 items-stretch gap-5"
      >
        {coachTabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={tab.href === current ? "page" : undefined}
            className={cn(
              "flex items-center border-b-2 px-0.5 whitespace-nowrap transition-colors duration-150 ease-stride focus-visible:outline-offset-[-2px]",
              tab.href === current
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

export function CoachTabs({ className }: { className?: string }) {
  const current = useCurrentTab();
  return (
    <nav
      aria-label="Sections du Coach"
      className={cn("flex gap-1.5 overflow-x-auto md:hidden", className)}
    >
      {coachTabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.href === current ? "page" : undefined}
          className={cn(
            "inline-flex min-h-control-touch shrink-0 items-center rounded-full border px-3 whitespace-nowrap transition-colors duration-150 ease-stride",
            tab.href === current
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
