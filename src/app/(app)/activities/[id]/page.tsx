import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActivitiesView } from "@/features/activities/components/activities-view";
import {
  parseActivityFilter,
  parseActivityLimit,
  parseActivitySearch,
} from "@/features/activities/activities";
import { localToday } from "@/features/app-shell/shell";
import { readActivity } from "@/server/activities/activities";
import { loadActivityList } from "@/server/activities/list";
import { loadActivityPanel } from "@/server/activities/panel";
import { requireAthlete } from "@/server/app/session";
import { loadPairChecks } from "@/server/gear/checks";
import { ActivityPanel } from "../_components/activity-panel";

export const metadata: Metadata = { title: "Activité · Activités" };

export default async function ActivityPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const filter = parseActivityFilter(query.filter);
  const limit = parseActivityLimit(query.limit);
  const context = await requireAthlete();
  const now = new Date();
  const today = localToday(now);
  const search = parseActivitySearch(query.q);
  const [activity, list] = await Promise.all([
    readActivity(context, id),
    loadActivityList(context, filter, limit, search, today),
    loadActivityPanel(context, id, now),
    loadPairChecks(context, id),
  ]);
  if (!activity) notFound();
  return (
    <ActivitiesView
      list={list}
      filter={filter}
      limit={limit}
      selected={activity}
      search={search}
      current
      today={today}
    >
      <ActivityPanel context={context} id={id} now={now} current />
    </ActivitiesView>
  );
}
