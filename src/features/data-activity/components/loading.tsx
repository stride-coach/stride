"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { parseRacesView } from "@/features/races/overview";
import { RacesTitle } from "@/features/races/components/races-title";
import { MonoLabel } from "@/components/stride/mono-label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivityListHeader,
  ActivitySplitFrame,
  ActivityToolbar,
} from "@/features/activities/components/activity-frame";
import {
  activitiesQuery,
  parseActivityFilter,
  parseActivityLimit,
  parseActivitySearch,
} from "@/features/activities/activities";
import { ActivityListPane } from "@/features/activities/components/activity-list-pane";
import { useActivityListSnapshot } from "@/features/activities/components/activity-list-snapshot";
import { useDataActivity } from "./provider";

export function LoadingScope({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  const markSkeleton = useDataActivity()?.markSkeleton;
  useEffect(() => markSkeleton?.(), [markSkeleton]);
  return (
    <div role="status" aria-label={label} className={className}>
      {children}
      <span className="sr-only">{label}</span>
    </div>
  );
}

function ActivityRowsLoading() {
  return (
    <div
      aria-hidden="true"
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain lg:[scrollbar-gutter:stable]"
    >
      <div className="border-b border-border px-5 pt-2.5 pb-1 lg:px-3.5">
        <Skeleton className="h-3 w-20" />
      </div>
      {Array.from({ length: 12 }, (_, item) => (
        <div
          key={item}
          className="flex flex-col gap-1.5 border-b border-border px-5 py-3 lg:px-3.5"
        >
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-5 w-36 lg:h-4" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityContentLoading() {
  return (
    <div
      aria-hidden="true"
      className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain"
    >
      <article className="flex w-full max-w-240 flex-col gap-6 px-5 pt-8 pb-12 lg:px-10 2xl:mx-auto 2xl:max-w-360">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-8 w-64 max-w-full sm:h-10" />
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-6">
            {Array.from({ length: 6 }, (_, item) => (
              <div
                key={item}
                className="flex flex-col gap-2 bg-card px-3 py-2.5"
              >
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-2.5 w-12" />
              </div>
            ))}
          </div>
        </div>
        <Skeleton className="h-36 w-full rounded-2xl" />
        <section className="flex flex-col gap-3">
          <MonoLabel>Parcours et données</MonoLabel>
          <div className="overflow-hidden rounded-2xl border border-border bg-background">
            <Skeleton className="h-60 w-full rounded-none lg:h-85" />
            <div className="border-t border-border p-3">
              <Skeleton className="h-42.5 w-full lg:h-55" />
            </div>
          </div>
        </section>
        <Skeleton className="h-64 w-full rounded-xl" />
      </article>
    </div>
  );
}

export function ActivitiesLoading({ current = false }: { current?: boolean }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const queryValue = (key: string) => {
    const values = params.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  };
  const filter = parseActivityFilter(queryValue("filter"));
  const limit = parseActivityLimit(queryValue("limit"));
  const search = parseActivitySearch(queryValue("q"));
  const snapshot = useActivityListSnapshot({ filter, limit, search });
  const selectedId = pathname.split("/")[2] ?? null;

  return (
    <LoadingScope
      label={current ? "Chargement de l’activité" : "Chargement des activités"}
      className="flex min-h-0 flex-1 flex-col"
    >
      <ActivitySplitFrame
        current={current}
        list={
          current && snapshot ? (
            <ActivityListPane
              {...snapshot}
              selectedId={selectedId}
              current
              registerSnapshot={false}
            />
          ) : (
            <>
              <ActivityListHeader current={current} loading />
              <ActivityRowsLoading />
            </>
          )
        }
      >
        <ActivityToolbar
          href={`/activities${activitiesQuery(filter, limit, search)}`}
        />
        <ActivityContentLoading />
      </ActivitySplitFrame>
    </LoadingScope>
  );
}

export function ActivityDetailLoading() {
  return (
    <LoadingScope
      label="Chargement de l’activité"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ActivityContentLoading />
    </LoadingScope>
  );
}

export function HealthDayLoading() {
  return (
    <LoadingScope
      label="Chargement de la journée"
      className="flex flex-col gap-6 sm:gap-8"
    >
      <div aria-hidden="true" className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-24 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
      <div
        aria-hidden="true"
        className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8"
      >
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </LoadingScope>
  );
}

export function RaceLoading() {
  return (
    <LoadingScope
      label="Chargement des courses"
      className="flex flex-col gap-5 sm:gap-9"
    >
      <Skeleton className="h-56 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl md:h-105" />
    </LoadingScope>
  );
}

export function RacesLoading() {
  const view = parseRacesView(useSearchParams().get("view"));
  return (
    <LoadingScope
      label="Chargement des courses"
      className="flex flex-col gap-5 sm:gap-9"
    >
      <RacesTitle
        view={view}
        subtitle={<Skeleton className="h-6 w-56 max-w-full" />}
      />
      <div aria-hidden="true" className="flex flex-col gap-5 sm:gap-9">
        {view !== "past" && (
          <>
            <Skeleton className="h-36 w-full rounded-2xl" />
            <Skeleton className="h-105 w-full rounded-2xl lg:h-100" />
            <div className="grid gap-5 md:grid-cols-2">
              <Skeleton className="h-44 w-full rounded-2xl" />
              <Skeleton className="h-44 w-full rounded-2xl max-md:hidden" />
            </div>
          </>
        )}
        <div
          className={cn(
            "flex flex-col gap-3",
            view === "upcoming" && "max-md:hidden",
          )}
        >
          <Skeleton className="h-6 w-44" />
          {[0, 1, 2].map((item) => (
            <Skeleton key={item} className="h-14 w-full" />
          ))}
        </div>
      </div>
    </LoadingScope>
  );
}
