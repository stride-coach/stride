import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";
import { SettingsHeading } from "./settings-shell";

function SectionLoading({ title, rows }: { title: string; rows: number }) {
  return (
    <section className="flex flex-col">
      <h2 className="border-b border-border pb-2.5 text-body-lg font-semibold">
        {title}
      </h2>
      <div aria-hidden="true" className="flex flex-col">
        {Array.from({ length: rows }, (_, row) => (
          <div
            key={row}
            className="flex min-h-row items-center gap-4 border-b border-border py-3"
          >
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-48 max-w-full" />
              <Skeleton className="h-3 w-72 max-w-full" />
            </div>
            <Skeleton className="h-control-auto w-28 max-md:hidden" />
          </div>
        ))}
      </div>
    </section>
  );
}

function FiguresLoading({ count }: { count: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3.5 md:grid-cols-4"
    >
      {Array.from({ length: count }, (_, item) => (
        <div key={item} className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-3 w-28 max-w-full" />
        </div>
      ))}
    </div>
  );
}

export function SettingsConnectionsLoading() {
  return (
    <LoadingScope label="Chargement des connexions">
      <SettingsHeading
        title="Connexions"
        description="Garmin fournit les activités et les données de santé de ton historique."
      />
      <div className="flex flex-col gap-9">
        <div className="rounded-xl border border-border bg-muted px-1 pb-1">
          <p className="flex h-row items-center px-2.5 font-medium text-secondary-foreground">
            Garmin
          </p>
          <div className="flex flex-col gap-3.5 rounded-lg border border-border bg-card px-4 py-3.5">
            <Skeleton aria-hidden="true" className="h-5 w-40" />
            <FiguresLoading count={3} />
          </div>
        </div>
        <SectionLoading title="Autres sources" rows={2} />
      </div>
    </LoadingScope>
  );
}

export function SettingsGarminLoading() {
  return (
    <LoadingScope label="Chargement de Garmin" className="flex flex-col gap-9">
      <section className="flex flex-col gap-3.5">
        <h1 className="text-verdict font-semibold">Garmin</h1>
        <div
          aria-hidden="true"
          className="flex flex-wrap items-center gap-x-4 gap-y-2.5"
        >
          <Skeleton className="h-4 w-56 max-w-full flex-1" />
          <Skeleton className="h-control-auto w-48" />
          <Skeleton className="h-control-auto w-28" />
        </div>
        <FiguresLoading count={4} />
      </section>
      <div className="rounded-xl border border-border bg-muted px-1 pb-1">
        <p className="flex h-row items-center px-2.5 font-medium text-secondary-foreground">
          Données Garmin
        </p>
        <div
          aria-hidden="true"
          className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3.5"
        >
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-8 w-full" />
          ))}
        </div>
      </div>
      <div className="grid items-start gap-9 lg:grid-cols-2">
        <SectionLoading title="Ce que Stride peut faire" rows={2} />
        <SectionLoading title="Synchros récentes" rows={3} />
      </div>
    </LoadingScope>
  );
}

export function SettingsPrivacyLoading() {
  return (
    <LoadingScope label="Chargement des données et de la confidentialité">
      <SettingsHeading
        title="Données et confidentialité"
        description="Tes données ne servent qu’à te coacher. Elles ne sont jamais vendues ni utilisées pour de la publicité. Tu peux télécharger une copie de tes réglages ou demander la suppression de ton compte."
      />
      <div className="flex flex-col gap-9">
        <SectionLoading title="Ce que Stride conserve" rows={2} />
        <SectionLoading title="Consentement" rows={1} />
        <SectionLoading title="Ta copie" rows={1} />
        <SectionLoading title="Documents" rows={3} />
      </div>
    </LoadingScope>
  );
}
