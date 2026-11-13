import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { Status } from "@/components/stride/status";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import type { RaceKind } from "@/features/onboarding/goals";
import type { ScenarioComparison } from "../scenario-compare";
import {
  ChooseScenario,
  CreateScenario,
  ScenarioRevisions,
} from "./scenario-actions";

export function ScenarioComparisonView({
  comparison,
  base,
  raceId,
  raceRevision,
  planRevision,
  kind,
  targetSeconds,
  evidence = [],
}: {
  comparison: ScenarioComparison;
  evidence?: { label: string; value: string }[];
  base: string;
  raceId: string;
  raceRevision: number;
  planRevision: number | null;
  kind: RaceKind;
  targetSeconds: number | null;
}) {
  const head =
    "px-2 py-2 text-right text-label font-normal text-muted-foreground";
  const cell = "px-2 py-2.5 text-right tabular-nums whitespace-nowrap";
  return (
    <ScenarioRevisions race={raceRevision} plan={planRevision}>
      <div className="flex flex-col gap-5 print:hidden">
        <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
          <StrideMark className="mt-1 size-3.5 shrink-0" />
          {comparison.reading}
        </p>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
          <section
            aria-label="Scénarios"
            className="grid gap-3 md:grid-cols-[repeat(auto-fit,minmax(15rem,1fr))]"
          >
            {comparison.cards.map((card) => (
              <article
                key={card.key}
                aria-labelledby={`scenario-${card.key}`}
                aria-current={card.shown ? "true" : undefined}
                className={cn(
                  "flex flex-col gap-3 rounded-xl border bg-card px-4 py-3.5",
                  card.shown ? "border-primary" : "border-border",
                  card.isTarget && "max-md:order-first",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id={`scenario-${card.key}`} className="font-semibold">
                    {card.label}
                  </h2>
                  {card.isTarget && <Chip>Ton objectif</Chip>}
                  <Status level={card.tenability.level} className="ml-auto">
                    {card.tenability.label}
                  </Status>
                  {!card.feasible && (
                    <Chip className="text-warning">Hors de portée</Chip>
                  )}
                </div>
                <p className="flex items-baseline gap-2">
                  <span
                    data-slot="metric"
                    className="text-verdict font-semibold tabular-nums"
                  >
                    {card.target}
                  </span>
                  <span className="text-label text-muted-foreground tabular-nums">
                    arrivée {card.finish}
                    {card.finishDetail && ` ${card.finishDetail}`}
                  </span>
                </p>
                <dl className="flex flex-col gap-1.5 border-t border-border pt-3">
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3">
                    <dt className="text-secondary-foreground">Allure</dt>
                    <dd className="font-medium tabular-nums">{card.pace}</dd>
                  </div>
                  <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3">
                    <dt className="text-secondary-foreground">Marche</dt>
                    <dd className="font-medium tabular-nums">{card.walk}</dd>
                  </div>
                  {card.carbs && (
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3">
                      <dt className="text-secondary-foreground">Glucides</dt>
                      <dd className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium tabular-nums">
                          {card.carbs.value}
                        </span>
                        <span
                          className={cn(
                            "text-label",
                            card.carbs.status === "validé"
                              ? "text-muted-foreground"
                              : "text-warning",
                          )}
                        >
                          {card.carbs.status}
                        </span>
                      </dd>
                    </div>
                  )}
                  {card.margin && (
                    <div className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3">
                      <dt className="text-secondary-foreground">Marge</dt>
                      <dd className="flex flex-wrap items-baseline gap-x-2">
                        <span
                          className={cn(
                            "font-medium tabular-nums",
                            card.margin.tight && "text-warning",
                          )}
                        >
                          {card.margin.value}
                        </span>
                        <span className="text-label text-muted-foreground">
                          {card.margin.detail}
                        </span>
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="mt-auto flex flex-wrap gap-2">
                  {card.shown ? (
                    <span className="inline-flex min-h-control-touch items-center text-label text-muted-foreground md:min-h-control">
                      Affiché ci-dessous
                    </span>
                  ) : (
                    <Button asChild variant="ghost">
                      <Link
                        href={
                          card.key === "target"
                            ? `${base}/scenarios`
                            : `${base}/scenarios?scenario=${card.key}`
                        }
                        scroll={false}
                      >
                        Voir le détail
                      </Link>
                    </Button>
                  )}
                  {card.isTarget && (
                    <span className="inline-flex min-h-control-touch items-center rounded-md border border-control-border px-3 text-label font-medium text-secondary-foreground md:min-h-control">
                      Plan actuel
                    </span>
                  )}
                  {!card.isTarget && targetSeconds !== null && (
                    <ChooseScenario
                      raceId={raceId}
                      kind={kind}
                      scenario={card.key as "ambitious" | "cautious"}
                      seconds={card.seconds}
                      targetSeconds={targetSeconds}
                    />
                  )}
                </div>
              </article>
            ))}
            {comparison.missing.length > 0 && targetSeconds !== null && (
              <CreateScenario
                raceId={raceId}
                missing={comparison.missing as ("ambitious" | "cautious")[]}
                targetSeconds={targetSeconds}
              />
            )}
          </section>
          {evidence.length > 0 && (
            <aside
              aria-labelledby="scenario-evidence"
              className="flex flex-col gap-2 xl:border-l xl:border-border xl:pl-5"
            >
              <h2
                id="scenario-evidence"
                className="text-label font-medium text-muted-foreground"
              >
                D’où viennent ces scénarios
              </h2>
              <dl className="flex flex-col">
                {evidence.map((item) => (
                  <div
                    key={item.label}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-t border-border py-1.5"
                  >
                    <dt className="text-secondary-foreground">{item.label}</dt>
                    <dd className="font-medium tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-label text-pretty text-muted-foreground">
                Tes meilleures marques des 6 derniers mois. Le prudent et
                l’ambitieux encadrent ton objectif : tu les règles toi-même.
              </p>
            </aside>
          )}
        </div>
        {comparison.cards.length > 1 && comparison.passages.length > 0 && (
          <section
            aria-labelledby="scenario-passages"
            className="flex flex-col gap-2"
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 id="scenario-passages" className="font-semibold">
                Heures de passage
              </h2>
              <p className="text-label text-muted-foreground">
                utile pour ton assistance
              </p>
            </div>
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-72 border-collapse text-body">
                <thead className="border-b border-border">
                  <tr>
                    <th scope="col" className={cn(head, "text-left")}>
                      Passage
                    </th>
                    {comparison.cards.map((card) => (
                      <th key={card.key} scope="col" className={head}>
                        {card.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparison.passages.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border last:border-b-0"
                    >
                      <th
                        scope="row"
                        className="px-2 py-2.5 text-left font-normal"
                      >
                        <span className="font-medium">{row.name}</span>
                        <span className="block text-label text-muted-foreground tabular-nums sm:ml-2 sm:inline">
                          km {row.distance}
                        </span>
                      </th>
                      {row.clocks.map((item) => (
                        <td
                          key={item.key}
                          className={cn(
                            cell,
                            item.key === "target"
                              ? "font-semibold"
                              : "text-secondary-foreground",
                          )}
                        >
                          {item.clock}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </ScenarioRevisions>
  );
}
