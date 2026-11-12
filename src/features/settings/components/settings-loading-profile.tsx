import { ProvenanceLabel } from "@/components/stride/provenance";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";

function PageTitle({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-2 px-1 md:px-0">
      <h1 className="text-verdict font-semibold">{title}</h1>
      <p className="max-w-150 text-body-lg text-pretty text-secondary-foreground">
        {description}
      </p>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2 px-1 text-body-lg font-semibold md:mb-0 md:border-b md:border-border md:px-0 md:pb-2.5">
      {children}
    </h2>
  );
}

function Rows({ rows, wide = false }: { rows: number; wide?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className="overflow-hidden rounded-xl border border-border bg-card md:rounded-none md:border-0 md:bg-transparent"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div
          key={row}
          className="flex min-h-row-touch items-center justify-between gap-3 border-b border-border px-4 py-2.5 last:border-b-0 md:min-h-row md:px-0 md:last:border-b"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton
            className={wide ? "h-control-auto w-44" : "h-control-auto w-24"}
          />
        </div>
      ))}
    </div>
  );
}

export function SettingsProfileLoading() {
  return (
    <LoadingScope
      label="Chargement du profil"
      className="flex flex-col gap-6 min-[1100px]:gap-8"
    >
      <section className="flex flex-col gap-2 px-1 min-[1100px]:px-0">
        <h1 className="text-verdict font-semibold">Profil et zones</h1>
        <p className="max-w-150 text-body-lg text-pretty text-secondary-foreground">
          Corrige ce que Garmin a mal relevé. Une valeur que tu modifies devient
          la tienne et n’est plus écrasée.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <ProvenanceLabel source="provider">Garmin</ProvenanceLabel>
          <ProvenanceLabel source="manual">Toi</ProvenanceLabel>
          <ProvenanceLabel source="estimate">Estimation Stride</ProvenanceLabel>
        </div>
      </section>
      <section className="min-w-0">
        <SectionTitle>Toi</SectionTitle>
        <Rows rows={6} wide />
      </section>
      <section className="min-w-0">
        <SectionTitle>Issu de ton entraînement</SectionTitle>
        <Rows rows={5} />
      </section>
      <section className="flex flex-col gap-3">
        <SectionTitle>Zones</SectionTitle>
        <div aria-hidden="true" className="grid gap-3 min-[1100px]:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </section>
    </LoadingScope>
  );
}

export function SettingsTrainingLoading() {
  return (
    <LoadingScope
      label="Chargement de l’entraînement"
      className="flex flex-col gap-6 md:gap-8"
    >
      <PageTitle
        title="Entraînement et staff"
        description="Ça guide tes plans. Changer tes disponibilités déclenche une proposition de mise à jour, sans réécrire ta semaine en douce."
      />
      <section className="min-w-0">
        <SectionTitle>Entraînement</SectionTitle>
        <Rows rows={5} wide />
      </section>
      <section className="min-w-0">
        <SectionTitle>Planification</SectionTitle>
        <Rows rows={2} wide />
      </section>
    </LoadingScope>
  );
}
