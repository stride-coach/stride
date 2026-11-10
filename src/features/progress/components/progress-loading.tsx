"use client";

import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { ScaleSwitch } from "@/features/progress/components/scale-switch";
import { parseHealthView } from "@/features/progress/health";

export function BodyLoading() {
  const view = parseHealthView(useSearchParams().get("view"));
  return (
    <LoadingScope
      label="Chargement de la récupération"
      className="flex flex-col xl:flex-row xl:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-col gap-2.5 border-b border-border px-4 py-4.5 md:px-5">
          <div aria-hidden="true" className="flex flex-col gap-2.5">
            <Skeleton className="h-3 w-40" />
            <Skeleton className="h-6 w-3/4 max-w-120" />
            <Skeleton className="h-4 w-full max-w-160" />
          </div>
          <div className="mt-1">
            <ScaleSwitch current={view} />
          </div>
        </div>
        {view === "day" ? (
          <div
            aria-hidden="true"
            className="flex flex-col gap-4.5 px-4 py-4.5 md:px-5"
          >
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="grid items-start gap-3 px-4 py-4.5 md:px-5 lg:grid-cols-2 xl:grid-cols-3"
          >
            <Skeleton className="h-56 rounded-xl lg:col-span-2 xl:col-span-1" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-48 rounded-xl lg:col-span-2 xl:col-span-3" />
          </div>
        )}
      </div>
      {view !== "day" && (
        <div
          aria-hidden="true"
          className="flex flex-col gap-3 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
        >
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </LoadingScope>
  );
}

export function RecordsLoading() {
  return (
    <LoadingScope
      label="Chargement des records"
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
        </div>
        <section className="flex flex-col gap-3 border-b border-border px-4 py-4.5 md:px-5">
          <h2 className="text-label font-medium text-muted-foreground">
            Tes repères actuels
          </h2>
          <div
            aria-hidden="true"
            className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4"
          >
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="flex flex-col gap-1.5">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </section>
        {["Vitesse", "Endurance"].map((title) => (
          <section key={title} className="flex flex-col">
            <h2 className="border-b border-border bg-muted px-4 py-2 text-label font-medium md:px-5">
              {title}
            </h2>
            <div aria-hidden="true">
              {[0, 1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="flex min-h-row-touch items-center justify-between gap-4 border-b border-border px-4 md:px-5 lg:min-h-row"
                >
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      <div className="flex flex-col gap-3 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border">
        <h2 className="text-label font-medium text-muted-foreground">
          À portée
        </h2>
        <Skeleton aria-hidden="true" className="h-32 w-full rounded-lg" />
      </div>
    </LoadingScope>
  );
}
