import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlanHistoryEntry } from "@/features/plans/review/history";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import {
  StaffStack,
  ToneDot,
  toneText,
} from "../../_components/proposal-review";
import { ProposalLink } from "../../_components/proposal-sheet";

export function HistoryEntry({ entry }: { entry: PlanHistoryEntry }) {
  const action = entry.reviewable ? (
    <Button asChild size="md" className="max-md:w-full">
      <ProposalLink
        href={`/plan?proposal=${entry.id}`}
        prefetch={false}
        data-proposal-id={entry.id}
      >
        Examiner
      </ProposalLink>
    </Button>
  ) : (entry.isNewPlan || entry.isExtension) &&
    entry.status.tone === "success" ? (
    <Button asChild variant="outline" size="md" className="max-md:w-full">
      <Link href="/plan" prefetch={false}>
        Voir le programme
      </Link>
    </Button>
  ) : null;
  return (
    <article
      aria-labelledby={`history-${entry.id}`}
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1.5 border-b border-border px-4 py-3 md:grid-cols-[148px_92px_44px_minmax(0,1fr)_100px_auto] md:items-center md:gap-x-4 md:px-5",
        entry.highlighted && "bg-muted",
      )}
    >
      <span className="row-span-2 pt-0.5 md:col-start-3 md:row-span-1 md:row-start-1 md:pt-0">
        <StaffStack staff={entry.origin.staff} />
      </span>
      <div className="col-start-2 row-start-1 flex min-w-0 flex-wrap items-center gap-x-2 text-label text-muted-foreground md:contents">
        <span className="whitespace-nowrap tabular-nums md:col-start-1 md:row-start-1">
          {entry.when}
        </span>
        {entry.version && (
          <span className="w-fit rounded-md border border-control-border px-1.5 whitespace-nowrap text-foreground tabular-nums md:col-start-2 md:row-start-1">
            {entry.version}
          </span>
        )}
      </div>
      <span
        className={cn(
          "col-start-3 row-start-1 inline-flex items-center gap-1.5 text-label font-medium whitespace-nowrap md:col-start-5",
          toneText[entry.status.tone],
        )}
      >
        <ToneDot tone={entry.status.tone} />
        {entry.status.label}
      </span>
      <div className="col-span-2 col-start-2 row-start-2 flex min-w-0 flex-col gap-0.5 md:col-span-1 md:col-start-4 md:row-start-1">
        <h3 id={`history-${entry.id}`} className="font-medium">
          {entry.title}
        </h3>
        <p className="text-label text-muted-foreground md:truncate">
          <span>{entry.origin.line}</span>
          {entry.note && (
            <>
              <span aria-hidden="true"> · </span>
              <span>{entry.note}</span>
            </>
          )}
        </p>
      </div>
      {action && (
        <div className="col-span-2 col-start-2 row-start-3 md:col-span-1 md:col-start-6 md:row-start-1">
          {action}
        </div>
      )}
    </article>
  );
}
