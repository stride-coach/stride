import "server-only";
import { cache } from "react";
import {
  localToday,
  readinessBadge,
  shellAccount,
  shellAthlete,
  shellGoal,
  type ShellNavigation,
} from "@/features/app-shell/shell";
import { profileRowSchema, profileValues } from "@/features/onboarding/profile";
import { buildProgram, programNavigation } from "@/features/plans/view/program";
import { loadPlanOverview, programInput } from "@/server/plans/overview";
import { staffFacesOf } from "@/features/coach/staff";
import { countCoachAttention } from "@/server/coaching/managed/store";
import { countPlanProposals } from "@/server/plans/proposals";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readGoals } from "@/server/onboarding/goals";
import { athleteProfileColumns } from "@/server/onboarding/profile";
import { readNotificationFeed } from "@/server/notifications/feed";
import { reconcileGarminNotificationsAfterResponse } from "@/server/notifications/garmin";
import { requireAthlete, requireAthleteAccount } from "./session";

async function readTodayReadiness(context: OnboardingContext, now: Date) {
  const { data, error } = await context.client
    .from("provider_observations")
    .select("value_numeric")
    .eq("user_id", context.userId)
    .eq("metric", "training_readiness")
    .eq("observed_on", localToday(now))
    .in("availability", ["available", "partial"])
    .limit(1);
  if (error || !data?.[0]) return null;
  const value = Number(data[0].value_numeric);
  return data[0].value_numeric !== null && Number.isFinite(value)
    ? value
    : null;
}

export async function loadShellIdentity(context: OnboardingContext, now: Date) {
  const [profile, goals] = await Promise.all([
    context.client
      .from("athlete_profiles")
      .select(athleteProfileColumns)
      .eq("user_id", context.userId)
      .maybeSingle(),
    readGoals(context).catch(() => null),
  ]);
  const parsed = profileRowSchema.safeParse(profile.data);
  const values = profileValues(parsed.success ? parsed.data : null);
  return {
    athlete: shellAthlete(profile.data?.first_name ?? null, context.email),
    account: shellAccount(
      values,
      goals ? goals.goal.values.focus === null : false,
    ),
    goal: goals
      ? shellGoal(
          goals.races.map(({ values }) => ({
            name: values.name,
            priority: values.priority,
            raceDate: values.race_date,
          })),
          goals.goal.values.focus,
          localToday(now),
        )
      : null,
    staffFaces: staffFacesOf(profile.data),
  };
}

export async function loadShellNavigation(
  context: OnboardingContext,
  now: Date,
): Promise<ShellNavigation> {
  const [plan, planHistoryCount, coachAttention, readiness] = await Promise.all(
    [
      loadPlanOverview(context).catch(() => null),
      countPlanProposals(context).catch(() => null),
      countCoachAttention(context).catch(() => null),
      readTodayReadiness(context, now).catch(() => null),
    ],
  );
  return {
    planNav: plan ? programNavigation(buildProgram(programInput(plan))) : null,
    planHistoryCount,
    coachAttention,
    todayBadge: readinessBadge(readiness),
  };
}

export const getShellIdentity = cache(async () =>
  loadShellIdentity(await requireAthleteAccount(), new Date()),
);

export const getShellNavigation = cache(async () =>
  loadShellNavigation(await requireAthlete(), new Date()),
);

export const getShellNotifications = cache(async () => {
  const context = await requireAthleteAccount();
  reconcileGarminNotificationsAfterResponse(context);
  return readNotificationFeed(context, new Date()).catch(() => null);
});
