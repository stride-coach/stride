import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";

export function MobileTabBar({
  className,
  label = "Navigation principale",
  ...props
}: React.ComponentProps<"nav"> & { label?: string }) {
  return (
    <nav
      aria-label={label}
      data-slot="mobile-tab-bar"
      className={cn(
        "grid h-[calc(62px+env(safe-area-inset-bottom))] grid-cols-5 items-start border-t border-border bg-background pt-2 pb-[env(safe-area-inset-bottom)] text-micro font-medium",
        className,
      )}
      {...props}
    />
  );
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
      className={cn(
        "relative flex min-h-11 flex-col items-center justify-center gap-0.75 rounded-md transition-colors duration-150 ease-stride [&_svg]:size-4.5",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
      {badge}
    </Link>
  );
}
