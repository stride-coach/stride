"use client";

import { useEffect, useMemo } from "react";
import { SourceMark } from "@/components/stride/marks";
import { DataCategoryScope } from "@/features/data-activity/components/status";
import { groupActivities } from "../activities";
import { ActivityListHeader } from "./activity-frame";
import { ActivityList, ActivityListFooter } from "./activity-list";
import {
  useRegisterActivityListSnapshot,
  type ActivityListSnapshot,
} from "./activity-list-snapshot";
import { ListScrollRegion } from "./list-scroll-region";

export function ActivityListPane({
  activities,
  total,
  filter,
  limit,
  search,
  today,
  counts,
  weeks,
  pills,
  selectedId,
  current,
  registerSnapshot = true,
}: ActivityListSnapshot & {
  selectedId: string | null;
  current: boolean;
  registerSnapshot?: boolean;
}) {
  const register = useRegisterActivityListSnapshot();
  const snapshot = useMemo(
    () => ({
      activities,
      total,
      filter,
      limit,
      search,
      today,
      counts,
      weeks,
      pills,
    }),
    [activities, total, filter, limit, search, today, counts, weeks, pills],
  );

  useEffect(() => {
    if (registerSnapshot) register?.(snapshot);
  }, [register, registerSnapshot, snapshot]);

  return (
    <>
      <ActivityListHeader
        current={current}
        filter={filter}
        search={search}
        counts={counts}
      />
      <DataCategoryScope
        categories={["activities"]}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ListScrollRegion
          storageKey={`stride:activities:list:${filter}:${search}`}
          label="Liste des activités"
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:[scrollbar-gutter:stable]"
        >
          <ActivityList
            groups={groupActivities(activities, today)}
            filter={filter}
            limit={limit}
            search={search}
            selectedId={selectedId}
            current={current}
            today={today}
            weeks={weeks}
            pills={pills}
          />
          {activities.length > 0 && (
            <>
              <ActivityListFooter
                filter={filter}
                limit={limit}
                search={search}
                shown={activities.length}
                total={total}
              />
              <p className="flex items-center gap-1.75 px-5 pb-4 text-label text-muted-foreground lg:px-3.5">
                <SourceMark source="provider" />
                Tout vient de Garmin
              </p>
            </>
          )}
        </ListScrollRegion>
      </DataCategoryScope>
    </>
  );
}
