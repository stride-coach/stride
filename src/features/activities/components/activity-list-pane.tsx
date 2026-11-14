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
  plans,
  registerSnapshot = true,
}: ActivityListSnapshot & {
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
      plans,
    }),
    [
      activities,
      total,
      filter,
      limit,
      search,
      today,
      counts,
      weeks,
      pills,
      plans,
    ],
  );

  useEffect(() => {
    if (registerSnapshot) register?.(snapshot);
  }, [register, registerSnapshot, snapshot]);

  return (
    <>
      <ActivityListHeader filter={filter} search={search} counts={counts} />
      <DataCategoryScope
        categories={["activities"]}
        className="flex min-h-0 flex-1 flex-col"
      >
        <ListScrollRegion
          storageKey={`stride:activities:list:${filter}:${search}`}
          label="Liste des activités"
          className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain pb-tab-bar-reserve md:pb-0"
        >
          <ActivityList
            groups={groupActivities(activities, today)}
            filter={filter}
            limit={limit}
            search={search}
            weeks={weeks}
            pills={pills}
            plans={plans}
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
              <p className="flex items-center gap-1.75 px-4 pb-4 text-label text-muted-foreground md:px-5">
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
