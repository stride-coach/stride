import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  defaultPeriod,
  periodLabels,
  progressPeriods,
  type ProgressPeriod,
} from "@/features/progress/period";
import { cn } from "@/lib/utils";
import {
  segmentCurrentClass,
  segmentGroupClass,
  segmentItemClass,
} from "@/components/stride/segment";

export function PeriodNav({ period }: { period: ProgressPeriod }) {
  return (
    <nav aria-label="Période" className={segmentGroupClass}>
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
            segmentItemClass,
            item === period && segmentCurrentClass,
          )}
        >
          {periodLabels[item]}
        </Link>
      ))}
    </nav>
  );
}
