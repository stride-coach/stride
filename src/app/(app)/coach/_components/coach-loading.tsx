"use client";

import { ChevronDownIcon } from "lucide-react";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { staffAgents } from "@/features/coach/staff";
import { CoachHeaderNav, CoachTabs } from "./coach-tabs";

function ThreadLogLoading() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto flex w-full max-w-180 flex-col gap-6 px-4 pt-4.5 pb-6 md:px-5"
    >
      <Skeleton className="h-10 w-3/5 self-end rounded-lg" />
      <div className="flex gap-3">
        <Skeleton className="size-7.5 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-11/12" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-10 w-2/5 self-end rounded-lg" />
      <div className="flex gap-3">
        <Skeleton className="size-7.5 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function ComposerLoading() {
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-2.5 border-t border-border bg-background px-4 pt-3 pb-3 md:bg-transparent md:px-5 md:pb-4">
      <Skeleton aria-hidden="true" className="h-12 w-full rounded-lg" />
      <p className="text-label text-muted-foreground max-sm:hidden">
        Le Coach lit chaque message et passe la main au bon spécialiste, deux au
        plus par demande. Les questions d’un spécialiste lui reviennent
        directement. Rien ne change sans ton accord.
      </p>
    </div>
  );
}

export function CoachLoading({ view }: { view: "main" | "topic" }) {
  const main = view === "main";
  return (
    <LoadingScope
      label={main ? "Chargement du fil principal" : "Chargement du sujet"}
      className="flex min-h-0 flex-1 flex-col"
    >
      <AppHeader
        title="Coach"
        detail={main ? "ton staff" : "sujet"}
        breadcrumb={
          main ? (
            <CoachHeaderNav />
          ) : (
            <span aria-hidden="true" className="flex items-center gap-2">
              <span className="text-muted-foreground">Coach</span>
              <Skeleton className="h-4 w-40" />
            </span>
          )
        }
        actions={
          <div className="flex items-center gap-2 max-md:hidden">
            <Button variant="outline" disabled>
              Sujets
            </Button>
            <Button variant="ghost" disabled>
              Nouveau sujet
            </Button>
          </div>
        }
      />
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-2 md:hidden">
        <Button
          variant="outline"
          disabled
          className="min-w-0 flex-1 justify-between font-normal"
        >
          {main ? (
            <span className="font-medium">Fil principal</span>
          ) : (
            <Skeleton aria-hidden="true" className="h-4 w-32" />
          )}
          <span className="flex items-center gap-1 text-muted-foreground">
            Sujets
            <ChevronDownIcon aria-hidden="true" />
          </span>
        </Button>
      </div>
      <div className="flex min-h-0 flex-1">
        <section
          aria-label={main ? "Fil principal" : "Sujet"}
          className="flex min-h-0 min-w-0 flex-1 flex-col"
        >
          {!main && (
            <div
              aria-hidden="true"
              className="flex min-h-header shrink-0 items-center gap-3 border-b border-border px-5 py-2 max-md:hidden"
            >
              <Skeleton className="size-5.5 shrink-0 rounded-full" />
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </span>
            </div>
          )}
          <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
            <ThreadLogLoading />
          </div>
          <ComposerLoading />
        </section>
        <div
          aria-hidden="true"
          className="hidden w-panel shrink-0 flex-col gap-3 border-l border-border px-5 py-4.5 xl:flex"
        >
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </LoadingScope>
  );
}

export function TeamLoading() {
  return (
    <LoadingScope
      label="Chargement du staff"
      className="flex min-h-0 flex-1 flex-col"
    >
      <AppHeader
        title="Coach"
        back={{ href: "/coach", label: "Retour au fil principal" }}
        breadcrumb={<CoachHeaderNav />}
      />
      <CoachTabs className="border-b border-border px-4 py-2.5" />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-tab-bar-reserve md:pb-6 xl:flex-row xl:items-start">
          <div className="flex min-w-0 flex-1 flex-col gap-4 px-4 py-4.5 md:px-5">
            <div className="flex flex-col gap-2">
              <h1 className="max-w-160 text-verdict font-semibold text-balance">
                Cinq rôles, une seule conversation
              </h1>
              <p className="max-w-170 text-body-lg text-secondary-foreground">
                Tu écris toujours au même endroit. Le Coach te répond et fait
                intervenir le spécialiste concerné quand ta question le demande.
                Ce sont des rôles tenus par une IA, pas des personnes.
              </p>
            </div>
            <div
              aria-hidden="true"
              className="grid items-start gap-3 lg:grid-cols-2"
            >
              {staffAgents.map((agent) => (
                <Skeleton key={agent} className="h-72 w-full rounded-xl" />
              ))}
            </div>
          </div>
          <div
            aria-hidden="true"
            className="flex flex-col gap-3 px-4 py-4.5 max-xl:hidden md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
          >
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-40 w-full" />
          </div>
        </main>
      </div>
    </LoadingScope>
  );
}
