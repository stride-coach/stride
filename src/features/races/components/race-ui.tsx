import { cn } from "@/lib/utils";
import { StrideMark } from "@/components/stride/stride-mark";

export function RaceCard({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-3.5 rounded-xl border border-border bg-card px-4 py-3.5",
        className,
      )}
      {...props}
    />
  );
}

export function CardLabel({
  coach = false,
  className,
  children,
  ...props
}: React.ComponentProps<"h2"> & { coach?: boolean }) {
  return (
    <h2
      className={cn(
        "flex items-center gap-2 text-body font-medium text-secondary-foreground",
        className,
      )}
      {...props}
    >
      {coach && <StrideMark className="size-3" />}
      <span>{children}</span>
    </h2>
  );
}

export function Figure({
  value,
  label,
  tone,
  className,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  tone?: "night" | "accent";
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
      <span
        data-slot="metric"
        className={cn(
          "text-title font-semibold tabular-nums",
          tone === "night" && "text-muted-foreground",
          tone === "accent" && "text-primary",
        )}
      >
        {value}
      </span>
      <span className="text-label text-secondary-foreground">{label}</span>
    </div>
  );
}

export function StatusPill({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?:
    | "neutral"
    | "outline"
    | "accent"
    | "success"
    | "warning"
    | "danger"
    | "provider";
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-label font-medium whitespace-nowrap",
        {
          neutral: "text-foreground",
          outline: "text-secondary-foreground",
          accent: "text-primary",
          success: "text-primary",
          warning: "text-warning",
          danger: "text-destructive",
          provider: "text-muted-foreground",
        }[tone],
        className,
      )}
    >
      {dot && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}

export function LegendItem({
  mark,
  children,
}: {
  mark: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 text-label text-secondary-foreground">
      {mark}
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  children,
  action,
  className,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-2 rounded-xl border border-border bg-card px-4 py-3.5",
        className,
      )}
    >
      <p className="text-body font-semibold">{title}</p>
      <p className="text-body text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}
