import { cn } from "@/lib/utils";
import type { HealthKpi, Tone } from "../health-view";

const toneDot: Record<Tone, string> = {
  success: "bg-primary",
  warning: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};

export function KpiStrip({ kpis }: { kpis: HealthKpi[] }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3.5 border-y border-border py-3.5 sm:grid-cols-3 lg:grid-cols-6">
      {kpis.map((kpi) => (
        <div key={kpi.key} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-label text-secondary-foreground">{kpi.label}</dt>
          <dd className="flex items-baseline gap-1">
            <span
              data-slot="metric"
              className="text-title font-semibold whitespace-nowrap tabular-nums"
            >
              {kpi.value}
            </span>
            {kpi.unit && (
              <span className="text-body text-secondary-foreground">
                {kpi.unit}
              </span>
            )}
          </dd>
          <dd className="flex items-center gap-1.5 text-label text-muted-foreground">
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                toneDot[kpi.tone],
              )}
            />
            {kpi.detail}
          </dd>
        </div>
      ))}
    </dl>
  );
}
