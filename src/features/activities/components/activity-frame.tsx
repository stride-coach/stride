import { MobileHeaderActions } from "@/features/app-shell/components/mobile-header-actions";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  DataActivityStatus,
  DataActivityThread,
} from "@/features/data-activity/components/status";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  activityFilters,
  activityFilterLabels,
  type ActivityFilter,
} from "../activities";
import { ActivitySearch } from "./activity-search";
import { ActivityFilters, filterItemClass } from "./activity-list";

const tabClass =
  "inline-flex min-h-control-touch items-center rounded-full border px-3 whitespace-nowrap transition-colors duration-150 ease-stride md:min-h-header md:rounded-none md:border-0 md:border-b-2 md:px-0.5";

function ActivityTabs() {
  return (
    <nav
      aria-label="Activités et matériel"
      className="flex gap-1.5 md:gap-5 md:self-stretch"
    >
      <span
        aria-current="page"
        className={cn(
          tabClass,
          "border-control-border bg-muted font-medium text-foreground md:border-foreground md:bg-transparent",
        )}
      >
        Sorties
      </span>
      <Link
        href="/activities/gear"
        className={cn(
          tabClass,
          "border-border text-muted-foreground hover:text-foreground md:border-transparent",
        )}
      >
        Matériel
      </Link>
    </nav>
  );
}

export function ActivityListHeader({
  filter = "all",
  search = "",
  counts = null,
  loading = false,
}: {
  filter?: ActivityFilter;
  search?: string;
  counts?: Record<ActivityFilter, number> | null;
  loading?: boolean;
}) {
  return (
    <div className="relative flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3 md:flex-row md:flex-wrap md:items-center md:gap-x-5 md:gap-y-2 md:px-5 md:py-0">
      <div className="flex items-center gap-2 md:self-stretch">
        <h1 className="flex-1 text-body-lg font-semibold md:flex md:items-center md:text-body">
          Activités
        </h1>
        <DataActivityStatus compact className="shrink-0 md:hidden" />
        <MobileHeaderActions />
      </div>
      <ActivityTabs />
      <div className="flex flex-col gap-2 md:ml-auto md:flex-row md:items-center md:py-2">
        {loading ? (
          <>
            <Skeleton className="h-control-auto w-full rounded-lg md:w-56" />
            <div aria-hidden="true" className="flex">
              <div className="inline-flex gap-0.5 rounded-lg border border-border bg-card p-0.5">
                {activityFilters.slice(0, 4).map((item) => (
                  <span
                    key={item}
                    className={cn(filterItemClass, "text-muted-foreground")}
                  >
                    {activityFilterLabels[item]}
                  </span>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            <ActivitySearch filter={filter} search={search} />
            <ActivityFilters filter={filter} search={search} counts={counts} />
          </>
        )}
      </div>
      <DataActivityThread />
    </div>
  );
}

export function ActivityToolbar({
  href = "/activities",
  title,
}: {
  href?: string;
  title?: string;
}) {
  return (
    <AppHeader
      title="Activités"
      back={{ href, label: "Retour aux activités" }}
      breadcrumb={
        <nav
          aria-label="Fil d’Ariane"
          className="flex min-w-0 items-center gap-2 text-body"
        >
          <Link
            href={href}
            className="text-muted-foreground hover:text-foreground"
          >
            Activités
          </Link>
          {title && (
            <>
              <span aria-hidden="true" className="text-muted-foreground">
                ›
              </span>
              <span aria-current="page" className="truncate font-medium">
                {title}
              </span>
            </>
          )}
        </nav>
      }
    />
  );
}
