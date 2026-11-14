import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import {
  segmentCurrentClass,
  segmentGroupClass,
  segmentItemClass,
} from "@/components/stride/segment";
import {
  recoveryHref,
  healthViewLabels,
  healthViews,
  type HealthView,
} from "../health";

export function ScaleSwitch({ current }: { current: HealthView }) {
  return (
    <nav aria-label="Échelle" className={segmentGroupClass}>
      {healthViews.map((view) => (
        <Link
          key={view}
          href={recoveryHref(view)}
          aria-current={view === current ? "page" : undefined}
          scroll={false}
          className={cn(
            segmentItemClass,
            view === current && segmentCurrentClass,
          )}
        >
          {healthViewLabels[view]}
        </Link>
      ))}
    </nav>
  );
}
