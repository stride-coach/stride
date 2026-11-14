"use client";

import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";

export function MobileTabBar({
  className,
  label = "Navigation principale",
  ...props
}: React.ComponentProps<"nav"> & { label?: string }) {
  return (
    <div className={cn("contents", className)}>
      <div
        aria-hidden="true"
        data-slot="mobile-tab-bar-fade"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-26 bg-linear-to-t from-background from-22% to-transparent"
      />
      <nav
        aria-label={label}
        data-slot="mobile-tab-bar"
        className="absolute inset-x-3 bottom-tab-bar-offset z-20 flex h-tab-bar items-center gap-0.5 rounded-[30px] border border-control-border bg-card/84 px-1.5 text-micro font-medium shadow-float backdrop-blur-[18px] supports-[not(backdrop-filter:blur(1px))]:bg-card"
        {...props}
      />
    </div>
  );
}

function scrollToTop(from: HTMLElement) {
  const root = from.closest("[data-slot=sidebar-inset]") ?? document.body;
  const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "instant"
    : "smooth";
  for (const element of root.querySelectorAll<HTMLElement>("*"))
    if (element.scrollTop > 0) element.scrollTo({ top: 0, behavior });
}

export function MobileTab({
  href,
  icon,
  label,
  accessibleLabel,
  badge,
  isActive = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  accessibleLabel?: string;
  badge?: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={accessibleLabel}
      aria-current={isActive ? "page" : undefined}
      onClick={(event) => {
        if (
          !isActive ||
          window.location.pathname !== href ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        )
          return;
        event.preventDefault();
        scrollToTop(event.currentTarget);
      }}
      className={cn(
        "relative flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-0.75 rounded-3xl transition-colors duration-150 ease-stride active:bg-border active:text-foreground motion-reduce:transition-none [&_svg]:size-4.5",
        isActive ? "bg-muted text-foreground" : "text-muted-foreground",
      )}
    >
      {icon}
      <span className="max-w-full truncate px-0.5">{label}</span>
      {badge}
    </Link>
  );
}
