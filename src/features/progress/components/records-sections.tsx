import { ChevronRightIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { SourceMark } from "@/components/stride/marks";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GoalCard } from "../goal";
import { goalSummary } from "../goal";
import type { MarkerCard, ReachCard, RecordRow } from "../records-view";
import { PanelSection } from "./health-frame";

const tones = {
  success: "text-primary",
  warning: "text-warning",
  muted: "text-muted-foreground",
} as const;

const value = "font-semibold whitespace-nowrap tabular-nums";

export function ReachSection({
  reach,
  goal,
}: {
  reach: ReachCard | null;
  goal: GoalCard | null;
}) {
  return (
    <PanelSection id="records-reach" title="À portée">
      {reach ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <span className="font-medium">{reach.label}</span>
            <span className={cn("text-label", tones[reach.tone])}>
              {reach.gap}
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="flex flex-col-reverse gap-0.5">
              <dt className="text-label text-secondary-foreground">
                Record · {reach.recordDate}
              </dt>
              <dd data-slot="metric" className={cn("text-title", value)}>
                {reach.record}
              </dd>
            </div>
            <div className="flex flex-col-reverse gap-0.5">
              <dt className="flex items-center gap-1.5 text-label text-secondary-foreground">
                <SourceMark source="provider" />
                Prévision
              </dt>
              <dd
                data-slot="metric"
                className={cn("text-title text-secondary-foreground", value)}
              >
                {reach.prediction}
              </dd>
            </div>
          </dl>
          <span
            aria-hidden="true"
            className="relative h-1.5 overflow-hidden rounded-mark bg-muted"
          >
            <span
              className="absolute inset-y-0 left-0 rounded-mark bg-primary"
              style={{ width: `${reach.progress * 100}%` }}
            />
          </span>
          <Button asChild variant="outline">
            <Link href={reach.coachHref}>
              Préparer une tentative avec le coach
            </Link>
          </Button>
        </div>
      ) : (
        <p className="text-body text-muted-foreground">
          Aucun record sur route à moins de 3 % de ta prévision Garmin pour le
          moment.
        </p>
      )}
      {goal && (
        <Link
          href={`/races/${goal.id}`}
          className="-mx-2 flex min-h-control-touch items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors duration-150 ease-stride hover:bg-muted"
        >
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="font-medium">
              {goal.name} · {goal.date}
            </span>
            <span className="text-label text-secondary-foreground">
              {goalSummary(goal)}
            </span>
          </span>
          <ChevronRightIcon
            aria-hidden="true"
            className="size-4 shrink-0 text-muted-foreground"
          />
        </Link>
      )}
    </PanelSection>
  );
}

export function MarkersSection({ markers }: { markers: MarkerCard[] }) {
  return (
    <section
      aria-labelledby="records-markers"
      className="flex flex-col gap-3 border-b border-border px-4 py-4.5 md:px-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2
          id="records-markers"
          className="text-label font-medium text-muted-foreground"
        >
          Tes repères actuels
        </h2>
        <Link
          href="/settings/profile#entrainement"
          className="inline-flex min-h-control-touch items-center text-body text-primary hover:text-foreground md:min-h-0"
        >
          Voir tes zones d’allure et de FC →
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {markers.map((marker) => (
          <div key={marker.key} className="flex min-w-0 flex-col gap-0.5">
            <dt className="order-2 text-label text-secondary-foreground">
              {marker.label}
            </dt>
            <dd
              data-slot="metric"
              className={cn(
                "order-1 text-title",
                value,
                marker.value === null && "text-muted-foreground",
              )}
            >
              {marker.value ?? "—"}
              {marker.unit && (
                <span className="ml-1 text-body font-normal text-secondary-foreground">
                  {marker.unit}
                </span>
              )}
            </dd>
            <dd
              className={cn("order-3 truncate text-label", tones[marker.tone])}
            >
              {marker.detail}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

const rowLayout =
  "grid min-h-row-touch grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 px-4 py-2.5 md:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_6rem_minmax(0,9rem)] md:px-5 lg:min-h-row lg:py-0";

function Row({ row }: { row: RecordRow }) {
  const content = (
    <>
      <span className="min-w-0 truncate font-medium">{row.label}</span>
      <span
        data-slot="metric"
        className={cn(
          "text-right md:order-3",
          value,
          row.value === null && "text-muted-foreground",
        )}
      >
        {row.value ?? "—"}
      </span>
      <span className="min-w-0 truncate text-label text-secondary-foreground md:order-2">
        {row.detail}
      </span>
      <span
        className={cn(
          "flex items-center justify-end gap-1 text-right text-label md:order-4",
          tones[row.tone],
        )}
      >
        {row.side}
        {row.href && (
          <ChevronRightIcon
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
          />
        )}
      </span>
    </>
  );
  return (
    <li className="border-b border-border">
      {row.href ? (
        <Link
          href={row.href}
          prefetch={false}
          className={cn(
            rowLayout,
            "transition-colors duration-150 ease-stride hover:bg-muted focus-visible:outline-offset-[-2px]",
          )}
        >
          {content}
        </Link>
      ) : (
        <div className={rowLayout}>{content}</div>
      )}
    </li>
  );
}

export function RecordList({
  id,
  title,
  rows,
  empty,
}: {
  id: string;
  title: string;
  rows: RecordRow[];
  empty: string;
}) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col">
      <h2
        id={id}
        className="border-b border-border bg-muted px-4 py-2 text-label font-medium md:px-5"
      >
        {title}
      </h2>
      {rows.length ? (
        <ul>
          {rows.map((row) => (
            <Row key={row.key} row={row} />
          ))}
        </ul>
      ) : (
        <p className="border-b border-border px-4 py-3 text-body text-muted-foreground md:px-5">
          {empty}
        </p>
      )}
    </section>
  );
}
