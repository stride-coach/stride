import { ChevronRightIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { ProvenanceLabel } from "@/components/stride/provenance";
import { cn } from "@/lib/utils";
import type { Comparison } from "../compare";
import type { PlanCardView } from "../panel";
import { unplannedPill, type ProgrammeItem } from "../plan-status";
import { MonoLabel } from "@/components/stride/mono-label";
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

function Programme({ items }: { items: ProgrammeItem[] }) {
  return (
    <div className="flex flex-col">
      <MonoLabel size="nano" className="pb-1">
        Programme prévu
      </MonoLabel>
      <ul>
        {items.map((item, index) => (
          <li
            key={index}
            className="flex justify-between gap-3 border-t border-border py-2.25 text-sm"
          >
            <span>{item.label}</span>
            <span className="font-metric text-base font-semibold whitespace-nowrap text-muted tabular-nums">
              {item.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function PlanCard({ card }: { card: PlanCardView }) {
  const planned = card.kind === "planned";
  const pill = planned ? card.pill : card.inPlan ? unplannedPill : null;
  const coach = (
    <Button
      asChild
      size="md"
      className={cn(
        "max-sm:min-h-11 sm:ml-auto sm:min-h-9",
        card.strength && "max-sm:w-full",
      )}
    >
      <Link href={card.coachHref}>En parler au coach</Link>
    </Button>
  );
  const feeling = (
    <CardFeeling
      activityId={card.feelingActivityId}
      feeling={card.feeling}
      strength={card.strength}
    />
  );
  const header =
    pill || planned || (card.kind === "unplanned" && card.load) ? (
      <div className="flex flex-wrap items-center gap-2">
        {pill && <PlanPill pill={pill} />}
        {planned ? (
          <>
            <span className="text-meta text-muted-foreground">
              {card.strength
                ? `Séance du plan · ${card.sessionTitle}`
                : "Séance du plan"}
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
    ) : null;
  return (
    <section
      aria-label={planned ? "Séance du plan" : "Hors plan"}
      className={cn(
        "flex flex-col rounded-panel border border-border bg-surface px-4 py-3.5 sm:px-5 sm:py-4",
        card.strength ? "gap-3" : "gap-2.5",
      )}
    >
      {header}
      {planned && card.body && (
        <p className="text-[15px] leading-[1.45]">{card.body}</p>
      )}
      {planned && card.programme && <Programme items={card.programme} />}
      {card.strength ? (
        <>
          <div
            className={cn(
              header || (planned && card.programme)
                ? "border-t border-border pt-3"
                : "",
            )}
          >
            {feeling}
          </div>
          <div className="flex">{coach}</div>
        </>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-75">{feeling}</div>
          {coach}
        </div>
      )}
      {card.comparison && <ComparisonDetails comparison={card.comparison} />}
    </section>
  );
}
