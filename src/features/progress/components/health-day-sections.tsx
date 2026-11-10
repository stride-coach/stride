import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Widget } from "@/components/stride/widget";
import { StrideMark } from "@/components/stride/stride-mark";
import {
  GarminSyncLabel,
  GarminSyncSuffix,
} from "@/features/data-activity/components/synced-at";
import { cn } from "@/lib/utils";
import { formatClock, type HealthDayModel } from "../health-day";
import type { HealthDayView } from "../health-day-view";
import { formatStage } from "../health-view";
import { recoveryHref } from "../health";
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
  return recoveryHref("day", day === today ? null : day);
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
    "grid size-control-touch shrink-0 place-items-center rounded-md border border-control-border text-secondary-foreground transition-colors duration-150 ease-stride hover:text-foreground md:size-control";
  return (
    <section
      aria-label="Choisir une journée"
      className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
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
          <span className="text-body-lg font-semibold">
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
        className="grid grid-cols-7 gap-0.5 rounded-lg border border-border bg-card p-0.5"
      >
        {strip.map((item) => (
          <Link
            key={item.date}
            href={dayHref(item.date, today)}
            aria-current={item.date === day ? "page" : undefined}
            scroll={false}
            className={cn(
              "flex min-w-11 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-muted-foreground transition-colors duration-150 ease-stride hover:text-foreground",
              item.date === day && "bg-muted font-medium text-foreground",
            )}
          >
            <span className="text-label">
              {weekday.format(date(item.date))}
            </span>
            <span className="text-body-lg font-semibold tabular-nums">
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
      className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <p className="flex items-center gap-2 text-label text-secondary-foreground">
        <StrideMark className="size-3" />
        Lecture du jour{today && <GarminSyncSuffix />}
      </p>
      <h2
        id="health-day-reading"
        className="text-title font-semibold text-balance"
      >
        {view.headline}
      </h2>
      {view.paragraph && (
        <p className="text-body text-pretty text-secondary-foreground">
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
    <Widget
      headingLevel={2}
      title={<span id="health-day-night">{night.title}</span>}
      aria-labelledby="health-day-night"
      verdict={
        <span className="text-label font-normal text-muted-foreground">
          Garmin · sommeil
        </span>
      }
    >
      <div className="flex flex-col gap-3.5">
        {total > 0 && (
          <div className="flex flex-col gap-2">
            <div
              aria-hidden="true"
              className="flex h-1.5 gap-0.5 overflow-hidden rounded-mark"
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
                  <b className="font-semibold text-foreground tabular-nums">
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
              <dt className="text-label text-secondary-foreground">
                {figure.label}
              </dt>
              <dd
                data-slot="metric"
                className="text-title font-semibold tabular-nums"
              >
                {figure.value}
              </dd>
              <dd className="text-label text-muted-foreground">
                {figure.detail}
              </dd>
            </div>
          ))}
        </dl>
        {night.note && (
          <p className="flex items-start gap-2 border-t border-border pt-3 text-body text-pretty text-secondary-foreground">
            <StrideMark className="mt-1 size-3 shrink-0" />
            <span>{night.note}</span>
          </p>
        )}
      </div>
    </Widget>
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
    <Widget
      headingLevel={2}
      title={<span id="health-day-moments">Moments de la journée</span>}
      aria-labelledby="health-day-moments"
      verdict={
        <span className="text-label font-normal text-muted-foreground">
          Garmin + Stride
        </span>
      }
    >
      {model.moments.length ? (
        <ol className="flex flex-col">
          {model.moments.map((moment) => (
            <li
              key={`${moment.at}-${moment.title}`}
              className="grid grid-cols-[3rem_0.5rem_minmax(0,1fr)] items-start gap-3 border-b border-border py-2.5 last:border-b-0"
            >
              <span className="font-semibold tabular-nums">
                {formatClock(moment.at)}
              </span>
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 size-1.5 rounded-full",
                  momentDot[moment.tone],
                )}
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium">{moment.title}</span>
                <span className="text-body text-secondary-foreground">
                  {moment.detail}
                </span>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-body text-muted-foreground">
          Aucun moment marquant détecté pour l’instant.
        </p>
      )}
    </Widget>
  );
}

export function DayUnavailable({
  failure,
}: {
  failure: "unavailable" | "reconnect" | "rate-limited" | null;
}) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5">
      <h2 className="text-body-lg font-semibold">
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
