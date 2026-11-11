"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";

function Rows({ count }: { count: number }) {
  return (
    <div aria-hidden="true" className="border-t border-border">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex min-h-row-touch items-center gap-4 border-b border-border py-3 md:py-4.5"
        >
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 flex-1 max-md:hidden" />
          <Skeleton className="size-4" />
        </div>
      ))}
    </div>
  );
}

function Heading({ title }: { title: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-verdict font-semibold">{title}</h1>
    </div>
  );
}

export function SettingsOverviewShellLoading() {
  return (
    <LoadingScope label="Chargement des réglages">
      <h1 className="sr-only">Réglages</h1>
      <div aria-hidden="true" className="mb-6 flex items-center gap-4">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-64 max-w-full" />
        </div>
      </div>
      <Skeleton aria-hidden="true" className="mb-6 h-48 w-full rounded-xl" />
      <Rows count={7} />
    </LoadingScope>
  );
}

export function SettingsNotificationsLoading() {
  return (
    <LoadingScope label="Chargement des notifications">
      <Heading title="Notifications" />
      <Rows count={5} />
    </LoadingScope>
  );
}

export function SettingsAppearanceLoading() {
  return (
    <LoadingScope label="Chargement de l’apparence">
      <Heading title="Apparence et raccourcis" />
      <Rows count={6} />
    </LoadingScope>
  );
}
