"use client";

import { useParams } from "next/navigation";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { AddTabs } from "./add-tabs";
import { GearFrame, GearListFrame } from "./gear-frame";

const pageTitle = "text-verdict font-semibold";

function useShoeId() {
  const { id } = useParams<{ id?: string }>();
  return typeof id === "string" ? id : null;
}

function ShoeBreadcrumb({ current }: { current?: string }) {
  return (
    <nav
      aria-label="Fil d’Ariane"
      className="flex min-w-0 items-center gap-2 text-body"
    >
      <Link
        href="/activities/gear"
        className="truncate text-muted-foreground hover:text-foreground"
      >
        Matériel
      </Link>
      <span aria-hidden="true" className="text-muted-foreground">
        ›
      </span>
      <Skeleton aria-hidden="true" className="h-4 w-32" />
      {current && (
        <>
          <span aria-hidden="true" className="text-muted-foreground">
            ›
          </span>
          <span aria-current="page" className="truncate">
            {current}
          </span>
        </>
      )}
    </nav>
  );
}

function FormLoading({ create }: { create: boolean }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-5">
      <Skeleton
        className={
          create
            ? "h-80 w-full rounded-xl sm:h-52"
            : "h-60 w-full rounded-xl sm:h-28"
        }
      />
      <Skeleton className="h-96 w-full rounded-xl sm:h-80" />
      {create && (
        <>
          <Skeleton className="h-60 w-full rounded-xl sm:h-44" />
          <Skeleton className="h-52 w-full rounded-xl sm:h-44" />
        </>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Skeleton className="h-9.5 w-24 rounded-lg" />
        <Skeleton className="h-9.5 w-40 rounded-lg" />
      </div>
    </div>
  );
}

export function GearListLoading() {
  return (
    <GearListFrame
      actions={
        <Button asChild>
          <Link href="/activities/gear/new">
            <PlusIcon data-icon="inline-start" aria-hidden="true" />
            Ajouter une paire
          </Link>
        </Button>
      }
    >
      <LoadingScope
        label="Chargement du matériel"
        className="flex flex-col gap-4"
      >
        <h1 className="sr-only">Matériel</h1>
        <Skeleton aria-hidden="true" className="h-5 w-80 max-w-full" />
        <div
          aria-hidden="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3"
        >
          {[0, 1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-56 rounded-xl" />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] gap-3"
        >
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl max-md:hidden" />
        </div>
      </LoadingScope>
    </GearListFrame>
  );
}

export function GearDetailLoading() {
  return (
    <GearFrame
      crumbs={[{ label: "Matériel", href: "/activities/gear" }]}
      breadcrumb={<ShoeBreadcrumb />}
      back={{ href: "/activities/gear", label: "Retour au matériel" }}
    >
      <LoadingScope
        label="Chargement de la paire"
        className="flex flex-col gap-4"
      >
        <section
          aria-hidden="true"
          className="flex flex-wrap items-end justify-between gap-5"
        >
          <div className="flex flex-col gap-2.5">
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-sm" />
              <Skeleton className="h-5 w-14 rounded-sm" />
            </div>
            <div className="flex flex-col gap-1">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-10 w-64 max-w-full" />
            </div>
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9.5 w-36 rounded-lg" />
            <Skeleton className="h-9.5 w-32 rounded-lg" />
          </div>
        </section>
        <Skeleton
          aria-hidden="true"
          className="h-140 w-full rounded-xl sm:h-100"
        />
        <div
          aria-hidden="true"
          className="grid grid-cols-1 items-start gap-3.5 lg:grid-cols-2"
        >
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </LoadingScope>
    </GearFrame>
  );
}

export function GearEditLoading() {
  const id = useShoeId();
  return (
    <GearFrame
      crumbs={[{ label: "Matériel", href: "/activities/gear" }]}
      breadcrumb={<ShoeBreadcrumb current="Modifier" />}
      back={{
        href: id ? `/activities/gear/${id}` : "/activities/gear",
        label: id ? "Retour à la paire" : "Retour au matériel",
      }}
    >
      <LoadingScope
        label="Chargement de la fiche"
        className="flex flex-col gap-4"
      >
        <h1 className={pageTitle}>Modifier la fiche</h1>
        <FormLoading create={false} />
      </LoadingScope>
    </GearFrame>
  );
}

export function GearNewLoading() {
  return (
    <GearFrame
      crumbs={[
        { label: "Matériel", href: "/activities/gear" },
        { label: "Ajouter une paire" },
      ]}
      back={{ href: "/activities/gear", label: "Retour au matériel" }}
    >
      <LoadingScope
        label="Chargement du formulaire"
        className="flex flex-col gap-4"
      >
        <section className="flex flex-col gap-2.5">
          <h1 className={pageTitle}>Ajouter une paire</h1>
          <p className="max-w-155 text-body-lg text-pretty text-secondary-foreground">
            Donne le nom de la paire : Stride propose son type, son terrain et
            une phrase pour la décrire. Tu corriges si besoin.
          </p>
        </section>
        <AddTabs current="name" />
        <FormLoading create />
      </LoadingScope>
    </GearFrame>
  );
}

export function GearImportLoading() {
  return (
    <GearFrame
      crumbs={[
        { label: "Matériel", href: "/activities/gear" },
        { label: "Importer depuis Garmin" },
      ]}
      back={{ href: "/activities/gear", label: "Retour au matériel" }}
    >
      <LoadingScope
        label="Chargement des paires Garmin"
        className="flex flex-col gap-4"
      >
        <section className="flex flex-col gap-2.5">
          <h1 className={pageTitle}>Importer depuis Garmin</h1>
          <p className="max-w-160 text-body-lg text-pretty text-secondary-foreground">
            Vérifie les kilomètres de chaque paire : si elle a couru avant
            d’être dans Garmin, saisis son vrai total.
          </p>
        </section>
        <AddTabs current="garmin" />
        <section className="flex flex-col rounded-xl border border-border bg-card px-4 py-3.5">
          <div className="hidden grid-cols-[28px_minmax(0,1fr)_120px_170px] gap-3.5 pb-2.5 sm:grid">
            <span />
            <span className="text-label text-muted-foreground">Paire</span>
            <span className="text-right text-label text-muted-foreground">
              Compté par Garmin
            </span>
            <span className="text-right text-label text-muted-foreground">
              Km actuels
            </span>
          </div>
          {[0, 1, 2, 3].map((row) => (
            <div
              aria-hidden="true"
              key={row}
              className="grid grid-cols-[28px_minmax(0,1fr)] items-center gap-3.5 border-t border-border py-3.5 sm:grid-cols-[28px_minmax(0,1fr)_120px_170px]"
            >
              <Skeleton className="size-5 rounded-sm" />
              <div className="flex min-w-0 flex-col gap-2">
                <Skeleton className="h-4 w-48 max-w-full" />
                <Skeleton className="h-9 w-56 max-w-full rounded-md" />
              </div>
              <Skeleton className="col-start-2 h-5 w-20 sm:col-start-auto sm:justify-self-end" />
              <Skeleton className="col-start-2 h-9 w-32 rounded-md sm:col-start-auto sm:justify-self-end" />
            </div>
          ))}
        </section>
      </LoadingScope>
    </GearFrame>
  );
}
