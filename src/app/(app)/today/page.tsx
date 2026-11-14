import type { Metadata } from "next";
import { EmptyState } from "@/components/stride/feedback";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { CoachContextSource } from "@/features/coach/components/coach-context";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  BodySection,
  GoalSection,
  SessionSection,
  WeekPlanSection,
  WeekSection,
} from "@/features/today/components/today-sections";
import { TodayModeSwitch } from "@/features/today/components/today-mode-switch";
import { TodayQueue } from "@/features/today/components/today-queue";
import { parseTodayMode } from "@/features/today/view-mode";
import { requireAthlete } from "@/server/app/session";
import { loadToday } from "@/server/today/today";

export const metadata: Metadata = { title: "Aujourd’hui" };

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const { mode, week: weekStart } = parseTodayMode(query);
  const { view, week } = await loadToday(context, new Date(), weekStart);
  const weekly = mode === "week";
  return (
    <>
      {view.session.kind === "session" && (
        <CoachContextSource
          context={{ kind: "session", id: view.session.panel.sessionKey }}
        />
      )}
      <AppHeader
        title="Aujourd’hui"
        detail={weekly && week ? week.detail : view.header.date}
        actions={<TodayModeSwitch current={mode} className="max-md:hidden" />}
      />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-tab-bar-reserve md:pb-6 xl:flex-row xl:items-start">
          <h1 className="sr-only">
            {weekly && week
              ? `Aujourd’hui, ${week.detail}`
              : `Aujourd’hui, ${view.header.date}`}
          </h1>
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-border px-4 py-3 md:hidden">
              <TodayModeSwitch current={mode} />
            </div>
            {weekly ? (
              week ? (
                <>
                  <WeekPlanSection week={week} />
                  <div className="max-lg:hidden">
                    <BodySection form={view.form} verdict={view.verdict} />
                  </div>
                </>
              ) : (
                <div className="px-4 py-4.5 md:px-5">
                  <EmptyState
                    title="Pas encore de semaine à afficher"
                    action={
                      <Button asChild variant="outline">
                        <Link href="/plan">Voir le plan</Link>
                      </Button>
                    }
                  >
                    Ta semaine apparaîtra ici dès que ton plan sera prêt.
                  </EmptyState>
                </div>
              )
            ) : (
              <>
                <SessionSection session={view.session} verdict={view.verdict} />
                {view.queue.length > 0 && (
                  <div className="border-b border-border px-4 py-4.5 md:px-5 xl:hidden">
                    <TodayQueue items={view.queue} />
                  </div>
                )}
                <BodySection form={view.form} verdict={view.verdict} />
                {view.week && <WeekSection week={view.week} />}
              </>
            )}
          </div>
          <aside
            aria-label="Contexte du jour"
            className="flex flex-col gap-6 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
          >
            {view.queue.length > 0 && (
              <div className="max-xl:hidden">
                <TodayQueue items={view.queue} />
              </div>
            )}
            <GoalSection goal={view.goal} />
          </aside>
        </main>
      </div>
    </>
  );
}
