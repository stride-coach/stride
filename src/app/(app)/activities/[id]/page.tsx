import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";
import { ActivityDetailView } from "@/features/activities/components/activities-view";
import {
  activityTitle,
  parseActivityFilter,
  parseActivityLimit,
  parseActivitySearch,
} from "@/features/activities/activities";
import { readActivity } from "@/server/activities/activities";
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
  const context = await requireAthlete();
  const now = new Date();
  const [activity] = await Promise.all([
    readActivity(context, id),
    loadActivityPanel(context, id, now),
    loadPairChecks(context, id),
  ]);
  if (!activity) notFound();
  return (
    <ActivityDetailView
      filter={parseActivityFilter(query.filter)}
      limit={parseActivityLimit(query.limit)}
      search={parseActivitySearch(query.q)}
      title={activityTitle(activity)}
    >
      <ActivityPanel context={context} id={id} now={now} />
    </ActivityDetailView>
  );
}
