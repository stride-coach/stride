import type { Metadata } from "next";
import { HistoryIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { mondayOf } from "@/features/plans/model/dates";
import { proposalsByWeek } from "@/features/plans/review/proposal";
import { buildProgram } from "@/features/plans/view/program";
import { programText } from "@/features/plans/view/program-text";
import { requireAthlete } from "@/server/app/session";
import { loadPlanOverview, programInput } from "@/server/plans/overview";
import { loadIntensityPaces } from "@/server/plans/paces";
import { loadProposalReview } from "@/server/plans/proposals";
import { loadSessionSheet } from "@/server/plans/session-sheet";
import { watchDayTags } from "@/features/garmin/watch";
import { loadWatchView } from "@/server/garmin/watch";
import { CopyProgramButton } from "../_components/copy-program";
import { PlanEmpty } from "../_components/plan-empty";
import { PlanFrame } from "../_components/plan-frame";
import { ProgramExplorer } from "../_components/program-explorer";
import { ProgramTabs } from "../_components/program-hero";
import { ProposalSheet } from "../_components/proposal-sheet";
import { SessionSheet } from "../_components/session-sheet";

export const metadata: Metadata = { title: "Plan" };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const proposalId = typeof query.proposal === "string" ? query.proposal : null;
  const sessionKey =
    typeof query.session === "string" && !proposalId ? query.session : null;
  const [overview, sheet, paces, review] = await Promise.all([
    loadPlanOverview(context),
    sessionKey ? loadSessionSheet(context, sessionKey) : null,
    loadIntensityPaces(context),
    proposalId ? loadProposalReview(context, proposalId) : null,
  ]);
  const reviewSheet = review && (
    <ProposalSheet key={review.id} review={review} />
  );
  if (!overview)
    return (
      <PlanFrame crumbs={[{ label: "Plan" }]}>
        <PlanEmpty />
        {reviewSheet}
      </PlanFrame>
    );
  const watch = await loadWatchView(context, overview.plan);
  const { planId, state } = overview.plan;
  const { programs } = buildProgram(programInput(overview, paces));
  const race = typeof query.race === "string" ? query.race : null;
  const program =
    programs.find((item) => race !== null && item.raceId === race) ??
    programs[0];
  const session = state.sessions.find((item) => item.sessionKey === sessionKey);
  const requested =
    typeof query.week === "string"
      ? query.week
      : session
        ? mondayOf(session.scheduledOn)
        : null;
  const initialWeekKey =
    program.weeks.find((week) => week.weekStart === requested)?.weekKey ?? null;
  return (
    <PlanFrame
      crumbs={[
        { label: "Plan", href: "/plan" },
        { label: "Programme complet" },
      ]}
      className="max-w-none gap-0 px-0 pt-0 sm:gap-0 sm:px-0 md:pt-0"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 md:px-5">
        <ProgramTabs programs={programs} active={program} />
        <div className="ml-auto flex shrink-0 gap-1.5">
          <CopyProgramButton
            text={programText({
              state: overview.plan.state,
              version: overview.plan.version,
              summary: overview.plan.versionSummary,
              races: overview.races,
              today: overview.today,
              paces,
            })}
          />
          <Button asChild variant="outline" size="md">
            <Link href="/plan/history">
              <HistoryIcon aria-hidden="true" />
              Historique
            </Link>
          </Button>
        </div>
      </div>
      <ProgramExplorer
        key={program.raceId ?? "plan"}
        program={program}
        initialWeekKey={initialWeekKey}
        proposals={proposalsByWeek(state, overview.proposals)}
        watchTags={watchDayTags({
          enabled: watch.enabled,
          rows: watch.rows,
          planId,
          sessions: state.sessions,
          today: overview.today,
        })}
      />
      {sheet && (
        <SessionSheet
          key={sheet.panel.sessionKey}
          planId={sheet.planId}
          panel={sheet.panel}
          watch={sheet.watch}
        />
      )}
      {reviewSheet}
    </PlanFrame>
  );
}
