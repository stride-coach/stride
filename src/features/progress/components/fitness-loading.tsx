"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";

function WidgetLoading({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="rounded-xl border border-border bg-muted px-1 pb-1">
        <p className="flex h-row items-center px-2.5 font-medium text-secondary-foreground">
          {title}
        </p>
        <div
          aria-hidden="true"
          className="flex flex-col gap-2.5 rounded-lg border border-border bg-card px-4 py-3.5"
        >
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-28 w-full" />
        </div>
      </div>
    </div>
  );
}

export function FitnessLoading() {
  return (
    <LoadingScope
      label="Chargement de la forme"
      className="flex flex-col xl:flex-row xl:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden="true"
          className="flex flex-col gap-2.5 border-b border-border px-4 py-4.5 md:px-5"
        >
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-control-auto w-56" />
        </div>
        <div className="grid items-start gap-3 px-4 py-4.5 md:px-5 lg:grid-cols-2">
          <WidgetLoading title="Objectif" className="lg:col-span-2" />
          <WidgetLoading
            title="Condition et fatigue"
            className="lg:col-span-2"
          />
          <WidgetLoading title="Course à pied · km par semaine" />
          <WidgetLoading title="Répartition de l’intensité" />
          <WidgetLoading title="Prévisions de course" />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border">
        <p className="text-label font-medium text-muted-foreground">
          Ce qui évolue
        </p>
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} aria-hidden="true" className="h-10 w-full" />
        ))}
      </div>
    </LoadingScope>
  );
}
