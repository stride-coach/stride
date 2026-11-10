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
    <section className="flex flex-col gap-2 px-4 pt-3 md:contents">
      <h1 className="sr-only">Courses</h1>
      {subtitle && <div className="sr-only">{subtitle}</div>}
      <nav
        aria-label="Filtre des courses"
        className="flex gap-0.5 rounded-lg border border-border bg-card p-0.5 md:hidden"
      >
        {racesViews.map((item) => (
          <Link
            key={item}
            href={racesViewHref(item)}
            aria-current={item === view ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex min-h-control-touch flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground",
              item === view && "bg-muted font-medium text-foreground",
            )}
          >
            {racesViewLabels[item]}
            {item !== "all" && (
              <span className="font-normal text-muted-foreground tabular-nums">
                {counts?.[item]}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </section>
  );
}
