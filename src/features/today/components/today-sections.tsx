import { CountUp } from "@/components/stride/count-up";
import { CheckIcon, MessageCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { PlageTrack } from "@/components/stride/plage";
import {
  SessionList,
  SessionRow,
  type SessionRowState,
} from "@/components/stride/session-row";
import { SessionShape } from "@/components/stride/session-shape";
import { Status, type StatusLevel } from "@/components/stride/status";
import { Widget } from "@/components/stride/widget";
import { coachRequestHref } from "@/features/coach/request";
import { StaffAvatar } from "@/features/coach/components/staff-avatar";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { SyncNowButton } from "@/features/data-activity/components/sync-request";
import { TodayDecisions } from "./today-decisions";
import {
  TodayShoeChip,
  TodayShoeRow,
} from "@/features/gear/components/session-shoes";
import { recoveryPath } from "@/features/progress/health";
import { cn } from "@/lib/utils";
import type {
  TodayDaySession,
  TodayForm,
  TodayGoal,
  TodaySession,
  TodayWeek,
  TodayWeekDay,
} from "../today";
import {
  reviewRule,
  type FormIndicator,
  type FormStatus,
  type TodayVerdict,
  type VerdictTone,
} from "../verdict";

const toneLevels: Record<Exclude<VerdictTone, "muted">, StatusLevel> = {
  success: "ok",
  warning: "watch",
  danger: "alert",
};

const statusLevels: Record<FormStatus, StatusLevel> = {
  normal: "ok",
  watch: "watch",
  crossed: "alert",
};

function ToneStatus({
  tone,
  children,
}: {
  tone: VerdictTone;
  children: React.ReactNode;
}) {
  if (tone === "muted")
    return (
      <span className="text-label font-medium text-secondary-foreground">
        {children}
      </span>
    );
  return <Status level={toneLevels[tone]}>{children}</Status>;
}

function VerdictBlock({ verdict }: { verdict: TodayVerdict }) {
  return (
    <div
      role="group"
      aria-label="Verdict du jour"
      className="flex flex-col gap-3 motion-safe:animate-in motion-safe:duration-150 motion-safe:fade-in-0"
    >
      <p className="flex flex-col gap-1.5">
        <ToneStatus tone={verdict.tone}>{verdict.label}</ToneStatus>
        <span className="max-w-160 text-body-lg text-secondary-foreground">
          {verdict.text}
        </span>
      </p>
      {verdict.motif && (
        <p className="text-label text-muted-foreground">{verdict.motif}</p>
      )}
      {verdict.actions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {verdict.actions.map((action) => (
            <Button
              key={action.key}
              asChild
              variant={action.primary ? "default" : "outline"}
              size="md"
            >
              <Link href={action.href}>
                {(action.key === "lighter" || action.key === "review") && (
                  <MessageCircleIcon aria-hidden="true" />
                )}
                {action.label}
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function DaySessionRow({ session }: { session: TodayDaySession }) {
  return (
    <Link
      href={session.href}
      aria-label={session.label}
      className="flex min-h-row-touch items-center gap-3 border-t border-border py-2 transition-colors duration-150 ease-stride hover:bg-muted data-panel-source:bg-muted data-panel-source:shadow-[inset_2px_0_0_var(--foreground)] sm:min-h-row"
    >
      <span className="min-w-0 flex-1 truncate font-medium">
        {session.title}
      </span>
      {session.summary && (
        <span className="text-label text-muted-foreground tabular-nums max-sm:hidden">
          {session.summary}
        </span>
      )}
      <span
        className={cn(
          "flex items-center gap-1.5 text-label whitespace-nowrap",
          session.status === "done"
            ? "text-primary"
            : session.status === "partial"
              ? "text-warning"
              : "text-muted-foreground",
        )}
      >
        {(session.status === "done" || session.status === "partial") && (
          <CheckIcon aria-hidden="true" className="size-3" strokeWidth={2.5} />
        )}
        {session.note}
      </span>
    </Link>
  );
}

function PlannedSession({
  session,
  verdict,
}: {
  session: Extract<TodaySession, { kind: "session" }>;
  verdict: TodayVerdict | null;
}) {
  const { panel } = session;
  const done = panel.status === "done" || panel.status === "partial";
  const proposal = done ? null : panel.proposal;
  const waiting = !done && !proposal && verdict?.waiting === true;
  const stepsInVerdict =
    !done && verdict?.actions.some((action) => action.key === "steps");
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <h2 className="text-title font-semibold">{panel.title}</h2>
        {proposal && <Chip proposal>Proposition</Chip>}
        {waiting && <Chip>{verdict.label}</Chip>}
        {session.terrain && <Chip>{session.terrain}</Chip>}
      </div>
      {waiting && (
        <p className="flex items-center gap-2.5 text-muted-foreground">
          <StaffAvatar agent="coach" size={22} state="think" decorative />
          {verdict.text}
        </p>
      )}
      {panel.purpose && (
        <p className="max-w-160 text-body-lg text-secondary-foreground">
          {panel.purpose}
        </p>
      )}
      {done && panel.completion && (
        <Status level={panel.status === "done" ? "ok" : "watch"}>
          {panel.completion.headline}
        </Status>
      )}
      {panel.checkIn?.done && <Status level="ok">Fait · noté par toi</Status>}
      {session.stats.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          {session.stats.map((stat) => (
            <div key={stat.key} className="flex items-baseline gap-1.5">
              <dd className="text-body-lg font-semibold tabular-nums">
                <CountUp>{stat.value}</CountUp>
              </dd>
              <dt className="text-label text-muted-foreground">{stat.label}</dt>
            </div>
          ))}
        </dl>
      )}
      {panel.segments.length > 0 && (
        <SessionShape
          label={panel.structureLabel}
          blocks={panel.segments.map((segment) => ({
            minutes: segment.seconds / 60,
            zone: segment.zone,
          }))}
          className="h-5.5"
        />
      )}
      {proposal && (
        <p className="max-w-160 text-body-lg text-secondary-foreground motion-safe:animate-in motion-safe:duration-150 motion-safe:fade-in-0">
          {proposal.text}
        </p>
      )}
      {verdict && !done && !waiting && !proposal && (
        <VerdictBlock verdict={verdict} />
      )}
      {!done && (
        <TodayDecisions
          sessionKey={panel.sessionKey}
          plannedTitle={panel.title}
          proposal={proposal}
          moveDays={proposal ? [] : session.moveDays}
        />
      )}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {!done && panel.shoes && (
          <TodayShoeChip shoes={panel.shoes} href={session.href} />
        )}
        {!stepsInVerdict && (
          <Link
            href={session.href}
            className="ml-auto rounded-md font-medium text-primary hover:underline"
          >
            Voir les étapes →
          </Link>
        )}
      </div>
      {!done && panel.shoes && <TodayShoeRow shoes={panel.shoes} />}
    </>
  );
}

export function SessionSection({
  session,
  verdict,
}: {
  session: TodaySession;
  verdict: TodayVerdict | null;
}) {
  return (
    <section
      aria-label="Séance du jour"
      className="flex min-w-0 flex-col gap-3 border-b border-border px-4 py-4.5 md:px-5"
    >
      {session.kind === "session" ? (
        session.count > 1 ? (
          <>
            <p className="text-label text-muted-foreground">
              {session.count} séances aujourd’hui
            </p>
            {session.before.map((item) => (
              <DaySessionRow key={item.sessionKey} session={item} />
            ))}
            <div
              className={cn(
                "flex flex-col gap-3",
                session.before.length > 0 && "border-t border-border pt-3",
              )}
            >
              <PlannedSession session={session} verdict={verdict} />
            </div>
            {session.after.map((item) => (
              <DaySessionRow key={item.sessionKey} session={item} />
            ))}
          </>
        ) : (
          <PlannedSession session={session} verdict={verdict} />
        )
      ) : session.kind === "rest" ? (
        <>
          <h2 className="text-title font-semibold">Jour de repos</h2>
          <p className="text-body-lg text-secondary-foreground">
            {session.next ? (
              <>
                Prochaine séance :{" "}
                <Link
                  href={session.next.href}
                  className="rounded-md text-foreground underline-offset-4 hover:underline"
                >
                  {session.next.when} · {session.next.title}
                </Link>
              </>
            ) : (
              "Pas de séance prévue aujourd’hui."
            )}
          </p>
          {verdict && <VerdictBlock verdict={verdict} />}
        </>
      ) : (
        <>
          <h2 className="text-title font-semibold">Pas encore de plan</h2>
          <p className="max-w-160 text-body-lg text-secondary-foreground">
            Ajoute une course objectif : Stride construit ton plan et te dit
            chaque matin quoi faire.
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Button asChild size="md">
              <Link href="/races/new">Ajouter une course</Link>
            </Button>
            <Button asChild variant="outline" size="md">
              <Link
                href={coachRequestHref(
                  "Je n’ai pas encore de plan. Propose-moi une séance pour aujourd’hui.",
                )}
              >
                Demander une séance au coach
              </Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

function IndicatorRow({
  indicator,
  order,
}: {
  indicator: FormIndicator;
  order: number;
}) {
  const level = statusLevels[indicator.status];
  return (
    <div className="grid grid-cols-[92px_minmax(0,1fr)] items-center gap-3.5 border-t border-border py-2.75 first:border-t-0 sm:nth-2:border-t-0">
      <dt className="flex min-w-0 flex-col">
        <span className="text-secondary-foreground">{indicator.label}</span>
        <span className="truncate text-label text-muted-foreground">
          {indicator.note}
        </span>
      </dt>
      <dd className="flex min-w-0 flex-col gap-1.5">
        <span className="flex flex-wrap items-center gap-x-2.25 gap-y-0.5">
          <b className="text-body-lg font-semibold whitespace-nowrap tabular-nums">
            <CountUp>{indicator.value}</CountUp>
          </b>
          <Status level={level}>{indicator.statusLabel}</Status>
        </span>
        {indicator.band && indicator.marker !== null && (
          <PlageTrack
            level={level}
            scale={{
              min: 0,
              max: 100,
              low: indicator.band.start,
              high: indicator.band.end,
              value: indicator.marker,
            }}
            threshold={indicator.threshold}
            revealOrder={order}
          />
        )}
      </dd>
    </div>
  );
}

function bodyVerdict(indicators: FormIndicator[]) {
  const off = indicators.filter((item) => item.status !== "normal").length;
  if (indicators.length === 0) return null;
  if (off === 0) return "Tout est dans ta plage";
  return `${off} signa${off > 1 ? "ux" : "l"} sur ${indicators.length} hors de ta plage`;
}

export function BodySection({
  form,
  verdict,
}: {
  form: TodayForm;
  verdict: TodayVerdict | null;
}) {
  const summary = bodyVerdict(form.indicators);
  return (
    <section
      aria-labelledby="today-form"
      className="border-b border-border px-4 py-4.5 md:px-5"
    >
      <Widget
        headingLevel={2}
        title={<span id="today-form">Ton corps ce matin</span>}
        verdict={
          <span className="flex items-center gap-3">
            {form.level && (
              <Status level={toneLevels[form.tone]}>
                Forme {form.level.toLowerCase()}
              </Status>
            )}
            <Link
              href={recoveryPath}
              className="rounded-md text-label font-medium text-secondary-foreground hover:text-foreground"
            >
              Détail
            </Link>
          </span>
        }
      >
        <div className="flex flex-col gap-3">
          {summary || form.score !== null ? (
            <div className="flex flex-col gap-1">
              {summary && (
                <p className="text-verdict font-semibold">{summary}</p>
              )}
              {form.score !== null && (
                <p className="text-muted-foreground tabular-nums">
                  Forme {form.score} sur 100
                  {form.gap && ` · ${form.gap}`}
                </p>
              )}
            </div>
          ) : verdict?.waiting ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p className="text-muted-foreground">En attente de ta montre</p>
              <SyncNowButton variant="outline" />
            </div>
          ) : (
            <p className="text-muted-foreground">
              Garmin n’a pas transmis de forme du jour pour aujourd’hui.
            </p>
          )}
          {form.indicators.length > 0 && (
            <dl className="grid gap-x-6 sm:grid-cols-2">
              {form.indicators.map((indicator, order) => (
                <IndicatorRow
                  key={indicator.key}
                  indicator={indicator}
                  order={order}
                />
              ))}
            </dl>
          )}
          {verdict?.compat && (
            <div className="flex flex-col gap-1 border-t border-border pt-3">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-secondary-foreground">
                <span>{verdict.compat.question}</span>
                <span className="ml-auto">
                  <ToneStatus tone={verdict.compat.tone}>
                    {verdict.compat.answer}
                  </ToneStatus>
                </span>
              </p>
              <p className="text-label text-muted-foreground">
                {verdict.compat.detail}
              </p>
              <p className="text-label text-muted-foreground">{reviewRule}</p>
            </div>
          )}
        </div>
      </Widget>
    </section>
  );
}

function rowState(day: TodayWeekDay): SessionRowState {
  if (day.isToday) return "today";
  if (day.family === "rest") return "rest";
  if (day.state === "done" || day.state === "substituted") return "done";
  if (day.state === "partial") return "partial";
  if (day.state === "missed") return "missed";
  if (day.state === "proposed") return "proposed";
  return "upcoming";
}

function rowTitle(day: TodayWeekDay) {
  const count = day.families.length;
  return count > 1 ? `${day.title} + ${count - 1}` : day.title;
}

function rowCompliance(day: TodayWeekDay) {
  const count = day.families.length;
  if (count > 1) return `${day.doneCount}/${count}`;
  return day.compliance !== null ? `${day.compliance} %` : undefined;
}

export function WeekSection({ week }: { week: TodayWeek }) {
  return (
    <section
      aria-label={`Cette semaine · S${week.number} / ${week.total}`}
      className="flex min-w-0 flex-col"
    >
      <div className="flex min-h-8 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-muted px-4 py-1.5 text-label font-medium text-secondary-foreground md:px-5">
        <h2>Semaine {week.number}</h2>
        <span className="text-muted-foreground">{week.blockName}</span>
        <span className="ml-auto text-muted-foreground tabular-nums">
          {week.done.duration} / {week.planned.duration}
          {week.planned.distance &&
            ` · ${week.done.distance ?? "–"} / ${week.planned.distance}`}
        </span>
        <span
          role="progressbar"
          aria-label="Volume de la semaine réalisé"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={week.pct}
          className="h-1 w-16 overflow-hidden rounded-full bg-control-border max-sm:hidden"
        >
          <span
            className="block h-full bg-primary"
            style={{ width: `${week.pct}%` }}
          />
        </span>
        <Link
          href={week.href}
          className="rounded-md text-secondary-foreground hover:text-foreground"
        >
          Plan
        </Link>
      </div>
      <SessionList className="rounded-none border-0">
        {week.days.map((day) => (
          <SessionRow
            key={day.date}
            state={rowState(day)}
            past={day.isPast && !day.isToday}
            current={day.isToday ? "date" : undefined}
            day={day.dayLabel}
            title={rowTitle(day)}
            intensity={day.intensity}
            duration={day.family === "rest" ? undefined : day.duration}
            distance={day.family === "rest" ? undefined : day.distance}
            elevation={day.elevation}
            compliance={rowCompliance(day)}
            href={day.href ?? undefined}
            label={day.label}
            className="sm:px-2"
          />
        ))}
      </SessionList>
    </section>
  );
}

export function GoalSection({ goal }: { goal: TodayGoal | null }) {
  return (
    <section aria-labelledby="today-goal" className="flex flex-col gap-3">
      <h2
        id="today-goal"
        className="text-label font-medium text-muted-foreground"
      >
        {goal ? `Objectif ${goal.letter}` : "Objectif"}
      </h2>
      {goal ? (
        <>
          <Link
            href={goal.href}
            className="rounded-md text-body-lg font-semibold hover:text-primary"
          >
            {goal.name}
          </Link>
          <dl className="flex flex-col">
            <div className="grid min-h-7.5 grid-cols-[96px_minmax(0,1fr)] items-center gap-2.5">
              <dt className="text-muted-foreground">Échéance</dt>
              <dd className="flex min-w-0 flex-col py-1 tabular-nums">
                {goal.days === 0 ? "Jour J" : `J-${goal.days}`}
                <span className="text-label text-muted-foreground">
                  {goal.detail}
                </span>
              </dd>
            </div>
            {goal.block && (
              <div className="grid min-h-7.5 grid-cols-[96px_minmax(0,1fr)] items-center gap-2.5">
                <dt className="text-muted-foreground">Phase</dt>
                <dd className="flex items-baseline gap-2">
                  {goal.block.name}
                  <span className="text-muted-foreground tabular-nums">
                    {goal.block.week}
                  </span>
                </dd>
              </div>
            )}
            {goal.light && (
              <div className="grid min-h-7.5 grid-cols-[96px_minmax(0,1fr)] items-center gap-2.5">
                <dt className="text-muted-foreground">Semaine allégée</dt>
                <dd>{goal.light}</dd>
              </div>
            )}
          </dl>
        </>
      ) : (
        <p className="text-muted-foreground">
          Aucune course objectif pour l’instant.{" "}
          <Link
            href="/races"
            className="rounded-md text-primary hover:underline"
          >
            Voir les courses
          </Link>
        </p>
      )}
    </section>
  );
}
