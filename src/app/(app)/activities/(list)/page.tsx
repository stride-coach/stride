import type { Metadata } from "next";
import { Suspense } from "react";
import { ActivitiesView } from "@/features/activities/components/activities-view";
import {
  parseActivityFilter,
  parseActivityLimit,
  parseActivitySearch,
} from "@/features/activities/activities";
import { localToday } from "@/features/app-shell/shell";
import { ActivityDetailLoading } from "@/features/data-activity/components/loading";
import { loadActivityList } from "@/server/activities/list";
import { requireAthlete } from "@/server/app/session";
import { ActivityPanel } from "../_components/activity-panel";

export const metadata: Metadata = { title: "Activités" };

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const filter = parseActivityFilter(query.filter);
  const limit = parseActivityLimit(query.limit);
  const context = await requireAthlete();
  const now = new Date();
  const today = localToday(now);
  const search = parseActivitySearch(query.q);
  const list = await loadActivityList(context, filter, limit, search, today);
  const first = list.activities[0] ?? null;
  return (
    <ActivitiesView
      list={list}
      filter={filter}
      limit={limit}
      selected={first}
      search={search}
      current={false}
      today={today}
    >
      {first && (
        <Suspense fallback={<ActivityDetailLoading />}>
          <ActivityPanel
            context={context}
            id={first.id}
            now={now}
            current={false}
          />
        </Suspense>
      )}
    </ActivitiesView>
  );
}
