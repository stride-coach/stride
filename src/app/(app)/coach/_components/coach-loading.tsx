"use client";

import { MobileHeaderActions } from "@/features/app-shell/components/mobile-header-actions";
import { ChevronLeftIcon, PlusIcon } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { AppHeader } from "@/features/app-shell/components/app-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { participantsLine } from "@/features/coach/conversations";
import {
  StaffAvatar,
  StaffStack,
} from "@/features/coach/components/staff-avatar";
import { staff as allStaff } from "@/features/coach/staff";
import { staffAgents } from "@/features/coach/staff";
import { CoachHeaderNav, CoachTabs } from "./coach-tabs";

function ConversationListLoading() {
  const staff = allStaff;
  return (
    <section
      aria-label="Conversations"
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-col gap-2.5 px-4 pt-4 pb-2.5 min-[980px]:px-3">
        <div className="flex flex-col gap-3 min-[980px]:hidden">
          <div className="flex min-h-11 items-center gap-2.5">
            <h1 className="text-body-lg font-semibold">Coach</h1>
            <span className="text-muted-foreground">ton staff</span>
            <Button
              asChild
              variant="outline"
              size="icon-lg"
              className="ml-auto"
            >
              <Link href="/coach/new" aria-label="Nouvelle conversation">
                <PlusIcon aria-hidden="true" />
              </Link>
            </Button>
            <MobileHeaderActions />
          </div>
          <CoachTabs className="md:flex" />
          <section aria-label="Ton staff" className="flex flex-col gap-2.5">
            <span className="text-label font-medium text-muted-foreground">
              Ton staff
            </span>
            <div className="flex gap-2 overflow-x-auto">
              {staffAgents.map((agent) => (
                <span
                  key={agent}
                  className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center text-label text-secondary-foreground"
                >
                  <StaffAvatar agent={agent} size={30} decorative />
                  <span aria-hidden="true">{staff[agent].name}</span>
                </span>
              ))}
            </div>
          </section>
        </div>
        <div className="flex items-center gap-2 max-[980px]:hidden">
          <h2 className="font-medium">Conversations</h2>
          <Button asChild variant="outline" className="ml-auto">
            <Link href="/coach/new">
              <PlusIcon aria-hidden="true" />
              Nouvelle
            </Link>
          </Button>
        </div>
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          <Skeleton className="h-control-touch w-full rounded-lg md:h-control" />
          <div className="flex gap-1.5">
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
        </div>
      </div>
      <div
        aria-hidden="true"
        className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-hidden px-1.5 pb-3"
      >
        <div className="px-3 pt-2.5 pb-0.5">
          <Skeleton className="h-2.5 w-20" />
        </div>
        {Array.from({ length: 6 }, (_, item) => (
          <div
            key={item}
            className="grid grid-cols-[36px_minmax(0,1fr)] items-start gap-x-3 px-3 py-2.5"
          >
            <Skeleton className="size-7.5 rounded-full" />
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-2.5 w-10" />
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ThreadHeader({ title }: { title: string | null }) {
  const staff = allStaff;
  return (
    <div className="flex min-h-13 shrink-0 items-center gap-2.5 border-b border-border py-1.5 pr-2.5 pl-1.5 min-[980px]:min-h-header min-[980px]:gap-3 min-[980px]:px-5">
      <Button
        asChild
        variant="ghost"
        size="icon-lg"
        className="text-secondary-foreground min-[980px]:hidden"
      >
        <Link href="/coach" aria-label="Retour aux conversations">
          <ChevronLeftIcon aria-hidden="true" />
        </Link>
      </Button>
      {title ? (
        <>
          <StaffStack agents={["coach"]} size={22} />
          <span className="flex min-w-0 flex-1 flex-col">
            <h1 className="truncate font-medium">{title}</h1>
            <span className="truncate text-label text-muted-foreground">
              {participantsLine(staff, ["coach"])}
            </span>
          </span>
        </>
      ) : (
        <span
          aria-hidden="true"
          className="flex min-w-0 flex-1 items-center gap-2.5 min-[980px]:gap-3"
        >
          <Skeleton className="size-5.5 shrink-0 rounded-full" />
          <span className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </span>
        </span>
      )}
    </div>
  );
}

function EmptyThread({ plan }: { plan: boolean }) {
  const staff = allStaff;
  return (
    <div className="mx-auto flex w-full max-w-180 flex-col gap-3 px-4 pt-8 md:px-5 md:pt-12">
      <StaffAvatar agent="coach" size={48} />
      <h2 className="text-verdict font-semibold">
        {plan ? `Demande ton plan ${staff.coach.to}` : "Écris à ton staff"}
      </h2>
      <p className="max-w-140 text-body-lg text-secondary-foreground">
        {plan
          ? `${staff.coach.subject} construit ton plan à partir de tes objectifs, de tes disponibilités et de ton historique, puis te le propose. Rien n’est enregistré sans ton accord.`
          : `Pose ta question sur ton entraînement, ta récupération ou une douleur. ${staff.coach.subject} te répond ou passe la main ${staff.medical.to}, qui te parle directement quand c’est utile.`}
      </p>
    </div>
  );
}

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
    <div className="mx-auto flex w-full max-w-180 flex-col gap-2.5 border-t border-border bg-background px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] md:bg-transparent md:px-5 md:pb-4">
      <Skeleton aria-hidden="true" className="h-12 w-full rounded-lg" />
      <p className="text-label text-muted-foreground max-sm:hidden">
        Le Coach lit chaque message et passe la main au bon spécialiste, deux au
        plus par demande. Les questions d’un spécialiste lui reviennent
        directement. Rien ne change sans ton accord.
      </p>
    </div>
  );
}

export function CoachLoading({
  view,
}: {
  view: "conversations" | "thread" | "new";
}) {
  const plan = useSearchParams().get("request") === "plan";
  const current = view !== "conversations";
  return (
    <LoadingScope
      label={
        view === "thread"
          ? "Chargement de la conversation"
          : "Chargement des conversations"
      }
      className="flex min-h-0 flex-1 flex-col"
    >
      <AppHeader
        title="Coach"
        breadcrumb={<CoachHeaderNav />}
        actions={
          <Button asChild variant="ghost" className="max-md:hidden">
            <Link href="/coach/new">Nouvelle conversation</Link>
          </Button>
        }
        className="max-[980px]:hidden"
      />
      <div className="flex min-h-0 flex-1">
        <div
          className={cn(
            "min-h-0 w-full flex-col bg-background min-[980px]:flex min-[980px]:w-72 min-[980px]:shrink-0 min-[980px]:border-r min-[980px]:border-border min-[980px]:bg-transparent",
            current ? "hidden" : "flex",
          )}
        >
          <ConversationListLoading />
        </div>
        <section
          aria-label={
            view === "thread" ? "Conversation" : "Nouvelle conversation"
          }
          className={cn(
            "min-h-0 min-w-0 flex-[999_1_520px] flex-col min-[980px]:flex",
            current ? "flex" : "hidden",
          )}
        >
          <ThreadHeader
            title={view === "thread" ? null : "Nouvelle conversation"}
          />
          <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
            {view === "thread" ? (
              <ThreadLogLoading />
            ) : (
              <EmptyThread plan={view === "new" && plan} />
            )}
          </div>
          <ComposerLoading />
        </section>
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
        back={{ href: "/coach", label: "Retour aux conversations" }}
        breadcrumb={<CoachHeaderNav />}
      />
      <CoachTabs className="border-b border-border px-4 py-2.5" />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto overscroll-contain">
        <main className="flex w-full flex-col pb-18 md:pb-6 xl:flex-row xl:items-start">
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
