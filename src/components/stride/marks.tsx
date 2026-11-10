import { CheckIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Trend = "improving" | "stable" | "watch" | "investigate";

export const trendLabels: Record<Trend, string> = {
  improving: "Improving",
  stable: "Stable",
  watch: "Watch",
  investigate: "Investigate",
};

export function TrendMark({
  trend,
  className,
}: {
  trend: Trend;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      data-trend={trend}
      className={cn("size-2.25 shrink-0", className)}
    >
      {trend === "improving" && (
        <path d="M6 2 10 8H2Z" className="fill-primary" />
      )}
      {trend === "stable" && (
        <rect
          x="2"
          y="5"
          width="8"
          height="2"
          className="fill-secondary-foreground"
        />
      )}
      {trend === "watch" && <path d="M6 10 10 4H2Z" className="fill-warning" />}
      {trend === "investigate" && (
        <circle
          cx="6"
          cy="6"
          r="4"
          className="fill-none stroke-destructive"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

export function TrendLabel({
  trend,
  children,
  className,
}: {
  trend: Trend;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      data-slot="trend-label"
      className={cn("inline-flex items-center gap-1.5 text-label", className)}
    >
      <TrendMark trend={trend} />
      <span>{children ?? trendLabels[trend]}</span>
    </span>
  );
}

export type Direction = "up" | "down" | "flat";

export function DirectionMark({
  direction,
  tone = "warning",
  className,
}: {
  direction: Direction;
  tone?: "warning" | "success" | "muted";
  className?: string;
}) {
  const fill = {
    warning: "fill-warning",
    success: "fill-primary",
    muted: "fill-secondary-foreground",
  }[tone];
  return (
    <svg
      viewBox="0 0 12 12"
      aria-hidden="true"
      className={cn("size-2.25 shrink-0", fill, className)}
    >
      {direction === "up" && <path d="M6 2 10 8H2Z" />}
      {direction === "down" && <path d="M6 10 10 4H2Z" />}
      {direction === "flat" && <rect x="2" y="5" width="8" height="2" />}
    </svg>
  );
}

export type Source = "manual" | "provider" | "estimate";

export function SourceMark({
  source,
  className,
}: {
  source: Source;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-source={source}
      className={cn(
        "inline-block shrink-0",
        source === "manual" && "size-1.5 rounded-full bg-foreground",
        source === "provider" && "size-1.5 rounded-full bg-data-2",
        source === "estimate" &&
          "size-1.5 rotate-45 border-[1.5px] border-primary",
        className,
      )}
    />
  );
}

export type DecisionStatus = "open" | "accepted" | "declined" | "automatic";

export const decisionLabels: Record<DecisionStatus, string> = {
  open: "Open",
  accepted: "Accepted",
  declined: "Declined",
  automatic: "Automatic",
};

export function DecisionMark({
  status,
  className,
}: {
  status: DecisionStatus;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      data-status={status}
      className={cn(
        "inline-block size-2.5 shrink-0 rounded-full",
        status === "open" && "border-[1.5px] border-warning",
        status === "accepted" && "bg-primary",
        status === "declined" && "bg-data-1",
        status === "automatic" &&
          "border border-dashed border-muted-foreground",
        className,
      )}
    />
  );
}

export function DoneMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid size-6.5 shrink-0 place-items-center rounded-full bg-accent text-primary",
        className,
      )}
    >
      <CheckIcon className="size-3" strokeWidth={3} />
    </span>
  );
}

export function PulseDot({
  tone = "accent",
  breathing = true,
  className,
}: {
  tone?:
    | "accent"
    | "warning"
    | "success"
    | "provider"
    | "danger"
    | "night"
    | "foreground";
  breathing?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-1.5 shrink-0 rounded-full",
        {
          accent: "bg-primary",
          warning: "bg-warning",
          success: "bg-primary",
          provider: "bg-data-2",
          danger: "bg-destructive",
          night: "bg-data-2",
          foreground: "bg-foreground",
        }[tone],
        breathing && "motion-safe:animate-breathe",
        className,
      )}
    />
  );
}
