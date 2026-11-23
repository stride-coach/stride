import { CheckIcon, WatchIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { type SessionRowState } from "@/components/stride/session-row";
import { Status } from "@/components/stride/status";
import {
  WeekCardPreview,
  WeekDayCards,
  type WeekCardDay,
  type WeekCardLink,
  type WeekCardSession,
} from "@/components/stride/week-day-cards";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { dayCardMetrics } from "@/features/plans/view/day-card";
import { dayIntensity } from "@/features/plans/view/intensity";
import { cn } from "@/lib/utils";
import { formatDuration, formatElevation } from "@/features/plans/view/format";
import {
  easyTargetPct,
  weekSplit,
  type ProgramDay,
  type ProgramDaySession,
  type ProgramWeek,
} from "@/features/plans/view/program";
import type { WeekProposal } from "@/features/plans/review/proposal";
import type { WatchDayTag } from "@/features/garmin/watch";
import type { MoveDay } from "@/features/plans/schedule/week-moves";
import { formatInteger } from "@/features/progress/format";
import { markProposalOpened } from "./proposal-sheet";
import { markSessionOpened } from "./session-sheet";
import { MoveHandle, WeekMoveCards, WeekMoveProvider } from "./session-move";

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
type MoveDays = Record<string, MoveDay[]>;

function sessionLink(
  session: ProgramDaySession,
  sessionHref: SessionHref,
): WeekCardLink {
  return session.raceId
    ? { href: `/races/${session.raceId}`, sessionKey: session.sessionKey }
    : {
        href: sessionHref(session.sessionKey),
        onClick: markSessionOpened,
        sessionKey: session.sessionKey,
      };
}

function cardCompliance(day: ProgramDay) {
  if (day.sessions.length > 1) {
    const done = day.sessions.filter(
      (session) => session.state === "done" || session.state === "partial",
    ).length;
    return done > 0 ? `${done}/${day.sessions.length}` : undefined;
  }
  return day.compliancePct !== null ? `${day.compliancePct} %` : undefined;
}

function CardDetail({
  session,
  watch,
}: {
  session: ProgramDaySession;
  watch: WatchDayTag | undefined;
}) {
  const state =
    session.state === "proposed" ||
    session.state === "substituted" ||
    session.state === "missed";
  if (!state && !watch) return null;
  return (
    <span className="flex flex-col gap-1">
      {state && <DayState state={session.state} compliancePct={null} />}
      {session.state !== "proposed" && <WatchTag tag={watch} />}
    </span>
  );
}

function moveHandle(
  day: WeekCardDay,
  session: ProgramDaySession,
  card: WeekCardSession,
  moveDays: MoveDays,
  inline: boolean,
) {
  if (session.family === "rest" || !moveDays[session.sessionKey]?.length)
    return undefined;
  return (
    <MoveHandle
      sessionKey={session.sessionKey}
      title={session.title}
      date={day.date}
      inline={inline}
      preview={
        <WeekCardPreview
          day={{
            ...day,
            isPast: false,
            isToday: false,
            compliance: undefined,
            metrics: dayCardMetrics([session]) ?? undefined,
            link: undefined,
            sessions: [{ ...card, link: undefined, detail: undefined }],
          }}
        />
      }
    />
  );
}

function withMoves(
  card: WeekCardDay,
  day: ProgramDay,
  moveDays: MoveDays,
): WeekCardDay {
  if (day.sessions.length === 0) return card;
  if (day.sessions.length === 1)
    return {
      ...card,
      action: moveHandle(
        card,
        day.sessions[0]!,
        card.sessions[0]!,
        moveDays,
        false,
      ),
    };
  return {
    ...card,
    sessions: card.sessions.map((item, index) => ({
      ...item,
      action: moveHandle(card, day.sessions[index]!, item, moveDays, true),
    })),
  };
}

function weekCardDay(
  day: ProgramDay,
  sessionHref: SessionHref,
  watchTags: WatchTags,
): WeekCardDay {
  const [single] = day.sessions;
  return {
    date: day.date,
    dayLabel: shortDay(day),
    state: rowState(day, day.state, day.sessionKey === null),
    isToday: day.isToday,
    isPast: day.isPast,
    compliance: cardCompliance(day),
    metrics: dayCardMetrics(day.sessions) ?? undefined,
    link:
      single && day.sessions.length === 1
        ? sessionLink(single, sessionHref)
        : undefined,
    sessions:
      day.sessions.length > 0
        ? day.sessions.map((session) => ({
            key: session.sessionKey,
            title: session.title,
            intensity: dayIntensity(session.family, session.blocks),
            link: sessionLink(session, sessionHref),
            detail: (
              <CardDetail
                session={session}
                watch={watchTags[session.sessionKey]}
              />
            ),
          }))
        : [{ key: day.date, title: day.title, intensity: null }],
  };
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

function WeekNote({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <StaffAvatar agent="coach" size={22} decorative />
      <p className="max-w-170 pt-0.5 text-body-lg text-secondary-foreground">
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

function pastMetrics(week: ProgramWeek) {
  const { done } = week;
  const sessions = week.days.flatMap((day) => day.sessions);
  const finished = sessions.filter(
    (session) => session.state === "done" || session.state === "partial",
  ).length;
  return [
    {
      key: "duration",
      value: formatDuration(done.durationSeconds),
      note: "courues",
    },
    ...(done.distanceMeters !== null
      ? [
          {
            key: "distance",
            value: kilometers(done.distanceMeters, done.distanceEstimated),
            note: "distance",
          },
        ]
      : []),
    ...(done.elevationMeters !== null && done.elevationMeters > 0
      ? [
          {
            key: "elevation",
            value: formatElevation(done.elevationMeters),
            note: "dénivelé",
          },
        ]
      : []),
    ...(sessions.length > 0
      ? [
          {
            key: "sessions",
            value: `${finished} / ${sessions.length}`,
            note: "séances faites",
          },
        ]
      : []),
  ];
}

function weekMetrics(week: ProgramWeek) {
  if (week.status === "past") return pastMetrics(week);
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
  moveDays,
}: {
  week: ProgramWeek;
  watchTags?: Record<string, WatchDayTag>;
  moveDays?: MoveDays;
  navigation: React.ReactNode;
  sessionHref: (sessionKey: string) => string;
  proposals?: WeekProposal[];
  reviewHref: (proposalId: string) => string;
}) {
  const subtitle = week.blockName;
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
            <span className="text-title font-semibold">
              Semaine {week.number}
            </span>
            <span className="text-secondary-foreground tabular-nums">
              {week.range}
            </span>
            {subtitle && (
              <span className="text-secondary-foreground">· {subtitle}</span>
            )}
          </h2>
          <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-label text-muted-foreground">
            <WeekStatus week={week} />
            {week.label}
          </span>
        </div>
        {navigation}
      </div>
      <div className="flex flex-col gap-4">
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
          {week.status === "current" && (
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
      {moveDays ? (
        <WeekMoveProvider moveDays={moveDays}>
          <WeekMoveCards
            label="Séances de la semaine"
            days={week.days.map((day) =>
              withMoves(
                weekCardDay(day, sessionHref, watchTags),
                day,
                moveDays,
              ),
            )}
            className="-mx-4 border-t border-border md:-mx-5"
          />
        </WeekMoveProvider>
      ) : (
        <WeekDayCards
          label="Séances de la semaine"
          days={week.days.map((day) =>
            weekCardDay(day, sessionHref, watchTags),
          )}
          className="-mx-4 border-t border-border md:-mx-5"
        />
      )}
    </section>
  );
}
