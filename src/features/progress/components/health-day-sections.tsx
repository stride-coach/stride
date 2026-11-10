import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { MonoLabel } from "@/components/stride/mono-label";
import { StrideMark } from "@/components/stride/stride-mark";
import {
  GarminSyncLabel,
  GarminSyncSuffix,
} from "@/features/data-activity/components/synced-at";
import { cn } from "@/lib/utils";
import { formatClock, type HealthDayModel } from "../health-day";
import type { HealthDayView } from "../health-day-view";
import { formatStage } from "../health-view";
import { bodyHref } from "../health";
import { addDays } from "../period";

const weekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  timeZone: "UTC",
});
const fullDay = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

function date(day: string) {
  return new Date(`${day}T00:00:00Z`);
}

export function formatDayTitle(day: string, today: string) {
  const label = fullDay.format(date(day));
  return day === today
    ? `Aujourd’hui · ${label}`
    : day === addDays(today, -1)
      ? `Hier · ${label}`
      : label;
}

function dayHref(day: string, today: string) {
  return bodyHref("day", day === today ? null : day);
}

export function DayNavigator({
  day,
  today,
  strip,
}: {
  day: string;
  today: string;
  strip: { date: string; tone: "warning" | "success" | null }[];
}) {
  const next = addDays(day, 1);
  const arrow =
    "grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
  return (
    <section
      aria-label="Choisir une journée"
      className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex items-center gap-3">
        <Link
          href={dayHref(addDays(day, -1), today)}
          aria-label="Jour précédent"
          scroll={false}
          className={arrow}
        >
          <ChevronLeftIcon className="size-4" />
        </Link>
        <div className="flex min-w-0 flex-col">
          <span className="text-title font-semibold">
            {formatDayTitle(day, today)}
          </span>
          {day === today && <GarminSyncLabel />}
        </div>
        {next <= today ? (
          <Link
            href={dayHref(next, today)}
            aria-label="Jour suivant"
            scroll={false}
            className={arrow}
          >
            <ChevronRightIcon className="size-4" />
          </Link>
        ) : (
          <span aria-hidden="true" className={cn(arrow, "opacity-40")}>
            <ChevronRightIcon className="size-4" />
          </span>
        )}
      </div>
      <nav
        aria-label="Jours de la semaine"
        className="grid grid-cols-7 gap-1 rounded-2xl border border-border bg-card p-1"
      >
        {strip.map((item) => (
          <Link
            key={item.date}
            href={dayHref(item.date, today)}
            aria-current={item.date === day ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex min-w-11 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring",
              item.date === day && "bg-muted text-foreground",
            )}
          >
            <span className="text-label">
              {weekday.format(date(item.date))}
            </span>
            <span className="text-verdict leading-none font-semibold tabular-nums">
              {date(item.date).getUTCDate()}
            </span>
            <span
              aria-hidden="true"
              className={cn(
                "size-1.5 rounded-full",
                item.tone === "warning" && "bg-warning",
                item.tone === "success" && "bg-primary",
                item.tone === null && "bg-transparent",
              )}
            />
          </Link>
        ))}
      </nav>
    </section>
  );
}

export function DayReading({
  view,
  today,
}: {
  view: HealthDayView;
  today: boolean;
}) {
  return (
    <section
      aria-labelledby="health-day-reading"
      className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 sm:p-7"
    >
      <MonoLabel size="micro" className="flex items-center gap-2">
        <StrideMark className="size-3" />
        Lecture du jour{today && <GarminSyncSuffix />}
      </MonoLabel>
      <h2
        id="health-day-reading"
        className="text-[22px] leading-[1.15] font-semibold tracking-[-0.02em] text-balance sm:text-[28px]"
      >
        {view.headline}
      </h2>
      {view.paragraph && (
        <p className="text-body leading-[1.6] text-pretty text-secondary-foreground sm:text-[15px]">
          {view.paragraph}
        </p>
      )}
    </section>
  );
}

export function NightCard({
  night,
}: {
  night: NonNullable<HealthDayView["night"]>;
}) {
  const total = night.stages.reduce((sum, stage) => sum + stage.seconds, 0);
  return (
    <section
      aria-labelledby="health-day-night"
      className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 sm:p-6"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="health-day-night" className="text-title font-semibold">
          {night.title}
        </h2>
        <MonoLabel size="nano">Garmin · sommeil</MonoLabel>
      </div>
      {total > 0 && (
        <div className="flex flex-col gap-2">
          <div
            aria-hidden="true"
            className="flex h-2 gap-0.5 overflow-hidden rounded-full"
          >
            {night.stages.map((stage) => (
              <span
                key={stage.key}
                className={stage.swatch}
                style={{ width: `${(stage.seconds / total) * 100}%` }}
              />
            ))}
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 text-label text-secondary-foreground">
            {night.stages.map((stage) => (
              <li key={stage.key} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", stage.swatch)}
                />
                {stage.label}
                <b className="text-body font-semibold text-foreground tabular-nums">
                  {formatStage(stage.seconds)}
                </b>
              </li>
            ))}
          </ul>
        </div>
      )}
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {night.figures.map((figure) => (
          <div key={figure.label} className="flex flex-col gap-0.5">
            <dt>
              <MonoLabel size="nano">{figure.label}</MonoLabel>
            </dt>
            <dd className="text-metric leading-none font-semibold tabular-nums">
              {figure.value}
            </dd>
            <dd className="text-label text-muted-foreground">
              {figure.detail}
            </dd>
          </div>
        ))}
      </dl>
      {night.note && (
        <p className="flex items-start gap-2.5 rounded-lg border border-border bg-background px-4 py-3 text-body leading-normal text-pretty">
          <StrideMark className="mt-0.5 size-3.5 shrink-0" />
          <span>{night.note}</span>
        </p>
      )}
    </section>
  );
}

const momentDot = {
  warning: "bg-warning",
  success: "bg-primary",
  muted: "bg-muted-foreground",
  accent: "bg-primary",
} as const;

export function DayMoments({ model }: { model: HealthDayModel }) {
  return (
    <section
      aria-labelledby="health-day-moments"
      className="flex flex-col gap-3"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="health-day-moments"
          className="text-title font-semibold sm:text-verdict"
        >
          Moments de la journée
        </h2>
        <MonoLabel size="nano">Garmin + Stride</MonoLabel>
      </div>
      {model.moments.length ? (
        <ol className="flex flex-col border-t border-border">
          {model.moments.map((moment) => (
            <li
              key={`${moment.at}-${moment.title}`}
              className="grid grid-cols-[3.5rem_0.75rem_minmax(0,1fr)] items-start gap-3 border-b border-border py-3.5"
            >
              <span className="text-title leading-tight font-semibold tabular-nums">
                {formatClock(moment.at)}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-2 size-2 rounded-full",
                  momentDot[moment.tone],
                )}
              />
              <span className="flex flex-col gap-0.5">
                <span className="text-body font-semibold">{moment.title}</span>
                <span className="text-body text-secondary-foreground">
                  {moment.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="border-t border-border pt-3 text-body text-muted-foreground">
          Aucun moment marquant détecté pour l’instant.
        </p>
      )}
    </section>
  );
}

export function DayUnavailable({
  failure,
}: {
  failure: "unavailable" | "reconnect" | "rate-limited" | null;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <h2 className="text-title font-semibold">
        Courbes de la journée indisponibles
      </h2>
      <p className="text-body text-secondary-foreground">
        {failure === "reconnect"
          ? "Ta connexion Garmin doit être renouvelée pour charger le détail de la journée."
          : failure === "rate-limited"
            ? "Garmin limite temporairement les requêtes. Réessaie dans quelques minutes."
            : "Stride n’a pas pu charger le détail de cette journée depuis Garmin. Les résumés quotidiens restent disponibles en vue Semaine."}
      </p>
      {failure === "reconnect" && (
        <Link
          href="/settings/connections"
          className="text-body text-primary hover:underline"
        >
          Ouvrir les connexions
        </Link>
      )}
    </section>
  );
}
