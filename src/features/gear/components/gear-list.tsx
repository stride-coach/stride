import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceMark } from "@/components/stride/marks";
import { Widget } from "@/components/stride/widget";
import { cn } from "@/lib/utils";
import type { PairCardView, PairListView } from "../view";
import { GearPanelSection } from "./gear-frame";
import { WearGauge } from "./wear-gauge";

function PairCard({ pair }: { pair: PairCardView }) {
  return (
    <Link
      href={`/activities/gear/${pair.id}`}
      className="group block min-w-0 rounded-xl"
    >
      <Widget
        headingLevel={2}
        title={pair.model}
        className="h-full transition-colors duration-150 ease-stride group-hover:border-control-border"
      >
        <div className="flex flex-col gap-2.5">
          <span className="text-label text-muted-foreground">
            {pair.category}
            {!pair.garminLinked && " · Hors Garmin"}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span
              data-slot="metric"
              className="text-metric font-semibold tabular-nums"
            >
              {pair.totalKm}
            </span>
            <span className="text-body text-secondary-foreground">
              / {pair.lifespanKm} km
            </span>
            <span className="ml-auto text-label text-muted-foreground">
              {pair.brand}
            </span>
          </div>
          <WearGauge wear={pair.wear} />
          <span
            className={cn(
              "text-label",
              pair.high ? "text-warning" : "text-secondary-foreground",
            )}
          >
            {pair.remaining} · {pair.percent}
          </span>
          {(pair.specs || pair.lastRun) && (
            <div className="flex flex-col gap-1 border-t border-border pt-2.5 text-label text-muted-foreground">
              {pair.specs && (
                <span className="text-body text-foreground">{pair.specs}</span>
              )}
              {pair.lastRun && <span>Dernière sortie : {pair.lastRun}</span>}
            </div>
          )}
        </div>
      </Widget>
    </Link>
  );
}

export function GearActions({ importable }: { importable: number }) {
  return (
    <>
      {importable > 0 && (
        <Button asChild variant="outline">
          <Link href="/activities/gear/import">Importer depuis Garmin</Link>
        </Button>
      )}
      <Button asChild>
        <Link href="/activities/gear/new">
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          Ajouter une paire
        </Link>
      </Button>
    </>
  );
}

export function GearSummary({ view }: { view: PairListView }) {
  return (
    <>
      <GearPanelSection id="gear-pairs" title="Tes paires">
        <dl className="flex flex-col">
          {[
            { label: "En service", value: String(view.active.length) },
            { label: "Retirées", value: String(view.retired.length) },
            { label: "Cumulés", value: `${view.totalKm} km` },
          ].map((row) => (
            <div
              key={row.label}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-1.5"
            >
              <dt className="text-secondary-foreground">{row.label}</dt>
              <dd
                data-slot="metric"
                className="font-semibold whitespace-nowrap tabular-nums"
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </GearPanelSection>
      <GearPanelSection id="gear-count" title="Comment ça compte">
        <p className="text-body text-secondary-foreground">
          Les kilomètres viennent de Garmin. Si une sortie n’a pas la bonne
          paire, corrige-la sur l’activité : Stride garde ta correction et met
          Garmin à jour.
        </p>
        <div className="flex flex-col gap-1.5 text-label text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <SourceMark source="provider" />
            km comptés par Garmin
          </span>
          <span className="inline-flex items-center gap-1.5">
            <SourceMark source="manual" />
            km de départ saisis par toi
          </span>
        </div>
      </GearPanelSection>
    </>
  );
}

export function GearList({
  view,
  alerts = null,
  children,
}: {
  view: PairListView;
  alerts?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const empty = view.active.length === 0 && view.retired.length === 0;
  return (
    <>
      <h1 className="sr-only">Matériel</h1>
      <p className="text-body-lg text-pretty text-secondary-foreground">
        {empty
          ? "Ajoute tes chaussures : Garmin comptera leurs kilomètres."
          : `${view.active.length > 1 ? `${view.active.length} paires actives` : `${view.active.length} paire active`} · ${view.totalKm} km cumulés · les kilomètres viennent de Garmin`}
      </p>

      {alerts}

      {empty ? (
        <section className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card px-4 py-3.5">
          <h2 className="font-semibold">Aucune paire pour l’instant</h2>
          <p className="max-w-150 text-body text-secondary-foreground">
            Stride crée chaque paire dans Garmin Connect. Garmin compte ensuite
            chaque sortie et te prévient quand la paire est usée.
          </p>
        </section>
      ) : (
        <section
          aria-label="Paires actives"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-3"
        >
          {view.active.map((pair) => (
            <PairCard key={pair.id} pair={pair} />
          ))}
        </section>
      )}

      {children}

      {view.retired.length > 0 && (
        <details className="group rounded-xl border border-border bg-card">
          <summary className="flex min-h-row-touch cursor-pointer list-none items-center gap-2 px-4 text-secondary-foreground md:min-h-row [&::-webkit-details-marker]:hidden">
            Paires retirées · {view.retired.length}
          </summary>
          <ul>
            {view.retired.map((pair) => (
              <li key={pair.id} className="border-t border-border">
                <Link
                  href={`/activities/gear/${pair.id}`}
                  className="grid min-h-row-touch grid-cols-[minmax(0,1fr)_90px_120px] items-center gap-3 px-4 text-secondary-foreground hover:bg-muted hover:text-foreground md:min-h-row"
                >
                  <span className="truncate">{pair.name}</span>
                  <span className="text-right font-semibold text-foreground tabular-nums">
                    {pair.km}
                  </span>
                  <span className="text-right text-muted-foreground">
                    {pair.retiredOn}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
