import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import { Chip } from "@/components/stride/chip";
import { MonoLabel } from "@/components/stride/mono-label";
import { MissingValue } from "@/components/stride/session-row";
import {
  activitiesQuery,
  activityFilterLabels,
  activityFilters,
  activityKind,
  activityPageSize,
  activityTitle,
  formatDistance,
  formatPace,
  maxActivityWindow,
  type Activity,
  type ActivityFilter,
  type ActivityGroup,
  type ActivityWeekSummary,
} from "@/features/activities/activities";
import type {
  ActivityPill,
  ActivityPlanCell,
} from "@/features/activities/plan-status";
import { formatDayLabel, formatDuration } from "@/features/plans/view/format";

const emptyFilterMessages: Record<ActivityFilter, string> = {
  all: "Aucune activité importée pour l’instant.",
  road: "Aucune course à pied importée pour l’instant.",
  trail: "Aucune sortie trail importée pour l’instant.",
  strength: "Aucune séance de renfo importée pour l’instant.",
  cycling: "Aucune sortie vélo importée pour l’instant.",
  other: "Aucune autre activité importée pour l’instant.",
};

const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export const filterItemClass =
  "inline-flex min-h-control-touch shrink-0 items-center rounded-sm px-2.5 whitespace-nowrap transition-colors duration-150 ease-stride md:min-h-6";

const rowColumns =
  "md:grid-cols-[14px_52px_minmax(0,1fr)_104px_56px_64px_64px_44px_36px_72px]";

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
      className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0"
    >
      <div className="inline-flex gap-0.5 rounded-md border border-border bg-card p-0.5">
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
                filterItemClass,
                item === filter
                  ? "bg-muted font-medium text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {activityFilterLabels[item]}
            </Link>
          ))}
      </div>
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
  const totals = summary?.totals
    .map((item) => (item.unit ? `${item.value} ${item.unit}` : item.value))
    .join(" · ");
  return (
    <h2 className="sticky top-0 z-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-b border-border bg-muted px-4 py-2 text-label font-normal md:px-5">
      <span className="font-medium text-foreground">{label}</span>
      {summary?.subline && (
        <span className="text-secondary-foreground">{summary.subline}</span>
      )}
      {totals && (
        <span className="ml-auto text-secondary-foreground tabular-nums">
          {totals}
        </span>
      )}
    </h2>
  );
}

function ListHead() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid items-center gap-3 border-b border-border px-4 py-2 text-label text-muted-foreground max-md:hidden md:px-5",
        rowColumns,
      )}
    >
      <span />
      <span>Date</span>
      <span>Activité</span>
      <span>Type</span>
      <span className="text-right">Durée</span>
      <span className="text-right">Distance</span>
      <span className="text-right">Dénivelé</span>
      <span className="text-right">Allure</span>
      <span className="text-right">FC</span>
      <span className="text-right">Conformité</span>
    </div>
  );
}

function PlanStatus({
  pill,
  plan,
}: {
  pill: ActivityPill | undefined;
  plan: ActivityPlanCell | undefined;
}) {
  if (!pill) return null;
  if (pill.tone === "off")
    return <span className="text-secondary-foreground">{pill.label}</span>;
  if (plan?.compliance !== null && plan?.compliance !== undefined)
    return (
      <span
        className={cn(
          "font-medium tabular-nums",
          pill.tone === "warning" ? "text-warning" : "text-primary",
        )}
      >
        {plan.compliance} %<span className="sr-only"> · {pill.label}</span>
      </span>
    );
  return (
    <span
      className={cn(
        "truncate",
        pill.tone === "warning" ? "text-warning" : "text-primary",
      )}
    >
      {pill.label}
    </span>
  );
}

function ActivityRow({
  activity,
  href,
  pills,
  plan,
}: {
  activity: Activity;
  href: string;
  pills: ActivityPill[];
  plan: ActivityPlanCell | undefined;
}) {
  const status = pills.find((pill) => pill.tone !== "todo");
  const todo = pills.find((pill) => pill.tone === "todo");
  const planned = status !== undefined && status.tone !== "off";
  const running = activityKind(activity.type) !== "other";
  const duration = activity.durationSeconds
    ? formatDuration(activity.durationSeconds)
    : null;
  const distance = activity.distanceMeters
    ? `${formatDistance(activity.distanceMeters)} km`
    : null;
  const pace =
    running &&
    activity.distanceMeters &&
    activity.distanceMeters >= 100 &&
    activity.durationSeconds
      ? formatPace(activity.distanceMeters, activity.durationSeconds)
      : null;
  const elevation =
    activity.elevationGainMeters && activity.elevationGainMeters >= 1
      ? `+${integer.format(activity.elevationGainMeters)} m`
      : null;
  const heartRate = activity.averageHeartRate
    ? integer.format(activity.averageHeartRate)
    : null;
  const intensity = plan?.intensity ?? null;
  const day = formatDayLabel(activity.date);
  const summary = [
    day,
    intensity?.label,
    distance,
    pace && `${pace} /km`,
  ].filter(Boolean);
  return (
    <li className="border-b border-border">
      <Link
        href={href}
        prefetch={false}
        className={cn(
          "grid min-h-row-touch grid-cols-[14px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 transition-colors duration-150 ease-stride hover:bg-muted focus-visible:outline-offset-[-2px] md:min-h-row md:px-5 md:py-0",
          rowColumns,
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-3.5 shrink-0 rounded-full border-[1.5px]",
            planned ? "border-primary bg-primary" : "border-muted-foreground",
          )}
        />
        <span className="flex min-w-0 flex-col gap-0.5 md:contents">
          <time
            dateTime={activity.date}
            className="text-muted-foreground tabular-nums max-md:hidden"
          >
            {day}
          </time>
          <span className="flex min-w-0 items-baseline gap-2">
            <span className="min-w-0 truncate font-medium text-foreground">
              {activityTitle(activity)}
            </span>
            {todo && (
              <span className="shrink-0 text-label text-primary">
                {todo.label}
              </span>
            )}
          </span>
          <span className="truncate text-label text-muted-foreground tabular-nums md:hidden">
            {summary.join(" · ")}
          </span>
          <span className="max-md:hidden">
            {intensity && (
              <Chip intensity={intensity.level ?? undefined}>
                {intensity.label}
              </Chip>
            )}
          </span>
        </span>
        <span className="flex flex-col items-end gap-0.5 md:contents">
          <span
            data-slot="metric"
            className="text-right font-medium tabular-nums max-md:text-body-lg"
          >
            <span className="sr-only">Durée </span>
            <MissingValue value={duration} />
          </span>
          <span
            data-slot="metric"
            className="text-right tabular-nums max-md:hidden"
          >
            <span className="sr-only">Distance </span>
            <MissingValue value={distance} />
          </span>
          <span className="text-right text-secondary-foreground tabular-nums max-md:hidden">
            {elevation && (
              <>
                <span className="sr-only">Dénivelé </span>
                {elevation}
              </>
            )}
          </span>
          <span
            data-slot="metric"
            className="text-right tabular-nums max-md:hidden"
          >
            <span className="sr-only">Allure </span>
            <MissingValue value={pace} />
          </span>
          <span className="text-right text-secondary-foreground tabular-nums max-md:hidden">
            <span className="sr-only">FC moyenne </span>
            <MissingValue value={heartRate} />
          </span>
          <span className="text-right text-label md:text-body">
            <PlanStatus pill={status} plan={plan} />
          </span>
        </span>
      </Link>
    </li>
  );
}

export function ActivityList({
  groups,
  filter,
  limit,
  search,
  weeks,
  pills,
  plans,
}: {
  weeks: Record<string, ActivityWeekSummary>;
  pills: Record<string, ActivityPill[]>;
  plans: Record<string, ActivityPlanCell>;
  groups: ActivityGroup[];
  filter: ActivityFilter;
  limit: number;
  search: string;
}) {
  if (groups.length === 0)
    return (
      <p className="px-4 py-6 text-body text-secondary-foreground md:px-5">
        {search
          ? "Aucune activité ne correspond à ce nom."
          : filter === "all"
            ? "Aucune activité importée pour l’instant."
            : emptyFilterMessages[filter]}
      </p>
    );
  return (
    <div className="flex flex-col">
      <ListHead />
      {groups.map((group) => (
        <section key={group.weekStart} aria-label={group.label}>
          <WeekHeader label={group.label} summary={weeks[group.weekStart]} />
          <ul>
            {group.activities.map((activity) => (
              <ActivityRow
                key={activity.id}
                activity={activity}
                href={`/activities/${activity.id}${activitiesQuery(filter, limit, search)}`}
                pills={pills[activity.id] ?? []}
                plan={plans[activity.id]}
              />
            ))}
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
    <div className="flex flex-col items-center gap-2 px-4 py-4 md:px-5">
      {more && (
        <Link
          href={`/activities${activitiesQuery(filter, next, search)}`}
          scroll={false}
          className="inline-flex h-control-auto items-center rounded-md border border-control-border px-3 text-body text-foreground transition-colors duration-150 ease-stride hover:bg-muted"
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
