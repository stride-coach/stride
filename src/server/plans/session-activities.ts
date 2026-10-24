import "server-only";
import {
  byStartTime,
  mainActivity,
} from "@/features/plans/view/session-activities";
import { readActivityDetail } from "@/server/activities/activities";
import { readActivityFeeling } from "@/server/activities/feelings";
import type { OnboardingContext } from "@/server/onboarding/context";
import type { SessionMatch } from "./matches";

export function sessionActivityIds(
  matches: Pick<SessionMatch, "sessionKey" | "activityId">[],
  sessionKey: string,
) {
  return [
    ...new Set(
      matches.flatMap((match) =>
        match.sessionKey === sessionKey && match.activityId
          ? [match.activityId]
          : [],
      ),
    ),
  ];
}

export async function readSessionActivities(
  context: OnboardingContext,
  matches: SessionMatch[],
  sessionKey: string,
) {
  const details = await Promise.all(
    sessionActivityIds(matches, sessionKey).map((id) =>
      readActivityDetail(context, id).catch(() => null),
    ),
  );
  const reads = details
    .filter((detail) => detail !== null)
    .sort((first, second) => byStartTime(first.activity, second.activity));
  const main = mainActivity(reads.map((read) => read.activity));
  const feeling = main ? await readActivityFeeling(context, main.id) : null;
  return { reads, main, feeling };
}
