import "server-only";
import { cache } from "react";
import {
  activityColumns,
  activityRowSchema,
} from "@/features/activities/activities";
import {
  activityRail,
  railWindowStart,
  type ActivityRailView,
} from "@/features/activities/rail";
import { pairList, type PairListView } from "@/features/gear/view";
import { loadGear } from "@/server/gear/load";
import type { OnboardingContext } from "@/server/onboarding/context";

export type ActivityRail = ActivityRailView & {
  pairs: PairListView["active"];
};

export const loadActivityRail = cache(async function loadActivityRail(
  context: OnboardingContext,
  today: string,
): Promise<ActivityRail> {
  const [{ data, error }, gear] = await Promise.all([
    context.client
      .from("provider_activities")
      .select(activityColumns)
      .eq("user_id", context.userId)
      .gte("started_at", `${railWindowStart(today)}T00:00:00Z`)
      .order("started_at", { ascending: false })
      .limit(500),
    loadGear(context).catch(() => null),
  ]);
  if (error) throw new Error("Unable to read the activity rail");
  const activities = (data ?? []).map((row) => activityRowSchema.parse(row));
  return {
    ...activityRail(activities, today),
    pairs: gear ? pairList(gear.shoes, gear.today).active : [],
  };
});
