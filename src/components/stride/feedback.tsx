import { Status, type StatusLevel } from "@/components/stride/status";
import { cn } from "@/lib/utils";

export function FeedbackBanner({
  level,
  verdict,
  action,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  level: Exclude<StatusLevel, "ok">;
  verdict: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="feedback-banner"
      data-level={level}
      className={cn(
        "flex flex-col items-start gap-x-3 gap-y-2 rounded-xl border border-border bg-card px-3 py-2.5 sm:flex-row sm:items-center",
        className,
      )}
      {...props}
    >
      <Status level={level}>{verdict}</Status>
      <div className="min-w-0 text-secondary-foreground sm:flex-1">
        {children}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  action,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-start gap-1.5 rounded-xl border border-border p-4",
        className,
      )}
      {...props}
    >
      <p className="font-semibold">{title}</p>
      <p className="text-muted-foreground">{children}</p>
      {action && <div className="mt-1.5">{action}</div>}
    </div>
  );
}
