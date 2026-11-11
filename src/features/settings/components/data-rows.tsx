import { Status } from "@/components/stride/status";
import {
  garminConnectionLabels,
  garminConnectionTone,
} from "@/features/data-activity/model";
import type { GarminConnectionStatus } from "@/features/garmin/connection";
import { cn } from "@/lib/utils";

export function DataSection({
  title,
  detail,
  id,
  className,
  children,
}: {
  title: string;
  detail?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      aria-labelledby={id}
      className={cn("flex min-w-0 flex-col", className)}
    >
      <div className="flex flex-col gap-0.5 border-b border-border pb-2.5">
        <h2 id={id} className="text-body-lg font-semibold">
          {title}
        </h2>
        {detail && (
          <p className="text-body text-secondary-foreground">{detail}</p>
        )}
      </div>
      {children}
    </section>
  );
}

export function DataRow({
  title,
  detail,
  action,
  className,
}: {
  title: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-row flex-wrap items-center gap-x-4 gap-y-2.5 border-b border-border py-3",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 basis-72 flex-col gap-0.5">
        <span className="font-medium">{title}</span>
        {detail && (
          <span className="text-label text-secondary-foreground">{detail}</span>
        )}
      </div>
      {action && (
        <div className="flex shrink-0 flex-wrap gap-2 max-md:w-full max-md:[&>*]:flex-1">
          {action}
        </div>
      )}
    </div>
  );
}

export function DataFigure({
  value,
  label,
  className,
  valueClassName,
}: {
  value: React.ReactNode;
  label: React.ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col-reverse gap-0.5", className)}>
      <dt className="text-label text-secondary-foreground">{label}</dt>
      <dd
        data-slot="metric"
        className={cn(
          "truncate text-title font-semibold tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </dd>
    </div>
  );
}

const toneLevels = {
  success: "ok",
  provider: "ok",
  warning: "watch",
  danger: "alert",
} as const;

export function GarminStatus({
  status,
  suffix,
  className,
}: {
  status: GarminConnectionStatus | null;
  suffix?: string;
  className?: string;
}) {
  return (
    <Status
      level={toneLevels[garminConnectionTone(status)]}
      className={cn("text-body", className)}
    >
      {status
        ? garminConnectionLabels[status]
        : "État de la connexion indisponible"}
      {status === "connected" && suffix && ` · ${suffix}`}
    </Status>
  );
}
