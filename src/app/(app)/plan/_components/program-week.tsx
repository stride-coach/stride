import { CheckIcon, WatchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Chip } from "@/components/stride/chip";
import {
  MissingValue,
  SessionStateMark,
  type SessionRowState,
} from "@/components/stride/session-row";
import { Status } from "@/components/stride/status";
import { StrideMark } from "@/components/stride/stride-mark";
import { dayIntensity } from "@/features/plans/view/intensity";
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
      return <Status level="watch">Proposé</Status>;
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

function shortDay(day: ProgramDay) {
  const weekday = day.weekday.replace(".", "");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day.dayNumber}`;
}

export function rowState(
  day: Pick<ProgramDay, "isToday">,
  state: ProgramDaySession["state"],
  rest: boolean,
): SessionRowState {
  if (day.isToday) return "today";
  if (rest) return "rest";
  if (state === "done" || state === "substituted") return "done";
  if (state === "partial") return "partial";
  if (state === "missed") return "missed";
  if (state === "proposed") return "proposed";
  return "upcoming";
}

const rowGrid =
  "grid min-h-row-touch grid-cols-[14px_48px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2 sm:min-h-row sm:grid-cols-[14px_52px_minmax(0,1fr)_104px_60px_62px_auto] sm:py-1.5 md:px-5 lg:grid-cols-[14px_52px_minmax(0,1fr)_104px_60px_62px_62px_auto]";

function SessionCells({
  day,
  session,
  rest,
  showDay,
  watch,
}: {
  day: ProgramDay;
  session: Pick<
    ProgramDaySession,
    | "family"
    | "title"
    | "summary"
    | "duration"
    | "distance"
    | "elevation"
    | "blocks"
    | "state"
    | "compliancePct"
  >;
  rest: boolean;
  showDay: boolean;
  watch: WatchDayTag | undefined;
}) {
  const state = rowState(day, session.state, rest);
  const intensity = dayIntensity(session.family, session.blocks);
  return (
    <>
      <SessionStateMark state={state} />
      <span className="flex flex-col text-label text-muted-foreground tabular-nums">
        {showDay && shortDay(day)}
        {showDay && day.sessions.length > 1 && (
          <span className="text-micro">{sessionCount(day)}</span>
        )}
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate",
            rest ? "text-muted-foreground" : "font-medium",
          )}
        >
          {session.title}
        </span>
        {(session.summary || session.elevation) && (
          <span className="truncate text-label text-muted-foreground tabular-nums lg:hidden">
            <span className="sm:hidden">
              {[session.summary, session.elevation].filter(Boolean).join(" · ")}
            </span>
            {session.elevation && (
              <span className="max-sm:hidden">{session.elevation}</span>
            )}
          </span>
        )}
        {session.state !== "proposed" && <WatchTag tag={watch} />}
      </span>
      <span className="max-sm:hidden">
        {intensity && (
          <Chip intensity={intensity.level ?? undefined}>
            {intensity.label}
          </Chip>
        )}
      </span>
      <span className="text-right tabular-nums max-sm:hidden">
        {rest || session.family === "race" ? null : (
          <MissingValue value={session.duration} />
        )}
      </span>
      <span className="text-right tabular-nums max-sm:hidden">
        {rest ? null : <MissingValue value={session.distance} />}
      </span>
      <span className="text-right text-muted-foreground tabular-nums max-lg:hidden">
        {session.elevation?.replace(" D+", "")}
      </span>
      <span className="justify-self-end">
        <DayState state={session.state} compliancePct={session.compliancePct} />
      </span>
    </>
  );
}

function DayRows({
  day,
  sessionHref,
  watchTags,
}: {
  day: ProgramDay;
  sessionHref: SessionHref;
  watchTags: WatchTags;
}) {
  const rest = day.sessionKey === null;
  const frame = cn(
    "border-b border-border",
    day.isPast && !day.isToday && "opacity-55",
    day.isToday && "bg-muted",
  );
  const link = cn(
    rowGrid,
    "transition-colors duration-150 ease-stride hover:bg-muted focus-visible:outline-offset-[-2px]",
  );
  if (day.sessions.length > 1)
    return (
      <li className={frame}>
        <div
          role="group"
          aria-label={`${formatLongDay(day.date)}, ${sessionCount(day)}`}
          aria-current={day.isToday ? "date" : undefined}
        >
          {day.sessions.map((session, index) => (
            <SessionLink
              key={session.sessionKey}
              session={session}
              sessionHref={sessionHref}
              className={cn(
                link,
                index > 0 && "border-t border-dashed border-border",
              )}
            >
              <SessionCells
                day={day}
                session={session}
                rest={false}
                showDay={index === 0}
                watch={watchTags[session.sessionKey]}
              />
            </SessionLink>
          ))}
        </div>
      </li>
    );
  const watch = day.sessionKey ? watchTags[day.sessionKey] : undefined;
  const cells = (
    <SessionCells day={day} session={day} rest={rest} showDay watch={watch} />
  );
  const single = day.sessions[0];
  return (
    <li className={frame}>
      {single ? (
        <SessionLink
          session={single}
          sessionHref={sessionHref}
          current={day.isToday}
          className={link}
        >
          {cells}
        </SessionLink>
      ) : (
        <div className={rowGrid}>{cells}</div>
      )}
    </li>
  );
}

function WeekNote({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <StrideMark className="mt-0.75 size-3.5 shrink-0" />
      <p className="max-w-170 text-body-lg text-secondary-foreground">{note}</p>
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
      className="flex flex-col divide-y divide-border rounded-xl border border-border bg-card"
    >
      {proposals.map((proposal) => (
        <div
          key={proposal.id}
          className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3"
        >
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <Status level="watch">Changement proposé</Status>
            <span className="font-semibold">{proposal.title}</span>
            {proposal.summary && (
              <span className="text-secondary-foreground">
                {proposal.summary}
              </span>
            )}
          </span>
          <Button asChild size="md" className="max-sm:w-full">
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
  if (week.status === "current") return <Status level="ok">En cours</Status>;
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
      className="relative flex h-1 gap-0.5"
    >
      <span
        className="rounded-l-mark bg-intensity-2"
        style={{ width: `${split.easyPct}%` }}
      />
      {split.qualitySeconds > 0 && (
        <span className="flex-1 rounded-r-mark bg-intensity-4" />
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
      <dd className="col-start-1 row-start-1 text-title leading-none font-semibold whitespace-nowrap tabular-nums">
        {split.easyPct} %
      </dd>
      <dd className="col-start-3 row-start-1 justify-self-end text-label">
        <SplitState split={split} long={false} />
      </dd>
      <dd className="col-span-3">
        <SplitBar split={split} />
      </dd>
      <dd className="col-span-3 text-label text-muted-foreground">
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
      className="flex flex-col gap-2 rounded-xl border border-border bg-card px-3.5 py-3 sm:hidden"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-title leading-none font-semibold tabular-nums">
          {split.easyPct} %
        </span>
        <span className="text-secondary-foreground">en facile</span>
        <span className="ml-auto text-label">
          <SplitState split={split} long />
        </span>
      </div>
      <SplitBar split={split} />
      <div className="flex gap-3.5 text-label text-muted-foreground">
        <span className="inline-flex items-center gap-1.25">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-intensity-2"
          />
          Facile {formatDuration(split.easySeconds)}
        </span>
        <span className="inline-flex items-center gap-1.25">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-intensity-4"
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
      className="flex flex-col gap-3.5 px-4 pt-4.5 md:px-5"
    >
      <div className="flex flex-wrap items-start gap-3 sm:items-center">
        <div className="flex flex-col gap-0.75">
          <h2
            id="program-week-title"
            className="flex flex-wrap items-baseline gap-2.5"
          >
            <span className="text-title font-semibold tabular-nums">
              S{week.number}
            </span>
            <span className="text-title font-semibold">{week.range}</span>
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
                <dt className="order-2 text-label text-muted-foreground">
                  {metric.note}
                </dt>
                <dd className="order-1 text-title leading-none font-semibold whitespace-nowrap tabular-nums">
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
      <ol className="-mx-4 border-t border-border md:-mx-5">
        {week.days.map((day) => (
          <DayRows
            key={day.date}
            day={day}
            sessionHref={sessionHref}
            watchTags={watchTags}
          />
        ))}
      </ol>
    </section>
  );
}
