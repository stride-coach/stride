import { Fragment } from "react";
import { CheckIcon, WatchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { MonoLabel } from "@/components/stride/mono-label";
import { PulseDot } from "@/components/stride/marks";
import { SessionKindTile } from "@/components/stride/session-kind-tile";
import { SessionShape } from "@/components/stride/session-shape";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatElevation,
  formatLongDay,
} from "@/features/plans/view/format";
import {
  easyTargetPct,
  weekSplit,
  type ProgramDay,
  type ProgramDaySession,
  type ProgramWeek,
} from "@/features/plans/view/program";
import type { WeekProposal } from "@/features/plans/review/proposal";
import type { WatchDayTag } from "@/features/garmin/watch";
import { formatInteger } from "@/features/progress/format";
import { markProposalOpened } from "./proposal-sheet";
import { markSessionOpened } from "./session-sheet";

function DayState({
  state,
  compliancePct,
}: Pick<ProgramDaySession, "state" | "compliancePct">) {
  switch (state) {
    case "done":
    case "partial":
      return (
        <span
          className={cn(
            "flex items-center gap-1.25 text-label",
            state === "done" ? "text-primary" : "text-warning",
          )}
        >
          <CheckIcon aria-hidden="true" className="size-3" strokeWidth={2.5} />
          Fait{compliancePct !== null && ` · ${compliancePct} %`}
        </span>
      );
    case "proposed":
      return (
        <span className="flex items-center gap-1.5 text-label text-warning">
          <PulseDot tone="warning" breathing={false} />
          Proposé
        </span>
      );
    case "substituted":
      return <span className="text-label text-muted-foreground">Remplacé</span>;
    case "missed":
      return <span className="text-label text-muted-foreground">Non fait</span>;
    default:
      return null;
  }
}

function WatchTag({ tag }: { tag: WatchDayTag | undefined }) {
  if (!tag) return null;
  return (
    <span
      className={cn(
        "flex items-center gap-1.25 text-label",
        tag === "on" ? "text-muted-foreground" : "text-destructive",
      )}
    >
      <WatchIcon aria-hidden="true" className="size-3 shrink-0" />
      {tag === "on" ? "Sur la montre" : "Pas sur la montre"}
    </span>
  );
}

type SessionHref = (sessionKey: string) => string;
type WatchTags = Record<string, WatchDayTag>;

function SessionLink({
  session,
  sessionHref,
  current = false,
  className,
  children,
}: {
  session: ProgramDaySession;
  sessionHref: SessionHref;
  current?: boolean;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={
        session.raceId
          ? `/races/${session.raceId}`
          : sessionHref(session.sessionKey)
      }
      onClick={session.raceId ? undefined : markSessionOpened}
      data-session-key={session.sessionKey}
      aria-current={current ? "date" : undefined}
      className={className}
    >
      {children}
    </Link>
  );
}

function sessionCount(day: ProgramDay) {
  return `${day.sessions.length} séances`;
}

function DayDate({ day, size }: { day: ProgramDay; size: "micro" | "nano" }) {
  return (
    <>
      <MonoLabel size={size} tone={day.isToday ? "accent" : "muted"}>
        {day.weekday}
      </MonoLabel>
      <span className="text-title leading-none font-semibold tabular-nums">
        {day.dayNumber}
      </span>
    </>
  );
}

function SessionShapeStrip({
  blocks,
  className,
}: {
  blocks: ProgramDaySession["blocks"];
  className?: string;
}) {
  if (blocks.length === 0) return null;
  return (
    <SessionShape
      blocks={blocks}
      aria-hidden="true"
      role={undefined}
      aria-label={undefined}
      className={cn("h-3.5 gap-px", className)}
    />
  );
}

function DayCard({
  day,
  sessionHref,
  watchTags,
}: {
  day: ProgramDay;
  sessionHref: SessionHref;
  watchTags: WatchTags;
}) {
  const rest = day.sessionKey === null;
  const className = cn(
    "flex min-w-0 flex-col rounded-xl border p-3",
    rest
      ? "border-dashed border-border"
      : "border-border bg-card hover:border-control-border",
    day.isPast && !rest && "bg-background",
    day.isPast && "opacity-70",
    day.isToday && "border-foreground bg-muted opacity-100",
  );
  if (day.sessions.length > 1)
    return (
      <div
        role="group"
        aria-label={`${formatLongDay(day.date)}, ${sessionCount(day)}`}
        aria-current={day.isToday ? "date" : undefined}
        className={cn(className, "gap-1.5 hover:border-border")}
      >
        <span className="flex min-h-6.5 items-center justify-between gap-1.5">
          <span className="flex items-baseline gap-1.25">
            <DayDate day={day} size="micro" />
          </span>
          <MonoLabel size="micro" tone="muted">
            {sessionCount(day)}
          </MonoLabel>
        </span>
        {day.sessions.map((session, index) => (
          <Fragment key={session.sessionKey}>
            {index > 0 && (
              <span aria-hidden="true" className="h-px shrink-0 bg-border" />
            )}
            <SessionLink
              session={session}
              sessionHref={sessionHref}
              className={cn(
                "-mx-2 flex flex-col gap-2 rounded-lg p-2 hover:bg-muted",
                index === day.sessions.length - 1 && "flex-1",
              )}
            >
              <span className="text-[13.5px] leading-tight font-semibold">
                {session.title}
              </span>
              <span className="flex items-center gap-1.75">
                <SessionKindTile
                  kind={session.family}
                  size="sm"
                  className="size-5.5"
                />
                {session.summary && (
                  <span className="text-body-lg leading-tight font-semibold tabular-nums">
                    {session.summary}
                  </span>
                )}
              </span>
              {session.elevation && (
                <span className="-mt-1 text-label text-muted-foreground">
                  {session.elevation}
                </span>
              )}
              <SessionShapeStrip
                blocks={session.blocks}
                className={
                  index === day.sessions.length - 1 ? "mt-auto" : undefined
                }
              />
              <DayState
                state={session.state}
                compliancePct={session.compliancePct}
              />
              {session.state !== "proposed" && (
                <WatchTag tag={watchTags[session.sessionKey]} />
              )}
            </SessionLink>
          </Fragment>
        ))}
      </div>
    );
  const watch = day.sessionKey ? watchTags[day.sessionKey] : undefined;
  const body = (
    <>
      <span className="flex items-center justify-between gap-1.5">
        <span className="flex items-baseline gap-1.25">
          <DayDate day={day} size="micro" />
        </span>
        <SessionKindTile kind={day.family} size="md" />
      </span>
      <span className="flex min-h-9 flex-col gap-0.75">
        <span
          className={cn(
            "text-[13.5px] leading-tight",
            rest ? "text-muted-foreground" : "font-semibold",
          )}
        >
          {day.title}
        </span>
      </span>
      {day.summary && (
        <span className="text-body-lg leading-tight font-semibold tabular-nums">
          {day.summary}
        </span>
      )}
      {day.elevation && (
        <span className="-mt-2 text-label text-muted-foreground">
          {day.elevation}
        </span>
      )}
      <SessionShapeStrip blocks={day.blocks} className="mt-auto" />
      <DayState state={day.state} compliancePct={day.compliancePct} />
      {day.state !== "proposed" && <WatchTag tag={watch} />}
    </>
  );
  const single = day.sessions[0];
  return single ? (
    <SessionLink
      session={single}
      sessionHref={sessionHref}
      current={day.isToday}
      className={cn(className, "gap-2.5")}
    >
      {body}
    </SessionLink>
  ) : (
    <div className={cn(className, "gap-2.5")}>{body}</div>
  );
}

function DayRow({
  day,
  sessionHref,
  watchTags,
}: {
  day: ProgramDay;
  sessionHref: SessionHref;
  watchTags: WatchTags;
}) {
  const rest = day.sessionKey === null;
  const date = (
    <span className="flex flex-col items-center">
      <DayDate day={day} size="nano" />
    </span>
  );
  const sessionBody = (
    session: Pick<
      ProgramDaySession,
      "family" | "title" | "summary" | "elevation" | "state" | "compliancePct"
    >,
    watch: WatchDayTag | undefined,
  ) => {
    const details = [session.summary, session.elevation]
      .filter(Boolean)
      .join(" · ");
    return (
      <>
        <SessionKindTile kind={session.family} size="lg" />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              "text-body",
              rest ? "text-muted-foreground" : "font-semibold",
            )}
          >
            {session.title}
          </span>
          {details && (
            <span className="text-label text-muted-foreground">{details}</span>
          )}
          {session.state !== "proposed" && <WatchTag tag={watch} />}
        </span>
        <DayState state={session.state} compliancePct={session.compliancePct} />
      </>
    );
  };
  const frame = cn(
    "border-t border-border",
    day.isPast && "opacity-65",
    day.isToday &&
      "my-0.5 rounded-xl border border-control-border bg-muted px-3",
  );
  if (day.sessions.length > 1)
    return (
      <div
        role="group"
        aria-label={`${formatLongDay(day.date)}, ${sessionCount(day)}`}
        aria-current={day.isToday ? "date" : undefined}
        className={cn(
          frame,
          "grid grid-cols-[40px_minmax(0,1fr)] items-start gap-2.5 py-0.5",
        )}
      >
        <span className="pt-3.75">{date}</span>
        <div className="flex min-w-0 flex-col">
          {day.sessions.map((session, index) => (
            <SessionLink
              key={session.sessionKey}
              session={session}
              sessionHref={sessionHref}
              className={cn(
                "grid min-h-11 grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-2.5 py-2.5",
                index > 0 && "border-t border-dashed border-control-border",
              )}
            >
              {sessionBody(session, watchTags[session.sessionKey])}
            </SessionLink>
          ))}
        </div>
      </div>
    );
  const className = cn(
    frame,
    "grid min-h-11 grid-cols-[40px_32px_minmax(0,1fr)_auto] items-center gap-2.5 py-3",
  );
  const body = (
    <>
      {date}
      {sessionBody(day, day.sessionKey ? watchTags[day.sessionKey] : undefined)}
    </>
  );
  const single = day.sessions[0];
  return single ? (
    <SessionLink
      session={single}
      sessionHref={sessionHref}
      current={day.isToday}
      className={className}
    >
      {body}
    </SessionLink>
  ) : (
    <div className={className}>{body}</div>
  );
}

function WeekNote({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <StrideMark className="mt-0.75 size-3.5 shrink-0" />
      <p className="text-[13px] leading-normal text-secondary-foreground">
        {note}
      </p>
    </div>
  );
}

function WeekProposals({
  proposals,
  reviewHref,
}: {
  proposals: WeekProposal[];
  reviewHref: (proposalId: string) => string;
}) {
  return (
    <section
      aria-label="Changements proposés cette semaine"
      className="flex flex-col divide-y divide-border rounded-xl border border-border bg-warning/4"
    >
      {proposals.map((proposal) => (
        <div
          key={proposal.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="flex items-center gap-2 text-label text-warning">
              <PulseDot tone="warning" breathing={false} />
              Changement proposé
            </span>
            <span className="text-body font-semibold">{proposal.title}</span>
            {proposal.summary && (
              <span className="text-[13px] leading-normal text-secondary-foreground">
                {proposal.summary}
              </span>
            )}
          </span>
          <Button asChild size="md" className="max-sm:h-11 max-sm:w-full">
            <Link
              href={reviewHref(proposal.id)}
              onClick={markProposalOpened}
              data-proposal-id={proposal.id}
            >
              Examiner
            </Link>
          </Button>
        </div>
      ))}
    </section>
  );
}

function WeekStatus({ week }: { week: ProgramWeek }) {
  if (week.status === "current")
    return (
      <span className="flex items-center gap-1.5 text-label">
        <PulseDot breathing={false} />
        En cours
      </span>
    );
  if (week.status === "future")
    return (
      <span className="text-label text-muted-foreground">
        dans {week.daysUntil} j
      </span>
    );
  if (week.completionPct !== null)
    return (
      <span className="flex items-center gap-1.25 text-label text-primary">
        <CheckIcon aria-hidden="true" className="size-3" strokeWidth={2.5} />
        {week.completionPct} %
        <span className="sr-only"> des séances réalisées</span>
      </span>
    );
  return null;
}

type Split = NonNullable<ReturnType<typeof weekSplit>>;

const splitTitle =
  "Part du temps de course passé en endurance fondamentale (sous le 1er seuil). Calculé sur le temps, pas sur les km. Le renfo ne compte pas.";

function SplitBar({ split }: { split: Split }) {
  return (
    <span
      role="img"
      aria-label={`${split.easyPct} % du temps de course en facile, cible ${easyTargetPct} %`}
      className="relative flex h-1.5 gap-0.5"
    >
      <span
        className="rounded-l-mark bg-foreground"
        style={{ width: `${split.easyPct}%` }}
      />
      {split.qualitySeconds > 0 && (
        <span className="flex-1 rounded-r-mark bg-primary/70" />
      )}
      <span
        aria-hidden="true"
        className="absolute -top-1 -bottom-1 -ml-px w-0.5 rounded-full bg-foreground"
        style={{ left: `${easyTargetPct}%` }}
      />
    </span>
  );
}

function SplitState({ split, long }: { split: Split; long: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap",
        split.met ? "text-primary" : "text-warning",
      )}
    >
      {split.met && (
        <CheckIcon aria-hidden="true" className="size-2.5" strokeWidth={3} />
      )}
      {split.met
        ? long
          ? "Cible 80/20 tenue"
          : "80/20"
        : long
          ? "Sous la cible 80/20"
          : "Sous 80/20"}
    </span>
  );
}

function WeekSplitCell({ split }: { split: Split }) {
  return (
    <div
      title={splitTitle}
      className="grid w-37.5 grid-cols-[auto_auto_1fr] items-baseline gap-x-1.5 gap-y-1.5 border-l border-border pl-4.5 max-sm:hidden"
    >
      <dt className="col-start-2 row-start-1 text-label text-secondary-foreground">
        facile
      </dt>
      <dd className="col-start-1 row-start-1 text-[26px] leading-none font-semibold whitespace-nowrap tabular-nums">
        {split.easyPct} %
      </dd>
      <dd className="col-start-3 row-start-1 justify-self-end text-[11px]">
        <SplitState split={split} long={false} />
      </dd>
      <dd className="col-span-3">
        <SplitBar split={split} />
      </dd>
      <dd className="col-span-3 text-[11px] text-muted-foreground">
        {formatDuration(split.easySeconds)} facile ·{" "}
        {formatDuration(split.qualitySeconds)} de qualité
      </dd>
    </div>
  );
}

function WeekSplitCard({ split }: { split: Split }) {
  return (
    <div
      title={splitTitle}
      className="flex flex-col gap-2 rounded-xl border border-border bg-background px-3.5 py-3 sm:hidden"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-[22px] leading-none font-semibold tabular-nums">
          {split.easyPct} %
        </span>
        <span className="text-[13px] text-secondary-foreground">en facile</span>
        <span className="ml-auto text-label">
          <SplitState split={split} long />
        </span>
      </div>
      <SplitBar split={split} />
      <div className="flex gap-3.5 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.25">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-foreground"
          />
          Facile {formatDuration(split.easySeconds)}
        </span>
        <span className="inline-flex items-center gap-1.25">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-primary/70"
          />
          Qualité {formatDuration(split.qualitySeconds)}
        </span>
        <span className="ml-auto">en temps</span>
      </div>
    </div>
  );
}

function kilometers(meters: number, estimated: boolean) {
  return `${estimated ? "≈ " : ""}${formatInteger(meters / 1000)} km`;
}

function weekMetrics(week: ProgramWeek) {
  const { totals, done } = week;
  const started = week.status !== "future";
  return [
    {
      key: "duration",
      value: formatDuration(totals.durationSeconds),
      note: started
        ? `${formatDuration(done.durationSeconds)} faites`
        : "Durée",
    },
    ...(totals.distanceMeters !== null
      ? [
          {
            key: "distance",
            value: kilometers(totals.distanceMeters, totals.distanceEstimated),
            note:
              started && done.distanceMeters !== null
                ? `${kilometers(done.distanceMeters, done.distanceEstimated)} faits`
                : "Distance",
          },
        ]
      : []),
    ...(totals.elevationMeters !== null
      ? [
          {
            key: "elevation",
            value: formatElevation(totals.elevationMeters),
            note:
              started && done.elevationMeters !== null
                ? `D+ · ${formatElevation(done.elevationMeters)} faits`
                : "D+",
          },
        ]
      : []),
  ];
}

function progress(week: ProgramWeek) {
  const total = week.totals.durationSeconds;
  return total > 0
    ? Math.min(100, Math.round((week.done.durationSeconds / total) * 100))
    : 0;
}

export function ProgramWeekPanel({
  week,
  navigation,
  sessionHref,
  proposals = [],
  reviewHref,
  watchTags = {},
}: {
  week: ProgramWeek;
  watchTags?: Record<string, WatchDayTag>;
  navigation: React.ReactNode;
  sessionHref: (sessionKey: string) => string;
  proposals?: WeekProposal[];
  reviewHref: (proposalId: string) => string;
}) {
  const subtitle = [week.blockName, week.label].filter(Boolean).join(" · ");
  const split = weekSplit(week);
  return (
    <section
      aria-labelledby="program-week-title"
      className="flex flex-col gap-3.5 rounded-2xl border border-border bg-card p-4 sm:gap-4 sm:px-5.5 sm:py-5"
    >
      <div className="flex flex-wrap items-start gap-3 sm:items-center">
        <div className="flex flex-col gap-0.75">
          <h2
            id="program-week-title"
            className="flex flex-wrap items-baseline gap-2.5"
          >
            <span className="text-[22px] leading-none font-semibold tabular-nums sm:text-metric">
              S{week.number}
            </span>
            <span className="text-[15px] font-semibold sm:text-[17px]">
              {week.range}
            </span>
          </h2>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label text-muted-foreground">
            <WeekStatus week={week} />
            {subtitle}
          </span>
        </div>
        {navigation}
      </div>
      <div className="grid gap-4 sm:gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:items-center">
        <div className="flex flex-col gap-2">
          <dl className="flex flex-wrap items-baseline gap-3.5 sm:gap-4.5">
            {weekMetrics(week).map((metric) => (
              <div key={metric.key} className="flex flex-col gap-0.5">
                <dt className="order-2 text-[11px] text-muted-foreground">
                  {metric.note}
                </dt>
                <dd className="order-1 text-[22px] leading-none font-semibold whitespace-nowrap tabular-nums sm:text-[26px]">
                  {metric.value}
                </dd>
              </div>
            ))}
            {split && <WeekSplitCell split={split} />}
          </dl>
          {week.status !== "future" && (
            <span
              aria-hidden="true"
              className="h-1 overflow-hidden rounded-mark bg-border"
            >
              <span
                className="block h-full bg-primary"
                style={{ width: `${progress(week)}%` }}
              />
            </span>
          )}
          {split && <WeekSplitCard split={split} />}
        </div>
        {week.note && <WeekNote note={week.note} />}
      </div>
      {proposals.length > 0 && (
        <WeekProposals proposals={proposals} reviewHref={reviewHref} />
      )}
      <div className="grid grid-cols-7 gap-2 max-lg:hidden">
        {week.days.map((day) => (
          <DayCard
            key={day.date}
            day={day}
            sessionHref={sessionHref}
            watchTags={watchTags}
          />
        ))}
      </div>
      <div className="flex flex-col lg:hidden">
        {week.days.map((day) => (
          <DayRow
            key={day.date}
            day={day}
            sessionHref={sessionHref}
            watchTags={watchTags}
          />
        ))}
      </div>
    </section>
  );
}
