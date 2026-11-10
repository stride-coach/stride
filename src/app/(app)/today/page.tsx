import type { Metadata } from "next";
import { AppHeader } from "@/features/app-shell/components/app-header";
import {
  BodySection,
  GoalSection,
  SessionSection,
  WeekSection,
} from "@/features/today/components/today-sections";
import { TodayQueue } from "@/features/today/components/today-queue";
import { requireAthlete } from "@/server/app/session";
import { loadToday } from "@/server/today/today";

export const metadata: Metadata = { title: "Aujourd’hui" };

export default async function TodayPage() {
  const context = await requireAthlete();
  const { view } = await loadToday(context, new Date());
  return (
    <>
      <AppHeader title="Aujourd’hui" detail={view.header.date} />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-18 md:pb-6 xl:flex-row xl:items-start">
          <h1 className="sr-only">Aujourd’hui, {view.header.date}</h1>
          <div className="flex min-w-0 flex-1 flex-col">
            <SessionSection session={view.session} verdict={view.verdict} />
            {view.queue.length > 0 && (
              <div className="border-b border-border px-4 py-4.5 md:px-5 xl:hidden">
                <TodayQueue items={view.queue} />
              </div>
            )}
            <BodySection form={view.form} verdict={view.verdict} />
            {view.week && <WeekSection week={view.week} />}
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
