import type { Metadata } from "next";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { cn } from "@/lib/utils";
import {
  historyFilters,
  type HistoryFilter,
} from "@/features/plans/review/history";
import { requireAthlete } from "@/server/app/session";
import { readPlanHistory } from "@/server/plans/proposals";
import { PlanFrame } from "../_components/plan-frame";
import { HistoryEntry } from "./_components/history-entry";

export const metadata: Metadata = { title: "Historique · Plan" };

function filterOf(value: string | string[] | undefined): HistoryFilter {
  return historyFilters.find((filter) => filter === value) ?? "all";
}

export default async function PlanHistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const history = await readPlanHistory(context, filterOf(query.filter));
  const count = (key: HistoryFilter) =>
    history.filters.find((filter) => filter.key === key)?.count ?? 0;
  return (
    <PlanFrame className="max-w-none gap-0 px-0 pt-0 sm:gap-0 sm:px-0 md:pt-0">
      <h1 className="sr-only">Historique du plan</h1>
      <div className="flex flex-col xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col">
          {!history.empty && (
            <nav
              aria-label="Filtrer par statut"
              className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto border-b border-border px-4 py-2.5 md:px-5"
            >
              {history.filters.map((filter) => {
                const current = filter.key === history.filter;
                return (
                  <Link
                    key={filter.key}
                    href={
                      filter.key === "all"
                        ? "/plan/history"
                        : `/plan/history?filter=${filter.key}`
                    }
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "flex min-h-8 shrink-0 items-center rounded-full border px-3 text-label whitespace-nowrap",
                      current
                        ? "border-foreground bg-foreground font-semibold text-background"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {filter.label} · {filter.count}
                  </Link>
                );
              })}
            </nav>
          )}
          {history.empty ? (
            <p className="px-4 py-4 text-body text-secondary-foreground md:px-5">
              Aucune proposition pour l’instant. Les changements proposés par le
              Coach apparaîtront ici, avec ta décision.
            </p>
          ) : history.groups.length === 0 ? (
            <p className="px-4 py-4 text-body text-secondary-foreground md:px-5">
              Aucune proposition ne correspond à ce filtre.
            </p>
          ) : (
            history.groups.map((group) => (
              <section
                key={group.key}
                aria-labelledby={`month-${group.key}`}
                className="flex flex-col"
              >
                <h2
                  id={`month-${group.key}`}
                  className="flex items-baseline gap-2 border-b border-border bg-muted px-4 py-2 text-label font-medium md:px-5"
                >
                  {group.label}
                  <span className="font-normal text-muted-foreground">
                    {group.entries.length}{" "}
                    {group.entries.length > 1
                      ? "modifications"
                      : "modification"}
                  </span>
                </h2>
                {group.entries.map((entry) => (
                  <HistoryEntry key={entry.id} entry={entry} />
                ))}
              </section>
            ))
          )}
        </div>
        <aside
          aria-label="Version du plan"
          className="flex flex-col xl:w-panel xl:shrink-0 xl:self-stretch xl:border-l xl:border-border"
        >
          {history.current && (
            <section className="flex flex-col gap-1.5 border-b border-border px-4 py-4.5 md:px-5">
              <h2 className="text-label font-medium text-muted-foreground">
                Version actuelle
              </h2>
              <p className="flex items-baseline gap-2">
                <span className="text-metric font-semibold tabular-nums">
                  v{history.current.version}
                </span>
                {history.current.since && (
                  <span className="text-muted-foreground">
                    depuis {history.current.since}
                  </span>
                )}
              </p>
            </section>
          )}
          {!history.empty && (
            <dl className="flex flex-col border-b border-border px-4 py-2.5 md:px-5">
              {[
                ["Modifications", count("all")],
                ["Acceptées", count("applied")],
                ["Refusées", count("rejected")],
                ["Autres", count("other")],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="grid min-h-7.5 grid-cols-[120px_minmax(0,1fr)] items-center gap-2.5"
                >
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-semibold tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          <p className="px-4 py-4.5 text-label text-muted-foreground md:px-5">
            Chaque changement de ton plan passe par une proposition que tu
            acceptes ou refuses. Rien ne change sans ton accord.
          </p>
        </aside>
      </div>
    </PlanFrame>
  );
}
