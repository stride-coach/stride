import {
  segmentCurrentClass,
  segmentGroupClass,
  segmentItemClass,
} from "@/components/stride/segment";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import {
  todayHref,
  todayModeLabels,
  todayModes,
  type TodayMode,
} from "../view-mode";

export function TodayModeSwitch({
  current,
  className,
}: {
  current: TodayMode;
  className?: string;
}) {
  return (
    <nav aria-label="Vue" className={cn(segmentGroupClass, className)}>
      {todayModes.map((mode) => (
        <Link
          key={mode}
          href={todayHref(mode)}
          aria-current={mode === current ? "page" : undefined}
          scroll={false}
          className={cn(
            segmentItemClass,
            mode === current && segmentCurrentClass,
          )}
        >
          {todayModeLabels[mode]}
        </Link>
      ))}
    </nav>
  );
}
