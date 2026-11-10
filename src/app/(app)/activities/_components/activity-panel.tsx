import { notFound } from "next/navigation";
import { ActivityDetail } from "@/features/activities/components/activity-detail";
import { activityKind } from "@/features/activities/activities";
import { localToday } from "@/features/app-shell/shell";
import {
  ActivityPairBlock,
  PairQuestionCard,
} from "@/features/gear/components/activity-pair";
import { activityPairView, pairQuestion } from "@/features/gear/check-view";
import { loadActivityPanel } from "@/server/activities/panel";
import { loadPairChecks } from "@/server/gear/checks";
import { reconcileGearNotificationsAfterResponse } from "@/server/notifications/garmin";
import type { OnboardingContext } from "@/server/onboarding/context";

export async function ActivityPanel({
  context,
  id,
  now,
}: {
  context: OnboardingContext;
  id: string;
  now: Date;
}) {
  const [panel, checks] = await Promise.all([
    loadActivityPanel(context, id, now),
    loadPairChecks(context, id),
  ]);
  if (!panel) notFound();
  reconcileGearNotificationsAfterResponse(context, checks);
  const running = activityKind(panel.activity.type) !== "other";
  const check = running ? (checks?.checks.get(id) ?? null) : null;
  const question = check && checks ? pairQuestion(check, checks.shoes) : null;
  return (
    <ActivityDetail
      panel={panel}
      today={localToday(now)}
      pair={
        check &&
        checks && (
          <>
            <ActivityPairBlock
              view={activityPairView(check, checks.shoes)}
              compact
            />
            {question && <PairQuestionCard question={question} />}
          </>
        )
      }
    />
  );
}
