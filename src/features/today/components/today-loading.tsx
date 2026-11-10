"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { localToday } from "@/features/app-shell/shell";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { formatTodayDate } from "@/features/today/today";

const signals = ["Sommeil", "VFC", "FC repos", "Charge 7 j"];

export function TodayLoading() {
  const date = formatTodayDate(localToday(new Date()));
  return (
    <>
      <AppHeader title="Aujourd’hui" detail={date} />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <LoadingScope
          label="Chargement de la journée"
          className="flex w-full flex-col pb-18 md:pb-6 xl:flex-row xl:items-start"
        >
          <div className="flex min-w-0 flex-1 flex-col">
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
            <section className="flex flex-col">
              <p className="flex min-h-8 items-center border-b border-border bg-muted px-4 text-label font-medium text-secondary-foreground md:px-5">
                Cette semaine
              </p>
              <ul aria-hidden="true">
                {Array.from({ length: 7 }, (_, index) => (
                  <li
                    key={index}
                    className="flex min-h-row-touch items-center gap-3 border-b border-border px-4 sm:min-h-row md:px-5"
                  >
                    <Skeleton className="size-3.5 rounded-full" />
                    <Skeleton className="h-3 w-10" />
                    <Skeleton className="h-3 w-1/3" />
                    <Skeleton className="ml-auto h-3 w-12" />
                  </li>
                ))}
              </ul>
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
