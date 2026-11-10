"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { parseRacesView } from "@/features/races/overview";
import { RacesTitle } from "@/features/races/components/races-title";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ActivityListHeader,
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
      className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain"
    >
      <div className="border-b border-border bg-muted px-4 py-2.5 md:px-5">
        <Skeleton className="h-3 w-40" />
      </div>
      {Array.from({ length: 12 }, (_, item) => (
        <div
          key={item}
          className="flex min-h-row-touch items-center gap-3 border-b border-border px-4 md:min-h-row md:px-5"
        >
          <Skeleton className="size-3.5 rounded-full" />
          <Skeleton className="h-3 w-12 max-md:hidden" />
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="ml-auto h-3 w-12" />
          <Skeleton className="h-3 w-12 max-md:hidden" />
        </div>
      ))}
    </div>
  );
}

function ActivityContentLoading() {
  return (
    <div
      aria-hidden="true"
      className="flex min-h-0 flex-1 [scrollbar-gutter:stable] flex-col overflow-y-auto overscroll-contain xl:flex-row xl:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-4.5 px-4 py-4.5 md:px-5">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-4 w-48" />
        <div className="grid grid-cols-3 gap-4 border-y border-border py-3.5 sm:grid-cols-6">
          {Array.from({ length: 6 }, (_, item) => (
            <div key={item} className="flex flex-col gap-1.5">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
      <div className="flex flex-col gap-3 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  );
}

export function ActivitiesLoading() {
  const params = useSearchParams();
  const queryValue = (key: string) => {
    const values = params.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  };
  const filter = parseActivityFilter(queryValue("filter"));
  const limit = parseActivityLimit(queryValue("limit"));
  const search = parseActivitySearch(queryValue("q"));
  const snapshot = useActivityListSnapshot({ filter, limit, search });

  return (
    <LoadingScope
      label="Chargement des activités"
      className="flex min-h-0 flex-1 flex-col"
    >
      {snapshot ? (
        <ActivityListPane {...snapshot} registerSnapshot={false} />
      ) : (
        <>
          <ActivityListHeader loading />
          <ActivityRowsLoading />
        </>
      )}
    </LoadingScope>
  );
}

export function ActivityDetailLoading() {
  const params = useSearchParams();
  const queryValue = (key: string) => {
    const values = params.getAll(key);
    return values.length === 1 ? values[0] : undefined;
  };
  const filter = parseActivityFilter(queryValue("filter"));
  const limit = parseActivityLimit(queryValue("limit"));
  const search = parseActivitySearch(queryValue("q"));
  return (
    <LoadingScope
      label="Chargement de l’activité"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ActivityToolbar
        href={`/activities${activitiesQuery(filter, limit, search)}`}
      />
      <ActivityContentLoading />
    </LoadingScope>
  );
}

export function HealthDayLoading() {
  return (
    <LoadingScope
      label="Chargement de la journée"
      className="flex flex-col gap-4.5"
    >
      <div
        aria-hidden="true"
        className="grid grid-cols-2 gap-4 border-y border-border py-3.5 sm:grid-cols-3 lg:grid-cols-6"
      >
        {[0, 1, 2, 3, 4, 5].map((item) => (
          <Skeleton key={item} className="h-12" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
      <div aria-hidden="true" className="grid items-start gap-3 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </LoadingScope>
  );
}

export function RaceLoading() {
  return (
    <LoadingScope
      label="Chargement des courses"
      className="flex flex-col gap-5 md:gap-6"
    >
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl md:h-105" />
    </LoadingScope>
  );
}

export function RacesLoading() {
  const view = parseRacesView(useSearchParams().get("view"));
  return (
    <LoadingScope
      label="Chargement des courses"
      className="flex flex-col xl:flex-row xl:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <RacesTitle
          view={view}
          subtitle={<Skeleton className="h-6 w-56 max-w-full" />}
        />
        <div aria-hidden="true" className="flex flex-col">
          {view !== "past" && (
            <div className="flex flex-col gap-4 border-b border-border px-4 py-4.5 md:px-5">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          )}
          <div
            className={cn(
              "flex flex-col",
              view === "upcoming" && "max-md:hidden",
            )}
          >
            {[0, 1, 2, 3].map((item) => (
              <div
                key={item}
                className="flex min-h-row-touch items-center gap-3 border-b border-border px-4 md:px-5 lg:min-h-row"
              >
                <Skeleton className="size-4.5 rounded-sm" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="ml-auto h-3 w-14" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="flex flex-col gap-3 px-4 py-4.5 max-xl:hidden md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
      >
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-20 w-full" />
      </div>
    </LoadingScope>
  );
}
