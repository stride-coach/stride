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
          <div className="contents xl:flex xl:min-w-0 xl:flex-1 xl:flex-col">
            <SessionSection session={view.session} verdict={view.verdict} />
            <div className="max-xl:order-3">
              <BodySection form={view.form} verdict={view.verdict} />
            </div>
            {view.week && (
              <div className="max-xl:order-4">
                <WeekSection week={view.week} />
              </div>
            )}
          </div>
          <aside
            aria-label="Contexte du jour"
            className="contents xl:sticky xl:top-0 xl:flex xl:w-panel xl:shrink-0 xl:flex-col xl:gap-6 xl:self-stretch xl:border-l xl:border-border xl:px-5 xl:py-4.5"
          >
            {view.queue.length > 0 && (
              <div className="border-b border-border px-4 py-4.5 max-xl:order-2 md:px-5 xl:border-0 xl:p-0">
                <TodayQueue items={view.queue} />
              </div>
            )}
            <div className="px-4 py-4.5 max-xl:order-5 md:px-5 xl:p-0">
              <GoalSection goal={view.goal} />
            </div>
          </aside>
        </main>
      </div>
    </>
  );
}
