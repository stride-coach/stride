import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import { StrideMark } from "@/components/stride/stride-mark";

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
        "grid grid-cols-5 items-center border-t border-border bg-background px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] text-label tracking-normal",
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
  isActive = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex min-h-11 flex-col items-center justify-center gap-1 rounded-md transition-colors duration-150 ease-stride [&_svg]:size-5",
        isActive
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      {label}
    </Link>
  );
}

export function MobileAskAction({
  href,
  label = "Coach",
  isActive = false,
  badge,
}: {
  href: string;
  label?: string;
  isActive?: boolean;
  badge?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "relative -mt-4.5 grid size-13 place-items-center justify-self-center rounded-full bg-primary transition-colors duration-150 ease-stride hover:bg-primary/85",
        isActive &&
          "ring-[1.5px] ring-primary ring-offset-3 ring-offset-background",
      )}
    >
      <StrideMark
        className="size-5.5 stroke-primary-foreground"
        strokeWidth="2.2"
      />
      {badge}
    </Link>
  );
}
