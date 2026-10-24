import { ChevronRightIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { ProvenanceLabel } from "@/components/stride/provenance";
import { cn } from "@/lib/utils";
import type { Comparison } from "../compare";
import type { PlanCardView } from "../panel";
import { unplannedPill } from "../plan-status";
import { CardFeeling } from "./feeling-prompt";
import { PlanPill } from "./plan-pill";

const tones: Record<Comparison["tone"], string> = {
  better: "text-success",
  worse: "text-warning",
  same: "text-foreground",
};

function ComparisonDetails({ comparison }: { comparison: Comparison }) {
  return (
    <details className="group border-t border-border pt-2.5">
      <summary className="flex min-h-8 cursor-pointer list-none items-center gap-2 text-[13.5px] text-muted [&::-webkit-details-marker]:hidden">
        <span className="flex-1">
          {comparison.lead}
          <strong className={cn("font-semibold", tones[comparison.tone])}>
            {comparison.emphasis}
          </strong>
          {comparison.tail}
        </span>
        <span className="text-[12.5px] whitespace-nowrap text-muted-foreground">
          Détail{" "}
          <span
            aria-hidden="true"
            className="inline-block transition-transform group-open:rotate-180"
          >
            ▾
          </span>
        </span>
      </summary>
      <div className="flex flex-col gap-2 pt-2">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-border-strong">
              <th
                scope="col"
                className="pb-2 text-left font-mono text-[9.5px] font-normal tracking-[0.08em] text-muted-foreground uppercase"
              >
                {comparison.firstColumn}
              </th>
              {comparison.columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className="pb-2 text-right font-mono text-[9.5px] font-normal tracking-[0.08em] whitespace-nowrap text-muted-foreground uppercase"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr
                key={row.id}
                aria-current={row.current ? "true" : undefined}
                className="border-b border-border"
              >
                <th
                  scope="row"
                  className={cn(
                    "py-2.5 text-left text-meta",
                    row.current
                      ? "font-semibold text-foreground"
                      : "font-normal text-muted",
                  )}
                >
                  {row.date}
                </th>
                {comparison.columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "py-2.5 text-right font-metric text-[17px] font-semibold whitespace-nowrap tabular-nums",
                      row.current ? "text-foreground" : "text-muted",
                    )}
                  >
                    {row.cells[column.key] ?? (
                      <span aria-label="non disponible" className="text-dim">
                        —
                      </span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {comparison.estimate && (
          <ProvenanceLabel source="estimate">
            Allure à FC égale · estimation Stride
          </ProvenanceLabel>
        )}
      </div>
    </details>
  );
}

export function PlanCard({ card }: { card: PlanCardView }) {
  const planned = card.kind === "planned";
  return (
    <section
      aria-label={planned ? "Séance du plan" : "Hors plan"}
      className="flex flex-col gap-2.5 rounded-panel border border-border bg-surface px-4 py-3.5 sm:px-5 sm:py-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <PlanPill pill={planned ? card.pill : unplannedPill} />
        {planned ? (
          <>
            <span className="text-meta text-muted-foreground">
              Séance du plan
            </span>
            <Link
              href={card.planHref}
              className="ml-auto inline-flex min-h-8 items-center gap-1 text-[12.5px] text-muted hover:text-foreground"
            >
              Voir dans le plan
              <ChevronRightIcon aria-hidden="true" className="size-3.5" />
            </Link>
          </>
        ) : (
          card.load && (
            <span className="text-meta text-muted-foreground">{card.load}</span>
          )
        )}
      </div>
      {planned && card.body && (
        <p className="text-[15px] leading-[1.45]">{card.body}</p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-0 flex-1 sm:min-w-75">
          <CardFeeling
            activityId={card.feelingActivityId}
            feeling={card.feeling}
          />
        </div>
        <Button
          asChild
          size="md"
          className="max-sm:min-h-11 sm:ml-auto sm:min-h-9"
        >
          <Link href={card.coachHref}>En parler au coach</Link>
        </Button>
      </div>
      {card.comparison && <ComparisonDetails comparison={card.comparison} />}
    </section>
  );
}
