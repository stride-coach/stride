import { useSearchParams } from "next/navigation";
import { CheckIcon, ChevronRightIcon, InfoIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { SheetTitle } from "@/components/ui/sheet";
import { isWorkZone, zoneHeights } from "@/components/stride/session-blocks";
import { Chip } from "@/components/stride/chip";
import { Status } from "@/components/stride/status";
import { dayIntensity } from "@/features/plans/view/intensity";
import { FreeBlock, zoneFills } from "@/components/stride/session-shape";
import { cn } from "@/lib/utils";
import { ProposalLink } from "./proposal-sheet";
import type { WatchCopy } from "@/features/garmin/watch";
import { WatchStatusBlock } from "@/features/garmin/components/watch-status";
import { SessionShoesBlock } from "@/features/gear/components/session-shoes";
import { DebriefFeeling } from "@/features/activities/components/feeling-prompt";
import {
  DebriefCoach,
  DebriefNote,
  DebriefSteps,
  DebriefVerdict,
} from "@/features/activities/components/session-debrief";
import {
  panelStatusLabel,
  type PanelCompletion,
  type PanelStatus,
  type PanelTone,
  type SessionPanel,
} from "@/features/plans/view/session-panel";

const toneDots: Record<PanelTone, string> = {
  success: "bg-primary",
  warning: "bg-warning",
  danger: "bg-destructive",
  muted: "bg-muted-foreground",
};

function Dk({ children, className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-label font-medium text-muted-foreground", className)}
      {...props}
    >
      {children}
    </span>
  );
}

function PanelStatusLabel({ status }: { status: Exclude<PanelStatus, null> }) {
  const label = panelStatusLabel(status);
  if (status === "today") return <Status level="ok">{label}</Status>;
  if (status === "done") return <Status level="ok">{label}</Status>;
  if (status === "partial") return <Status level="watch">{label}</Status>;
  return <span className="text-label text-muted-foreground">{label}</span>;
}

function Hero({ panel, titleId }: { panel: SessionPanel; titleId: string }) {
  const intensity = dayIntensity(
    panel.family,
    panel.segments
      .filter((segment) => !segment.free)
      .map((segment) => ({
        minutes: segment.seconds / 60,
        zone: segment.zone,
      })),
  );
  return (
    <div className="flex items-start gap-3">
      <div className="flex min-w-0 flex-col gap-1.5">
        {panel.status && <PanelStatusLabel status={panel.status} />}
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <SheetTitle id={titleId} className="text-verdict font-semibold">
            {panel.title}
          </SheetTitle>
          {intensity && (
            <Chip intensity={intensity.level ?? undefined}>
              {intensity.label}
            </Chip>
          )}
        </div>
        <p className="text-body leading-normal text-secondary-foreground max-sm:hidden">
          {panel.purpose}
        </p>
      </div>
    </div>
  );
}

function proposalHref(current: URLSearchParams, proposalId: string) {
  const query = new URLSearchParams();
  for (const key of ["season", "race", "week"]) {
    const value = current.get(key);
    if (value) query.set(key, value);
  }
  query.set("proposal", proposalId);
  return `/plan?${query}`;
}

function Proposal({
  proposal,
}: {
  proposal: NonNullable<SessionPanel["proposal"]>;
}) {
  const searchParams = useSearchParams();
  return (
    <section
      aria-label="Changement proposé"
      className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5"
    >
      <Status level="watch">Changement proposé {proposal.when}</Status>
      <p className="text-body leading-normal">{proposal.text}</p>
      <Button asChild size="md" className="self-start max-sm:w-full">
        <ProposalLink
          href={proposalHref(searchParams, proposal.id)}
          data-proposal-id={proposal.id}
        >
          Examiner
        </ProposalLink>
      </Button>
    </section>
  );
}

function Stats({ panel }: { panel: SessionPanel }) {
  return (
    <dl className="grid grid-cols-3 gap-x-3 gap-y-3.5">
      {panel.stats.map((stat) => (
        <div key={stat.key} className="flex min-w-0 flex-col gap-0.75">
          <dt className="order-2">
            <Dk>{stat.label}</Dk>
          </dt>
          <dd className="order-1 truncate text-title leading-none font-semibold tabular-nums">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function Structure({ panel }: { panel: SessionPanel }) {
  return (
    <section
      aria-labelledby="panel-structure"
      className="flex flex-col gap-1.5"
    >
      <Dk id="panel-structure">Structure</Dk>
      <div
        role="img"
        aria-label={panel.structureLabel}
        className="flex gap-0.5"
      >
        {panel.segments.map((segment, index) => (
          <div
            key={index}
            className="flex min-w-0.5 flex-col items-stretch gap-1.5"
            style={{ flexGrow: segment.seconds, flexBasis: 0 }}
          >
            <span className="flex h-11 items-end">
              {segment.free ? (
                <FreeBlock className="w-full rounded-mark" />
              ) : (
                <span
                  className={cn(
                    "w-full rounded-mark",
                    zoneFills[segment.zone],
                    !isWorkZone(segment.zone) && "opacity-55",
                  )}
                  style={{ height: `${zoneHeights[segment.zone]}%` }}
                />
              )}
            </span>
            <span
              aria-hidden="true"
              className="h-3 text-center text-micro leading-none font-medium text-muted-foreground tabular-nums"
            >
              {segment.label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Steps({ panel }: { panel: SessionPanel }) {
  return (
    <section aria-labelledby="panel-steps" className="flex flex-col">
      <Dk id="panel-steps" className="pb-1 text-label">
        Étapes
      </Dk>
      <ol>
        {panel.steps.map((step) => (
          <li
            key={step.key}
            className="grid grid-cols-[4px_minmax(0,1fr)_auto] items-start gap-3 border-t border-border py-2.75"
          >
            <span
              aria-hidden="true"
              className={cn("self-stretch rounded-mark", zoneFills[step.zone])}
            />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body font-semibold">{step.name}</span>
              {step.cue && (
                <span className="text-label text-muted-foreground">
                  {step.cue}
                </span>
              )}
            </span>
            <span className="flex flex-col items-end gap-0.5">
              <span className="text-body-lg font-semibold tabular-nums">
                {step.duration}
              </span>
              <span className="text-label whitespace-nowrap text-secondary-foreground">
                {step.target}
                {step.pace && (
                  <>
                    {" · "}
                    <span className="text-muted-foreground">{step.pace}</span>
                  </>
                )}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Contents({ panel }: { panel: SessionPanel }) {
  return (
    <section aria-labelledby="panel-contents" className="flex flex-col">
      <Dk id="panel-contents" className="pb-1 text-label">
        Contenu
      </Dk>
      <ol>
        {panel.steps.map((step) => (
          <li
            key={step.key}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-t border-border py-2.75"
          >
            <span className="text-body leading-normal">{step.cue}</span>
            <span className="text-body-lg font-semibold tabular-nums">
              {step.duration}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Untracked() {
  return (
    <p className="flex items-start gap-2 text-label leading-normal text-muted-foreground">
      <InfoIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      Séance libre, sans suivi Garmin. Marque-la faite une fois terminée pour
      qu’elle compte dans ton suivi.
    </p>
  );
}

function CheckedIn({ day }: { day: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
      <CheckIcon
        aria-hidden="true"
        className="size-4.5 shrink-0 text-primary"
        strokeWidth={2.5}
      />
      <span className="flex flex-1 flex-col gap-0.5">
        <span className="text-body-lg font-semibold">Fait · noté par toi</span>
        <span className="text-label text-muted-foreground">
          {day} · séance libre, sans suivi Garmin
        </span>
      </span>
    </div>
  );
}

function Contingencies({ items }: { items: string[] }) {
  return (
    <section
      aria-labelledby="panel-contingencies"
      className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3.5 py-3"
    >
      <Dk id="panel-contingencies">Si ça se passe mal</Dk>
      <p className="text-body leading-normal text-secondary-foreground">
        {items.join(" ")}
      </p>
    </section>
  );
}

function SurgeIdeas({ items }: { items: string[] }) {
  return (
    <section
      aria-labelledby="panel-surges"
      className="flex flex-col gap-2 rounded-lg border border-border bg-background px-3.5 py-3"
    >
      <Dk id="panel-surges">Idées de relances, sans obligation</Dk>
      <ul className="flex flex-col gap-1.5">
        {items.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 text-body text-secondary-foreground"
          >
            <span
              aria-hidden="true"
              className="mt-1.75 size-1.25 shrink-0 rounded-full bg-intensity-4"
            />
            {item}
          </li>
        ))}
      </ul>
      <p className="text-label text-muted-foreground">
        6 à 10 relances de 30” à 3’ suffisent. Récupère au moins aussi longtemps
        que tu as relancé.
      </p>
    </section>
  );
}

function Completion({ completion }: { completion: PanelCompletion }) {
  const maximum = Math.max(...completion.pace);
  const minimum = Math.min(...completion.pace);
  const { debrief } = completion;
  const rows = (
    <table className="w-full table-fixed border-collapse text-body">
      <thead>
        <tr>
          <th scope="col" className="pb-1.5">
            <span className="sr-only">Mesure</span>
          </th>
          <th
            scope="col"
            className="w-22.5 pb-1.5 pl-2.5 text-left font-normal"
          >
            <Dk>Prévu</Dk>
          </th>
          <th
            scope="col"
            className="w-22.5 pb-1.5 pl-2.5 text-left font-normal"
          >
            <Dk>Réalisé</Dk>
          </th>
          <th scope="col" className="w-6 pb-1.5">
            <span className="sr-only">Écart</span>
          </th>
        </tr>
      </thead>
      <tbody>
        {completion.rows.map((row) => (
          <tr key={row.key} className="border-t border-border">
            <th
              scope="row"
              className="py-2.5 text-left font-normal text-secondary-foreground"
            >
              {row.label}
            </th>
            <td className="py-2.5 pl-2.5 text-body-lg font-semibold text-muted-foreground tabular-nums">
              {row.planned}
            </td>
            <td className="py-2.5 pl-2.5 text-body-lg font-semibold tabular-nums">
              {row.actual}
            </td>
            <td className="py-2.5 text-right">
              <span
                aria-hidden="true"
                className={cn(
                  "inline-block size-1.5 rounded-full",
                  toneDots[row.tone],
                )}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
  const feeling = debrief && (
    <DebriefFeeling
      activityId={completion.activityId}
      feeling={debrief.feeling}
    />
  );
  return (
    <>
      {debrief ? (
        <>
          <DebriefVerdict
            debrief={debrief}
            pct={completion.pct}
            detail={[completion.detail, debrief.alignment]
              .filter(Boolean)
              .join(" · ")}
          />
          {!debrief.feeling && feeling}
          {debrief.note && <DebriefNote>{debrief.note}</DebriefNote>}
          {debrief.aligned && <DebriefSteps steps={debrief.steps} />}
        </>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
          <CheckIcon
            aria-hidden="true"
            className="size-4.5 shrink-0 text-primary"
            strokeWidth={2.5}
          />
          <span className="flex flex-1 flex-col gap-0.5">
            <span className="text-body-lg font-semibold">
              {completion.headline}
            </span>
            <span className="text-label text-muted-foreground">
              {completion.detail}
            </span>
          </span>
          {completion.pct !== null && (
            <span
              aria-hidden="true"
              className="text-metric leading-none font-semibold text-primary tabular-nums"
            >
              {completion.pct}
            </span>
          )}
        </div>
      )}
      {!debrief?.aligned &&
        completion.rows.length > 0 &&
        (debrief || completion.totalsLabel ? (
          <section aria-label="Sur l’ensemble" className="flex flex-col">
            <div className="flex items-baseline gap-2.5 pb-1.5">
              <h3 className="text-label font-medium text-muted-foreground">
                Sur l’ensemble
              </h3>
              {completion.totalsLabel && (
                <span className="ml-auto text-label text-muted-foreground">
                  {completion.totalsLabel}
                </span>
              )}
            </div>
            {rows}
          </section>
        ) : (
          rows
        ))}
      {!debrief?.aligned && completion.paceLabel && (
        <section aria-labelledby="panel-pace" className="flex flex-col gap-1.5">
          <Dk id="panel-pace">Allure, minute par minute</Dk>
          <div
            role="img"
            aria-label={completion.paceLabel}
            className="flex h-7.5 items-end gap-[1.6px]"
          >
            {completion.pace.map((secondsPerKm, index) => (
              <span
                key={index}
                className="min-w-0 flex-1 rounded-mark bg-foreground/85"
                style={{
                  height: `${
                    maximum === minimum
                      ? 50
                      : 40 +
                        ((maximum - secondsPerKm) / (maximum - minimum)) * 60
                  }%`,
                }}
              />
            ))}
          </div>
        </section>
      )}
      {completion.activities.length > 0 && (
        <section aria-labelledby="panel-activities" className="flex flex-col">
          <h3
            id="panel-activities"
            className="pb-2 text-label font-medium text-muted-foreground"
          >
            Activités Garmin
          </h3>
          <ul className="flex flex-col">
            {completion.activities.map((activity) => (
              <li key={activity.id} className="border-t border-border">
                <Link
                  href={activity.href}
                  className="grid min-h-13 grid-cols-[44px_minmax(0,1fr)_auto_12px] items-center gap-2.5 py-1.5 sm:grid-cols-[48px_minmax(0,1fr)_auto_12px] sm:gap-3"
                >
                  <span className="text-body-lg font-semibold tabular-nums">
                    {activity.time}
                  </span>
                  <span className="flex min-w-0 flex-col gap-px">
                    <span className="truncate text-body font-semibold">
                      {activity.title}
                    </span>
                    <span className="truncate text-label text-muted-foreground">
                      {activity.detail}
                    </span>
                  </span>
                  <span className="text-body-lg font-semibold tabular-nums">
                    {activity.duration}
                  </span>
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-3 text-muted-foreground"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      {debrief?.feeling && feeling}
      {debrief && <DebriefCoach href={debrief.coachHref} />}
      {completion.activities.length === 0 && (
        <Button
          asChild
          variant="outline"
          size="md"
          className="min-h-9.5 self-start rounded-md text-body"
        >
          <Link href={`/activities/${completion.activityId}`}>
            Voir l’activité Garmin
          </Link>
        </Button>
      )}
    </>
  );
}

export function SessionPanelBody({
  panel,
  titleId,
  watch = null,
  watchPending = false,
}: {
  panel: SessionPanel;
  titleId: string;
  watch?: WatchCopy | null;
  watchPending?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4.5 sm:gap-5">
      <Hero panel={panel} titleId={titleId} />
      {panel.completion ? (
        <Completion completion={panel.completion} />
      ) : (
        <>
          {panel.proposal && <Proposal proposal={panel.proposal} />}
          {panel.summary ? (
            <p className="text-metric leading-none font-semibold tabular-nums">
              {panel.summary}
            </p>
          ) : (
            <Stats panel={panel} />
          )}
          {watch && <WatchStatusBlock copy={watch} pending={watchPending} />}
          {panel.segments.length > 0 && <Structure panel={panel} />}
          {panel.steps.length > 0 &&
            (panel.intensity ? (
              <Steps panel={panel} />
            ) : (
              <Contents panel={panel} />
            ))}
          {panel.surgeIdeas.length > 0 && (
            <SurgeIdeas items={panel.surgeIdeas} />
          )}
          {panel.checkIn?.done ? (
            <CheckedIn day={panel.day} />
          ) : (
            panel.untracked && <Untracked />
          )}
          {panel.contingencies.length > 0 && (
            <Contingencies items={panel.contingencies} />
          )}
          {panel.shoes && <SessionShoesBlock shoes={panel.shoes} />}
        </>
      )}
    </div>
  );
}
