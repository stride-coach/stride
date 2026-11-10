import type { Metadata } from "next";
import { ActivitiesView } from "@/features/activities/components/activities-view";
import {
  parseActivityFilter,
  parseActivityLimit,
  parseActivitySearch,
} from "@/features/activities/activities";
import { localToday } from "@/features/app-shell/shell";
import { loadActivityList } from "@/server/activities/list";
import { requireAthlete } from "@/server/app/session";

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
  const today = localToday(new Date());
  const search = parseActivitySearch(query.q);
  const list = await loadActivityList(context, filter, limit, search, today);
  return (
    <ActivitiesView
      list={list}
      filter={filter}
      limit={limit}
      search={search}
      today={today}
    />
  );
}
