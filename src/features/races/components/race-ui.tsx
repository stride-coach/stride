import { cn } from "@/lib/utils";
import { MonoLabel } from "@/components/stride/mono-label";
import { StrideMark } from "@/components/stride/stride-mark";

export function RaceCard({
  className,
  ...props
}: React.ComponentProps<"section">) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col gap-4 rounded-2xl border border-border bg-card px-5 py-5 sm:px-6 sm:py-5.5",
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
    <MonoLabel asChild>
      <h2 className={cn("flex items-center gap-2", className)} {...props}>
        {coach && <StrideMark className="size-3.5" />}
        <span>{children}</span>
      </h2>
    </MonoLabel>
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
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span
        className={cn(
          "text-[1.625rem] leading-none font-semibold tracking-[-0.01em] tabular-nums",
          tone === "night" && "text-muted-foreground",
          tone === "accent" && "text-primary",
        )}
      >
        {value}
      </span>
      <span className="text-label text-muted-foreground">{label}</span>
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
        "inline-flex items-center gap-1.5 rounded-full px-2.25 py-0.75 text-label whitespace-nowrap",
        {
          neutral: "bg-muted text-foreground",
          outline: "border border-control-border text-secondary-foreground",
          accent: "bg-primary text-primary-foreground",
          success: "bg-card text-primary",
          warning: "bg-warning/10 text-warning",
          danger: "bg-destructive/10 text-destructive",
          provider: "bg-data-2/10 text-data-2",
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
        "flex flex-col items-start gap-2 rounded-xl border border-dashed border-control-border bg-background px-4 py-4",
        className,
      )}
    >
      <p className="text-body font-semibold">{title}</p>
      <p className="text-body text-muted-foreground">{children}</p>
      {action}
    </div>
  );
}
