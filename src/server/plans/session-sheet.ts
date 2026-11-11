import "server-only";
import { watchCopy, watchRowFor, watchState } from "@/features/garmin/watch";
import { loadWatchView } from "@/server/garmin/watch";
import type { OnboardingContext } from "@/server/onboarding/context";
import { loadArchivedPlanOverview, loadPlanOverview } from "./overview";
import { loadSessionPanel } from "./session-panel";

export async function loadSessionSheet(
  context: OnboardingContext,
  sessionKey: string,
  archivedPlanId: string | null = null,
) {
  if (archivedPlanId) {
    const [overview, panel] = await Promise.all([
      loadArchivedPlanOverview(context, archivedPlanId),
      loadSessionPanel(context, sessionKey, archivedPlanId),
    ]);
    return overview && panel
      ? { planId: overview.plan.planId, panel, watch: null }
      : null;
  }
  const [overview, panel] = await Promise.all([
    loadPlanOverview(context),
    loadSessionPanel(context, sessionKey),
  ]);
  if (!overview || !panel) return null;
  const { planId, state } = overview.plan;
  const session = state.sessions.find((item) => item.sessionKey === sessionKey);
  const view = await loadWatchView(context, overview.plan);
  const watchView =
    view.enabled && session
      ? watchState({
          session,
          today: overview.today,
          row: watchRowFor(view.rows, planId, session.sessionKey),
        })
      : null;
  const watch =
    watchView &&
    watchCopy(watchView, { pendingChange: panel.proposal !== null });
  return { planId, panel, watch };
}
