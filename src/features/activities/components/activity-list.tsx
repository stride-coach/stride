import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import { Metric } from "@/components/stride/metric";
import { MonoLabel } from "@/components/stride/mono-label";
import {
  activitiesQuery,
  activityFilterLabels,
  activityFilters,
  activityPageSize,
  activityTitle,
  formatActivityDate,
  listMetrics,
  maxActivityWindow,
  type ActivityFilter,
  type ActivityGroup,
  type ActivityWeekSummary,
} from "@/features/activities/activities";
import type { ActivityPill } from "@/features/activities/plan-status";
import { PlanPill } from "./plan-pill";

const emptyFilterMessages: Record<ActivityFilter, string> = {
  all: "Aucune activité importée pour l’instant.",
  road: "Aucune course à pied importée pour l’instant.",
  trail: "Aucune sortie trail importée pour l’instant.",
  strength: "Aucune séance de renfo importée pour l’instant.",
  cycling: "Aucune sortie vélo importée pour l’instant.",
  other: "Aucune autre activité importée pour l’instant.",
};

export const filterChipClass =
  "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control border px-2.75 text-xs whitespace-nowrap transition-colors duration-150 ease-stride lg:min-h-7.5";

export function ActivityFilters({
  filter,
  search,
  counts,
}: {
  filter: ActivityFilter;
  search: string;
  counts: Record<ActivityFilter, number> | null;
}) {
  return (
    <nav
      aria-label="Filtrer par sport"
      className="-mx-5 flex gap-1.25 overflow-x-auto px-5 lg:mx-0 lg:flex-wrap lg:px-0"
    >
      {activityFilters
        .filter(
          (item) =>
            item === "all" ||
            item === filter ||
            counts === null ||
            counts[item] > 0,
        )
        .map((item) => (
          <Link
            key={item}
            href={`/activities${activitiesQuery(item, activityPageSize, search)}`}
            aria-current={item === filter ? "page" : undefined}
            className={cn(
              filterChipClass,
              item === filter
                ? "border-border-strong bg-surface-raised text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {activityFilterLabels[item]}
            {counts && (
              <span className="text-[11px] text-muted-foreground tabular-nums">
                {counts[item]}
              </span>
            )}
          </Link>
        ))}
    </nav>
  );
}

function WeekHeader({
  label,
  summary,
}: {
  label: string;
  summary: ActivityWeekSummary | undefined;
}) {
  return (
    <h2 className="sticky top-0 z-1 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-2.5 gap-y-0.5 border-y border-border-subtle bg-surface-panel px-5 pt-3 pb-2.5 font-normal lg:px-3.5 lg:pt-2.5 lg:pb-2.25">
      <MonoLabel
        size="nano"
        tone="muted"
        className="text-[9.5px] whitespace-nowrap text-muted"
      >
        {label}
      </MonoLabel>
      {summary && summary.totals.length > 0 && (
        <span className="flex gap-2.5">
          {summary.totals.map((item) => (
            <Metric
              key={item.key}
              size="sm"
              className="text-sm"
              value={item.value}
              unit={
                item.unit && (
                  <span className="font-sans text-[11px] font-normal text-muted-foreground">
                    {item.unit}
                  </span>
                )
              }
            />
          ))}
        </span>
      )}
      {summary?.subline && (
        <span className="col-span-full text-[11.5px] text-muted-foreground">
          {summary.subline}
        </span>
      )}
    </h2>
  );
}

export function ActivityList({
  groups,
  filter,
  limit,
  search,
  selectedId,
  current,
  today,
  weeks,
  pills,
}: {
  weeks: Record<string, ActivityWeekSummary>;
  pills: Record<string, ActivityPill[]>;
  groups: ActivityGroup[];
  filter: ActivityFilter;
  limit: number;
  search: string;
  selectedId: string | null;
  current: boolean;
  today: string;
}) {
  if (groups.length === 0)
    return (
      <p className="px-5 py-6 text-meta text-muted lg:px-3.5">
        {search
          ? "Aucune activité ne correspond à ce nom."
          : filter === "all"
            ? "Aucune activité importée pour l’instant."
            : emptyFilterMessages[filter]}
      </p>
    );
  return (
    <div className="flex flex-col">
      {groups.map((group) => (
        <section key={group.weekStart} aria-label={group.label}>
          <WeekHeader label={group.label} summary={weeks[group.weekStart]} />
          <ul>
            {group.activities.map((activity) => {
              const selected = activity.id === selectedId;
              return (
                <li key={activity.id}>
                  <Link
                    href={`/activities/${activity.id}${activitiesQuery(filter, limit, search)}`}
                    prefetch={false}
                    aria-current={selected && current ? "true" : undefined}
                    onClick={
                      selected
                        ? (event) => {
                            if (
                              event.button !== 0 ||
                              event.metaKey ||
                              event.ctrlKey ||
                              event.shiftKey ||
                              event.altKey
                            )
                              return;
                            if (
                              current ||
                              window.matchMedia("(min-width: 64rem)").matches
                            )
                              event.preventDefault();
                          }
                        : undefined
                    }
                    className={cn(
                      "flex flex-col gap-1.75 border-b border-border-subtle px-5 py-3.5 transition-colors duration-150 ease-stride hover:bg-surface lg:px-3.5",
                      selected &&
                        (current
                          ? "bg-surface-raised shadow-[inset_2px_0_0_var(--color-accent)]"
                          : "lg:bg-surface-raised lg:shadow-[inset_2px_0_0_var(--color-accent)]"),
                    )}
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span
                        className={cn(
                          "min-w-0 truncate text-base text-foreground lg:text-sm",
                          selected ? "font-semibold" : "font-medium",
                        )}
                      >
                        {activityTitle(activity)}
                      </span>
                      <MonoLabel
                        size="nano"
                        asChild
                        tone={selected && current ? "foreground" : "muted"}
                        className="shrink-0"
                      >
                        <time dateTime={activity.date}>
                          {formatActivityDate(activity.date, today)}
                        </time>
                      </MonoLabel>
                    </span>
                    <span className="flex flex-wrap gap-x-3 gap-y-1 text-foreground">
                      {listMetrics(activity).map((metric) => (
                        <Metric
                          key={metric.key}
                          size="sm"
                          className="text-[17px] lg:text-body"
                          value={metric.value}
                          unit={metric.unit}
                          aria-label={`${metric.label} ${metric.value}${metric.unit ? ` ${metric.unit}` : ""}`}
                        />
                      ))}
                    </span>
                    {pills[activity.id] && (
                      <span className="flex flex-wrap gap-1.5">
                        {pills[activity.id].map((pill) => (
                          <PlanPill key={pill.label} pill={pill} />
                        ))}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function ActivityListFooter({
  filter,
  limit,
  search,
  shown,
  total,
}: {
  filter: ActivityFilter;
  limit: number;
  search: string;
  shown: number;
  total: number;
}) {
  const next = Math.min(limit + activityPageSize, maxActivityWindow);
  const more = shown < total && shown >= limit && next > limit;
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-4 lg:px-3.5">
      {more && (
        <Link
          href={`/activities${activitiesQuery(filter, next, search)}`}
          scroll={false}
          className="inline-flex min-h-11 items-center rounded-control border border-border-strong px-3.5 text-sm text-foreground transition-colors duration-150 ease-stride hover:bg-surface-raised lg:min-h-8 lg:text-xs"
        >
          Charger les suivantes
        </Link>
      )}
      <MonoLabel size="nano">
        {shown} sur {total} activités
      </MonoLabel>
    </div>
  );
}
