import type { Metadata } from "next";
import { DataActivityStatus } from "@/features/data-activity/components/status";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { CoachContextSource } from "@/features/coach/components/coach-context";
import {
  BodySection,
  GoalSection,
  SessionSection,
  SessionStrip,
  WeekPlanSection,
  WeekSection,
} from "@/features/today/components/today-sections";
import { TodayQueue } from "@/features/today/components/today-queue";
import { requireAthlete } from "@/server/app/session";
import { loadToday } from "@/server/today/today";

export const metadata: Metadata = { title: "Aujourd’hui" };

export default async function TodayPage() {
  const context = await requireAthlete();
  const view = await loadToday(context, new Date());
  const count = view.session.kind === "session" ? view.session.count : 1;
  return (
    <>
      {view.session.kind === "session" && (
        <CoachContextSource
          context={{ kind: "session", id: view.session.panel.sessionKey }}
        />
      )}
      <AppHeader
        title="Aujourd’hui"
        detail={view.header.date}
        dataStatus={false}
      />
      <DataActivityStatus
        row
        className="h-8.5 w-full shrink-0 gap-2 border-b border-border px-4 md:hidden"
      />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-tab-bar-reserve md:pb-6 xl:flex-row xl:items-start">
          <h1 className="sr-only">{`Aujourd’hui, ${view.header.date}`}</h1>
          <div className="flex min-w-0 flex-1 flex-col">
            {view.week && (
              <div className="max-lg:hidden">
                <WeekPlanSection week={view.week} />
                <SessionStrip date={view.header.date} count={count} />
              </div>
            )}
            <SessionSection session={view.session} verdict={view.verdict} />
            {view.queue.length > 0 && (
              <div className="border-b border-border px-4 py-4.5 md:px-5 xl:hidden">
                <TodayQueue items={view.queue} />
              </div>
            )}
            <BodySection form={view.form} verdict={view.verdict} />
            {view.week && (
              <div className="lg:hidden">
                <WeekSection week={view.week} />
              </div>
            )}
          </div>
          <aside
            aria-label="Contexte du jour"
            className="flex flex-col xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
          >
            {view.queue.length > 0 && (
              <div className="border-b border-border px-4 py-4.5 max-xl:hidden md:px-5">
                <TodayQueue items={view.queue} />
              </div>
            )}
            <GoalSection
              goal={view.goal}
              load={view.load}
              recent={view.recent}
            />
          </aside>
        </main>
      </div>
    </>
  );
}
