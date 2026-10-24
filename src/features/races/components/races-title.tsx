import { cn } from "@/lib/utils";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  racesViewHref,
  racesViewLabels,
  racesViews,
  type RacesView,
} from "../overview";

export function RacesTitle({
  view,
  counts,
  subtitle,
}: {
  view: RacesView;
  counts?: { upcoming: number; past: number };
  subtitle?: React.ReactNode;
}) {
  return (
    <section className="flex flex-col">
      <div className="flex items-end gap-4">
        <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.025em] max-md:sr-only">
          Courses
        </h1>
        {subtitle && (
          <div className="pb-1.5 text-sm text-muted-foreground max-md:hidden">
            {subtitle}
          </div>
        )}
      </div>
      <nav
        aria-label="Filtre des courses"
        className="flex gap-0.5 rounded-surface border border-border bg-surface p-0.75 md:hidden"
      >
        {racesViews.map((item) => (
          <Link
            key={item}
            href={racesViewHref(item)}
            aria-current={item === view ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-control px-3 text-meta text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              item === view && "bg-border font-semibold text-foreground",
            )}
          >
            {racesViewLabels[item]}
            {item !== "all" && (
              <span className="min-w-[2ch] font-normal text-muted-foreground tabular-nums">
                {counts?.[item]}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </section>
  );
}
