"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { localToday } from "@/features/app-shell/shell";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { formatTodayHeaderDate } from "@/features/today/today";

const signals = ["Sommeil", "VFC", "FC repos", "Charge 7 j"];

export function TodayLoading() {
  const date = formatTodayHeaderDate(localToday(new Date()));
  return (
    <>
      <AppHeader title="Aujourd’hui" detail={date} dataStatus={false} />
      <div
        aria-hidden="true"
        className="flex h-8.5 shrink-0 items-center gap-2 border-b border-border px-4 md:hidden"
      >
        <Skeleton className="size-1.5 rounded-full" />
        <Skeleton className="h-3 w-36" />
      </div>
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <LoadingScope
          label="Chargement de la journée"
          className="flex w-full flex-col pb-tab-bar-reserve md:pb-6 xl:flex-row xl:items-start"
        >
          <h1 className="sr-only">Aujourd’hui, {date}</h1>
          <div className="flex min-w-0 flex-1 flex-col">
            <div aria-hidden="true" className="max-lg:hidden">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4.5">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-3.5 w-44" />
                </div>
                <div className="flex gap-4.5">
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-20" />
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-5 w-52" />
                </div>
                <div className="flex items-start gap-2.5">
                  <Skeleton className="size-5.5 rounded-full" />
                  <div className="flex max-w-180 flex-1 flex-col gap-2">
                    <Skeleton className="h-3 w-11/12" />
                    <Skeleton className="h-3 w-3/5" />
                  </div>
                </div>
              </div>
              <ol className="grid grid-cols-7 gap-2 px-5 py-4">
                {Array.from({ length: 7 }, (_, index) => (
                  <li
                    key={index}
                    className="flex min-h-44 flex-col gap-2 rounded-lg border border-border bg-card p-3"
                  >
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3.5 w-4/5" />
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="mt-auto h-3 w-2/3" />
                  </li>
                ))}
              </ol>
              <p className="flex min-h-8 items-center border-y border-border bg-muted px-5 text-label font-medium text-secondary-foreground">
                Séance du jour
              </p>
            </div>
            <section
              aria-hidden="true"
              className="flex flex-col gap-3 border-b border-border px-4 py-4.5 md:px-5"
            >
              <Skeleton className="h-5 w-1/3" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-5.5 w-full" />
              <Skeleton className="h-control w-40" />
            </section>
            <section className="border-b border-border px-4 py-4.5 md:px-5">
              <div className="rounded-xl border border-border bg-muted px-1 pb-1">
                <p className="flex h-row items-center px-2.5 font-medium text-secondary-foreground">
                  Ton corps ce matin
                </p>
                <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3.5">
                  <Skeleton aria-hidden="true" className="h-5 w-2/3" />
                  <dl className="grid gap-x-6 sm:grid-cols-2">
                    {signals.map((label) => (
                      <div
                        key={label}
                        className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3.5 py-2.75"
                      >
                        <dt className="text-secondary-foreground">{label}</dt>
                        <dd
                          aria-hidden="true"
                          className="flex flex-col gap-1.5"
                        >
                          <Skeleton className="h-4 w-1/3" />
                          <Skeleton className="h-1 w-full" />
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            </section>
            <section className="flex flex-col lg:hidden">
              <p className="flex min-h-8 items-center border-b border-border bg-muted px-4 text-label font-medium text-secondary-foreground md:px-5">
                Cette semaine
              </p>
              <div
                aria-hidden="true"
                className="flex items-start gap-2.5 border-b border-border px-4 py-3 md:px-5"
              >
                <Skeleton className="size-5.5 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
              <ol
                aria-hidden="true"
                className="flex gap-2 overflow-hidden border-b border-border px-4 py-4 md:px-5"
              >
                {Array.from({ length: 7 }, (_, index) => (
                  <li
                    key={index}
                    className="flex min-h-44 w-34 shrink-0 flex-col gap-2 rounded-lg border border-border bg-card p-3"
                  >
                    <Skeleton className="h-3 w-12" />
                    <Skeleton className="h-3.5 w-4/5" />
                    <Skeleton className="h-5 w-14" />
                    <Skeleton className="mt-auto h-3 w-2/3" />
                  </li>
                ))}
              </ol>
            </section>
          </div>
          <aside className="flex flex-col gap-3 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border">
            <p className="text-label font-medium text-muted-foreground">
              Objectif
            </p>
            <Skeleton aria-hidden="true" className="h-5 w-2/3" />
            <Skeleton aria-hidden="true" className="h-4 w-1/2" />
          </aside>
        </LoadingScope>
      </div>
    </>
  );
}
