"use client";

import { useSearchParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { parseFilter } from "@/features/notifications/model";
import { NotificationFilters } from "./notification-filters";

export function NotificationsLoading() {
  const filter = parseFilter(useSearchParams().get("filter"));
  return (
    <>
      <AppHeader title="Notifications" />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-tab-bar-reserve md:pb-6">
          <LoadingScope label="Chargement des notifications">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 md:px-5">
              <h1 className="font-semibold max-md:sr-only">Notifications</h1>
              <NotificationFilters current={filter} todo={0} />
            </div>
            <div aria-hidden="true">
              <div className="border-b border-border bg-muted px-4 py-2 md:px-5">
                <Skeleton className="h-3 w-32" />
              </div>
              {Array.from({ length: 6 }, (_, item) => (
                <div
                  key={item}
                  className="flex gap-3 border-b border-border px-4 py-3 md:px-5"
                >
                  <Skeleton className="size-7.5 shrink-0 rounded-md" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                  <Skeleton className="h-3 w-10" />
                </div>
              ))}
            </div>
          </LoadingScope>
        </main>
      </div>
    </>
  );
}
