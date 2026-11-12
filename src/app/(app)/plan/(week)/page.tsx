import type { Metadata } from "next";
import { LockIcon } from "lucide-react";
import { Chip } from "@/components/stride/chip";
import { Button } from "@/components/ui/button";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { mondayOf } from "@/features/plans/model/dates";
import { proposalsByWeek } from "@/features/plans/review/proposal";
import {
  archivedProgram,
  buildProgram,
  seasonLink,
  type SeasonProgram,
} from "@/features/plans/view/program";
import { programText } from "@/features/plans/view/program-text";
import {
  archivedSeasonPlanId,
  isArchivedSeason,
  seasonFor,
} from "@/features/plans/view/seasons";
import { requireAthlete } from "@/server/app/session";
import {
  loadArchivedPlanOverview,
  loadArchivedSeasons,
  loadPlanOverview,
  programInput,
  type PlanOverview,
} from "@/server/plans/overview";
import { loadIntensityPaces } from "@/server/plans/paces";
import { loadProposalReview } from "@/server/plans/proposals";
import { loadSessionSheet } from "@/server/plans/session-sheet";
import { watchDayTags } from "@/features/garmin/watch";
import { loadWatchView } from "@/server/garmin/watch";
import { CopyProgramButton } from "../_components/copy-program";
import { PlanEmpty } from "../_components/plan-empty";
import { PlanFrame } from "../_components/plan-frame";
import { ProgramExplorer } from "../_components/program-explorer";
import { ProposalSheet } from "../_components/proposal-sheet";
import { SessionSheet } from "../_components/session-sheet";

export const metadata: Metadata = { title: "Plan" };

function CurrentSeasonLink({ href }: { href: string }) {
  return (
    <Button asChild variant="outline" size="md">
      <Link href={href} aria-label="Revenir à la saison en cours">
        <span className="max-md:hidden">Revenir à la saison en cours</span>
        <span className="md:hidden">Saison en cours</span>
      </Link>
    </Button>
  );
}

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const param = (name: string) => {
    const value = query[name];
    return typeof value === "string" ? value : null;
  };
  const archivedPlanId = archivedSeasonPlanId(param("season"));
  const proposalId =
    typeof query.proposal === "string" && !archivedPlanId
      ? query.proposal
      : null;
  const sessionKey =
    typeof query.session === "string" && !proposalId ? query.session : null;
  const [overview, archived, archivedSeasons, sheet, paces, review] =
    await Promise.all([
      loadPlanOverview(context),
      archivedPlanId ? loadArchivedPlanOverview(context, archivedPlanId) : null,
      archivedPlanId ? loadArchivedSeasons(context) : [],
      sessionKey ? loadSessionSheet(context, sessionKey, archivedPlanId) : null,
      loadIntensityPaces(context),
      proposalId ? loadProposalReview(context, proposalId) : null,
    ]);
  const seasons = overview
    ? buildProgram(programInput(overview, paces)).seasons
    : [];
  const archivedIndex = archivedSeasons.findIndex(
    (item) => item.id === param("season"),
  );
  if (archived && archivedIndex >= 0) {
    const season = archivedSeasons[archivedIndex];
    const newer = archivedSeasons[archivedIndex - 1];
    const program = archivedProgram(
      programInput(archived, paces),
      season,
      newer
        ? seasonLink(archivedSeasons, newer, archived.today)
        : (seasons[0]?.link ?? null),
    );
    const opened = archived.plan.state.sessions.find(
      (item) => item.sessionKey === sessionKey,
    );
    const requested =
      param("week") ?? (opened ? mondayOf(opened.scheduledOn) : null);
    return (
      <ArchivedSeasonPage
        overview={archived}
        program={program}
        replaced={season.replacedOn !== null}
        initialWeekKey={
          program.weeks.find((week) => week.weekStart === requested)?.weekKey ??
          null
        }
        current={seasons.find((item) => item.status === "current") ?? null}
        sheet={sheet}
        text={programText({
          state: archived.plan.state,
          version: archived.plan.version,
          summary: archived.plan.versionSummary,
          races: archived.races,
          today: archived.today,
          paces,
        })}
      />
    );
  }
  const reviewSheet = review && (
    <ProposalSheet key={review.id} review={review} />
  );
  if (!overview)
    return (
      <PlanFrame>
        <PlanEmpty />
        {reviewSheet}
      </PlanFrame>
    );
  const watch = await loadWatchView(context, overview.plan);
  const { planId, state } = overview.plan;
  const activeSheet = isArchivedSeason(param("season")) ? null : sheet;
  const session = state.sessions.find((item) => item.sessionKey === sessionKey);
  const program = seasonFor(seasons, {
    season: param("season"),
    race: param("race"),
    week: param("week"),
    session: session?.scheduledOn ?? null,
  });
  if (!program)
    return (
      <PlanFrame>
        <PlanEmpty />
        {reviewSheet}
      </PlanFrame>
    );
  const requested =
    param("week") ?? (session ? mondayOf(session.scheduledOn) : null);
  const current = seasons.find((item) => item.status === "current");
  const initialWeekKey =
    program.weeks.find((week) => week.weekStart === requested)?.weekKey ?? null;
  return (
    <PlanFrame className="max-w-none gap-0 px-0 pt-0 sm:gap-0 sm:px-0 md:pt-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 md:px-5">
        {program.status === "past" && (
          <Chip>
            <LockIcon aria-hidden="true" className="size-3" />
            Saison terminée · lecture seule
          </Chip>
        )}
        <div className="ml-auto flex min-w-0 flex-wrap justify-end gap-1.5">
          {current && current.id !== program.id && (
            <CurrentSeasonLink href={current.href} />
          )}
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
        </div>
      </div>
      <ProgramExplorer
        key={program.id}
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
      {activeSheet && (
        <SessionSheet
          key={activeSheet.panel.sessionKey}
          planId={activeSheet.planId}
          panel={activeSheet.panel}
          watch={activeSheet.watch}
        />
      )}
      {reviewSheet}
    </PlanFrame>
  );
}

function ArchivedSeasonPage({
  overview,
  program,
  replaced,
  initialWeekKey,
  current,
  sheet,
  text,
}: {
  overview: PlanOverview;
  program: SeasonProgram;
  replaced: boolean;
  initialWeekKey: string | null;
  current: SeasonProgram | null;
  sheet: Awaited<ReturnType<typeof loadSessionSheet>>;
  text: string;
}) {
  return (
    <PlanFrame className="max-w-none gap-0 px-0 pt-0 sm:gap-0 sm:px-0 md:pt-0">
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 md:px-5">
        <Chip>
          <LockIcon aria-hidden="true" className="size-3" />
          {replaced
            ? "Plan remplacé · lecture seule"
            : "Saison terminée · lecture seule"}
        </Chip>
        <div className="ml-auto flex min-w-0 flex-wrap justify-end gap-1.5">
          {current && <CurrentSeasonLink href={current.href} />}
          <CopyProgramButton text={text} />
        </div>
      </div>
      <ProgramExplorer
        key={program.id}
        program={program}
        initialWeekKey={initialWeekKey}
      />
      {sheet && (
        <SessionSheet
          key={sheet.panel.sessionKey}
          planId={overview.plan.planId}
          panel={sheet.panel}
        />
      )}
    </PlanFrame>
  );
}
