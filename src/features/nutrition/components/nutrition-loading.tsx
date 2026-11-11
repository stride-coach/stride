import { Skeleton } from "@/components/ui/skeleton";
import { LoadingScope } from "@/features/data-activity/components/loading";

function WidgetLoading({ title, rows }: { title: string; rows: number }) {
  return (
    <div className="rounded-xl border border-border bg-muted px-1 pb-1">
      <p className="flex h-row items-center px-2.5 font-medium text-secondary-foreground">
        {title}
      </p>
      <div
        aria-hidden="true"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3.5"
      >
        {Array.from({ length: rows }, (_, index) => (
          <Skeleton key={index} className="h-5 w-full" />
        ))}
      </div>
    </div>
  );
}

export function NutritionLoading() {
  return (
    <LoadingScope
      label="Chargement de la nutrition"
      className="flex flex-col xl:flex-row xl:items-start"
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div
          aria-hidden="true"
          className="flex flex-col gap-2.5 border-b border-border px-4 py-4.5 md:px-5"
        >
          <Skeleton className="h-3 w-48" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-control-auto w-64" />
        </div>
        <div className="grid items-start gap-3 px-4 py-4.5 md:px-5">
          <WidgetLoading title="Objectifs du jour" rows={2} />
          <WidgetLoading title="Ta journée" rows={4} />
          <WidgetLoading title="Les 7 prochains jours" rows={7} />
        </div>
      </div>
      <div className="flex flex-col gap-3 px-4 py-4.5 md:px-5 xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border">
        <p className="text-label font-medium text-muted-foreground">
          Ta base de ravito
        </p>
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} aria-hidden="true" className="h-5 w-full" />
        ))}
      </div>
    </LoadingScope>
  );
}
