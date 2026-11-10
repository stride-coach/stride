import { DataCategoryScope } from "@/features/data-activity/components/status";
import {
  activitiesQuery,
  type ActivityFilter,
  type ActivityListView,
} from "@/features/activities/activities";
import { ActivityListPane } from "./activity-list-pane";
import { ActivityToolbar } from "./activity-frame";

export function ActivitiesView({
  list,
  filter,
  limit,
  search,
  today,
}: {
  list: ActivityListView;
  filter: ActivityFilter;
  limit: number;
  search: string;
  today: string;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ActivityListPane
        {...list}
        filter={filter}
        limit={limit}
        search={search}
        today={today}
      />
    </div>
  );
}

export function ActivityDetailView({
  filter,
  limit,
  search,
  title,
  children,
}: {
  filter: ActivityFilter;
  limit: number;
  search: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ActivityToolbar
        href={`/activities${activitiesQuery(filter, limit, search)}`}
        title={title}
      />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <DataCategoryScope categories={["activities"]}>
          {children}
        </DataCategoryScope>
      </div>
    </div>
  );
}
