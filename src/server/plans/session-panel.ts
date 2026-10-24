import "server-only";
import { buildSessionPanel } from "@/features/plans/view/session-panel";
import type { OnboardingContext } from "@/server/onboarding/context";
import { sessionShoesView } from "@/features/gear/planned";
import { loadPlanShoes } from "@/server/gear/planned";
import { loadPlanOverview } from "./overview";
import { loadIntensityPaceRanges } from "./paces";
import { readSessionActivities } from "./session-activities";

export async function loadSessionPanel(
  context: OnboardingContext,
  sessionKey: string,
) {
  const [overview, paceRanges, shoes] = await Promise.all([
    loadPlanOverview(context),
    loadIntensityPaceRanges(context),
    loadPlanShoes(context),
  ]);
  if (!overview) return null;
  const { reads, feeling } = await readSessionActivities(
    context,
    overview.matches,
    sessionKey,
  );
  return buildSessionPanel({
    state: overview.plan.state,
    today: overview.today,
    sessionKey,
    matches: overview.matches,
    proposals: overview.proposals,
    activities: reads.map((read) => ({
      activity: read.activity,
      laps: read.segments.filter((segment) => segment.type === "lap"),
      series: read.track?.series ?? null,
    })),
    paceRanges,
    shoes: shoes ? sessionShoesView(shoes, sessionKey) : null,
    feeling,
  });
}
