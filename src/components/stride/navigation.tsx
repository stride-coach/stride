import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import {
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { PulseDot } from "@/components/stride/marks";

const valueTones = {
  muted: "text-muted-foreground",
  success: "text-primary",
  warning: "text-warning",
  danger: "text-destructive",
} as const;

export function NavBadge({
  kind,
  tone = "muted",
  className,
  children,
}: {
  kind: "value" | "count";
  tone?: "muted" | "success" | "warning" | "danger";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <SidebarMenuBadge
      data-kind={kind}
      className={cn(
        kind === "value" && "text-body font-semibold tabular-nums",
        kind === "value" && valueTones[tone],
        kind === "count" &&
          "right-2 h-4.5 min-w-4.5 rounded-full bg-warning px-1 text-label font-semibold tracking-normal text-background",
        className,
      )}
    >
      {children}
    </SidebarMenuBadge>
  );
}

export function NavItem({
  href,
  icon,
  label,
  isActive = false,
  badge,
  attention = false,
  children,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: React.ReactNode;
  attention?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={label}
        className="relative [&>svg]:text-muted-foreground data-[active=true]:[&>svg]:text-primary"
      >
        <Link href={href} aria-current={isActive ? "page" : undefined}>
          {icon}
          <span>{label}</span>
          {attention && (
            <PulseDot
              tone="warning"
              breathing={false}
              className="absolute top-1.5 right-1.5 hidden group-data-[collapsible=icon]:block"
            />
          )}
        </Link>
      </SidebarMenuButton>
      {badge}
      {children}
    </SidebarMenuItem>
  );
}
