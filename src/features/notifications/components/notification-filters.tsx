import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import {
  filterHref,
  filterLabels,
  notificationFilters,
  type NotificationFilter,
} from "../model";

const chip =
  "flex min-h-control-touch shrink-0 items-center rounded-md px-2.5 whitespace-nowrap transition-colors duration-150 ease-stride md:min-h-6";
const selected = "bg-muted font-medium text-foreground";
const idle = "text-muted-foreground hover:text-foreground";

function label(filter: NotificationFilter, todo: number) {
  return filter === "todo" && todo > 0
    ? `${filterLabels[filter]} · ${todo}`
    : filterLabels[filter];
}

export function NotificationFilters({
  current,
  todo,
  onSelect,
  className,
}: {
  current: NotificationFilter;
  todo: number;
  onSelect?: (filter: NotificationFilter) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Filtrer les notifications"
      className={cn(
        "flex w-fit max-w-full shrink-0 [scrollbar-width:none] gap-0.5 overflow-x-auto rounded-lg border border-border bg-card p-0.5",
        className,
      )}
    >
      {notificationFilters.map((filter) =>
        onSelect ? (
          <button
            key={filter}
            type="button"
            aria-pressed={filter === current}
            onClick={() => onSelect(filter)}
            className={cn(chip, filter === current ? selected : idle)}
          >
            {label(filter, todo)}
          </button>
        ) : (
          <Link
            key={filter}
            href={filterHref(filter)}
            aria-current={filter === current ? "page" : undefined}
            className={cn(chip, filter === current ? selected : idle)}
          >
            {label(filter, todo)}
          </Link>
        ),
      )}
    </div>
  );
}
