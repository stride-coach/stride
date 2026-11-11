import { cn } from "@/lib/utils";

export type Trend = "improving" | "stable" | "watch" | "investigate";

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
        source === "provider" && "size-1.5 rounded-full bg-muted-foreground",
        source === "manual" &&
          "size-1.5 rounded-full border-[1.5px] border-muted-foreground",
        source === "estimate" &&
          "size-1.5 rotate-45 border-[1.5px] border-muted-foreground",
        className,
      )}
    />
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
