import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  defaultPeriod,
  periodLabels,
  progressPeriods,
  type ProgressPeriod,
} from "@/features/progress/period";
import { cn } from "@/lib/utils";

export function PeriodNav({ period }: { period: ProgressPeriod }) {
  return (
    <nav
      aria-label="Période"
      className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.75 max-sm:w-full"
    >
      {progressPeriods.map((item) => (
        <Link
          key={item}
          href={
            item === defaultPeriod
              ? "/health/fitness"
              : `/health/fitness?period=${item}`
          }
          aria-current={item === period ? "page" : undefined}
          scroll={false}
          className={cn(
            "flex min-h-9 items-center justify-center rounded-md px-3.5 text-body whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring max-sm:min-h-10 max-sm:flex-1",
            item === period && "bg-muted font-semibold text-foreground",
          )}
        >
          {periodLabels[item]}
        </Link>
      ))}
    </nav>
  );
}
