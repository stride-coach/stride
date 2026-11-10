import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import {
  recoveryHref,
  healthViewLabels,
  healthViews,
  type HealthView,
} from "../health";

export function ScaleSwitch({ current }: { current: HealthView }) {
  return (
    <nav
      aria-label="Échelle"
      className="flex w-fit gap-0.5 rounded-lg border border-border bg-card p-0.75 max-sm:w-full"
    >
      {healthViews.map((view) => (
        <Link
          key={view}
          href={recoveryHref(view)}
          aria-current={view === current ? "page" : undefined}
          scroll={false}
          className={cn(
            "flex min-h-9 items-center justify-center rounded-md px-3.5 text-body text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring max-sm:min-h-10 max-sm:flex-1",
            view === current && "bg-muted font-semibold text-foreground",
          )}
        >
          {healthViewLabels[view]}
        </Link>
      ))}
    </nav>
  );
}
