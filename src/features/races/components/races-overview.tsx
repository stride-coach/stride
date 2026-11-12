import { cn } from "@/lib/utils";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Chip } from "@/components/stride/chip";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";
import { ultraDistanceKm } from "@/features/progress/goal";
import {
  formatClock,
  formatDuration,
  formatInteger,
  formatKm,
} from "../format";
import {
  raceOutcome,
  seasonRole,
  targetPace,
  type CurrentValue,
  type RaceDemand,
  type SeasonTone,
} from "../season";
import type { RaceOnTrack } from "../on-track";
import { countdownLabel, type SeasonTimeline } from "../overview";
import { formatResultTime, type RaceResult } from "../results";
import {
  defaultStartMinutes,
  formatCompactDate,
  formatDayDate,
  formatRaceDate,
  formatShortDate,
  type RacePlan,
  type RaceSummary,
  type StoredCourse,
} from "../race";

export function PriorityBadge({
  priority,
  planned = true,
  small = false,
}: {
  priority: RaceSummary["priority"];
  planned?: boolean;
  small?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-sm text-label font-semibold tabular-nums",
        small ? "size-4.5" : "size-5.5",
        priority === "A"
          ? "bg-primary text-primary-foreground"
          : cn(
              "border text-secondary-foreground",
              planned
                ? "border-control-border"
                : "border-dashed border-control-border",
            ),
      )}
    >
      {priority}
    </span>
  );
}

const phaseTones = ["bg-muted", "bg-primary/12", "bg-primary/22", "bg-muted"];

function TimelineBadge({ priority }: { priority: RaceSummary["priority"] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center leading-none font-semibold tabular-nums",
        priority === "A"
          ? "size-5 rounded-sm bg-primary text-label text-primary-foreground"
          : "size-4.5 rounded-sm border border-muted-foreground bg-background text-label text-secondary-foreground",
      )}
    >
      {priority}
    </span>
  );
}

const graphicWidth = 260;
const bandTop = 64;
const badgeTop = bandTop - 33;
const lineHeight = bandTop + 24;
const monthTop = lineHeight + 4;

function SeasonGraphic({ timeline }: { timeline: SeasonTimeline }) {
  return (
    <div
      aria-hidden="true"
      className="relative"
      style={{ height: monthTop + 14 }}
    >
      {timeline.months.map((month) => (
        <span
          key={month.key}
          className="absolute top-0 border-l border-border"
          style={{ left: `${month.left}%`, height: lineHeight }}
        >
          <span
            className="absolute left-0.75 text-label text-muted-foreground"
            style={{ top: monthTop }}
          >
            {month.label}
          </span>
        </span>
      ))}
      {timeline.phases.map((phase) => (
        <span
          key={phase.key}
          className={cn(
            "absolute flex h-4 items-center overflow-hidden rounded-sm border-r-2 border-background px-1.5 text-label whitespace-nowrap text-secondary-foreground",
            phaseTones[phase.stage],
          )}
          style={{
            left: `${phase.left}%`,
            width: `${phase.width}%`,
            top: bandTop,
          }}
        >
          {(phase.width / 100) * graphicWidth >=
            phase.label.length * 5.5 + 12 && phase.label}
        </span>
      ))}
      <span
        className="absolute top-1.5 border-l border-foreground"
        style={{ left: `${timeline.today}%`, height: lineHeight - 6 }}
      >
        <span className="absolute -top-1.5 left-1 text-label font-medium">
          Auj.
        </span>
      </span>
      {timeline.markers.map((marker) => (
        <div
          key={marker.id}
          className="absolute -translate-x-1/2"
          style={{ left: `${marker.left}%`, top: badgeTop }}
        >
          <TimelineBadge priority={marker.priority} />
          {marker.priority === "A" && (
            <span className="absolute -top-5 right-0 text-label leading-4 whitespace-nowrap text-foreground">
              {marker.short}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

const panelHeading = "text-label font-medium text-muted-foreground";

export function SeasonCard({ timeline }: { timeline: SeasonTimeline }) {
  const label = `Saison ${timeline.range} : ${timeline.markers
    .map((marker) => `${marker.name} le ${formatShortDate(marker.date)}`)
    .join(", ")}`;
  return (
    <section
      aria-labelledby="races-season"
      className="flex min-w-0 flex-col gap-2.5 border-b border-border py-4.5"
    >
      <div className="flex items-baseline gap-3">
        <h2 id="races-season" className={panelHeading}>
          Saison
        </h2>
        <Link
          href="/plan"
          className="ml-auto inline-flex min-h-control-touch items-center text-label text-primary hover:text-foreground md:min-h-0"
        >
          Voir le plan
        </Link>
      </div>
      <div role="img" aria-label={label}>
        <SeasonGraphic timeline={timeline} />
      </div>
      <p className="text-label text-muted-foreground">
        {timeline.phases.length
          ? `Phases du plan et courses, ${timeline.range}. `
          : `Courses à venir, ${timeline.range}. `}
        A : l’objectif. B : une course qu’on prépare. C : une course qu’on court
        sans affûtage.
      </p>
    </section>
  );
}

const kindLabels: Record<RaceSummary["kind"], string> = {
  road: "Route",
  trail: "Trail",
};

function Figure({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col-reverse gap-0.5">
      <dt className="text-label text-secondary-foreground">{label}</dt>
      <dd
        data-slot="metric"
        className="text-title font-semibold whitespace-nowrap tabular-nums"
      >
        {children}
      </dd>
    </div>
  );
}

const toneClasses: Record<SeasonTone, string> = {
  success: "text-primary",
  warning: "text-warning",
  muted: "text-muted-foreground",
};

function kindLabel(race: Pick<RaceSummary, "kind" | "distanceKm">) {
  return race.kind === "trail" && (race.distanceKm ?? 0) >= ultraDistanceKm
    ? `${kindLabels.trail} · ultra`
    : kindLabels[race.kind];
}

function DemandRow({ demand }: { demand: RaceDemand }) {
  return (
    <li className="flex flex-col gap-1.5 border-t border-border py-2.5">
      <span className="flex items-baseline gap-3">
        <span className="min-w-0 flex-1 truncate">{demand.label}</span>
        <span className="font-semibold tabular-nums">{demand.current}</span>
        <span className="text-label text-muted-foreground tabular-nums">
          <span aria-hidden="true">→ </span>
          <span className="sr-only">sur </span>
          {demand.target}
        </span>
      </span>
      <span
        aria-hidden="true"
        className="h-0.75 overflow-hidden rounded-full bg-muted"
      >
        <span
          className="block h-full rounded-full bg-primary"
          style={{ width: `${Math.round(demand.ratio * 100)}%` }}
        />
      </span>
    </li>
  );
}

export function DemandList({
  demands,
  headingId,
}: {
  demands: RaceDemand[];
  headingId: string;
}) {
  return (
    <section aria-labelledby={headingId} className="flex flex-col">
      <h3
        id={headingId}
        className="pb-2 text-label font-medium text-secondary-foreground"
      >
        Où tu en es → ce que la course demande
      </h3>
      <ul className="flex flex-col">
        {demands.map((demand) => (
          <DemandRow key={demand.key} demand={demand} />
        ))}
      </ul>
      <p className="border-t border-border pt-2 text-label text-muted-foreground">
        Tes meilleures marques des 6 derniers mois.
      </p>
    </section>
  );
}

export function FeaturedRace({
  race,
  plan,
  course,
  onTrack,
  demands,
  today,
}: {
  race: RaceSummary;
  plan: RacePlan;
  course: StoredCourse | null;
  onTrack: RaceOnTrack | null;
  demands: RaceDemand[];
  today: string;
}) {
  const countdown = countdownLabel(race.date, today);
  const distance = course
    ? `${formatKm(course.distanceM)} km`
    : race.distanceKm
      ? `${formatInteger(race.distanceKm)} km`
      : null;
  const gain = course?.elevationGainM ?? race.elevationGainM;
  const start = plan.startMinutes ?? defaultStartMinutes;
  const pace = targetPace(race);
  const reading = onTrack?.goal.verdict ?? null;
  return (
    <section
      aria-labelledby="races-featured"
      className="flex flex-col gap-4 border-b border-border px-4 py-4.5 md:px-5"
    >
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <PriorityBadge priority={race.priority} />
        <span className="sr-only">Course {race.priority}</span>
        <h2
          id="races-featured"
          className="min-w-0 text-verdict font-semibold text-balance"
        >
          {race.name}
        </h2>
        <Chip className="max-md:hidden">{kindLabel(race)}</Chip>
        <span className="flex items-baseline gap-2 max-sm:basis-full sm:ml-auto">
          {countdown && (
            <span className="text-verdict font-semibold tabular-nums">
              {countdown}
            </span>
          )}
          {race.date && (
            <span className="text-label text-muted-foreground">
              <span className="md:hidden">{formatDayDate(race.date)}</span>
              <span className="max-md:hidden">{formatRaceDate(race.date)}</span>
              {" · "}
              {formatClock(start)}
            </span>
          )}
        </span>
      </div>
      {reading && (
        <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
          <StrideMark className="mt-1 size-3.5 shrink-0" />
          {reading}
        </p>
      )}
      <div className="grid gap-x-7 gap-y-4 lg:grid-cols-2">
        <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3 border-y border-border py-3.5">
          <Figure label="Distance">{distance ?? "—"}</Figure>
          <Figure label="Dénivelé">
            {gain !== null ? `+${formatInteger(gain)} m` : "—"}
          </Figure>
          <Figure label="Objectif">
            {race.targetSeconds ? formatDuration(race.targetSeconds) : "—"}
          </Figure>
          <Figure label="Allure moyenne">{pace ?? "—"}</Figure>
        </dl>
        {demands.length > 0 && (
          <DemandList demands={demands} headingId="races-demands" />
        )}
      </div>
      <div className="flex flex-wrap gap-2 max-md:grid max-md:grid-cols-2">
        <Button asChild>
          <Link href={`/races/${race.id}`}>Voir le plan de course</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href={`/races/${race.id}/edit`}>Modifier l’objectif</Link>
        </Button>
      </div>
    </section>
  );
}

function GroupHeader({
  id,
  title,
  detail,
  end,
}: {
  id: string;
  title: string;
  detail?: string;
  end?: string;
}) {
  return (
    <h2
      id={id}
      className="flex items-baseline gap-2 border-b border-border bg-muted px-4 py-2 text-label font-normal md:px-5"
    >
      <span className="font-medium text-foreground">{title}</span>
      {detail && <span className="text-secondary-foreground">{detail}</span>}
      {end && (
        <span className="ml-auto text-secondary-foreground max-lg:hidden">
          {end}
        </span>
      )}
    </h2>
  );
}

const upcomingColumns =
  "lg:grid-cols-[22px_88px_minmax(0,1fr)_88px_64px_72px_64px_48px_minmax(0,10rem)]";

export function UpcomingRaces({
  races,
  today,
}: {
  races: RaceSummary[];
  today: string;
}) {
  return (
    <section aria-labelledby="races-upcoming">
      <GroupHeader
        id="races-upcoming"
        title="À venir"
        detail={`${races.length} ${races.length > 1 ? "courses" : "course"}`}
      />
      <div
        aria-hidden="true"
        className={cn(
          "grid items-center gap-3 border-b border-border px-4 py-2 text-label text-muted-foreground max-lg:hidden md:px-5",
          upcomingColumns,
        )}
      >
        <span />
        <span>Date</span>
        <span>Course</span>
        <span>Type</span>
        <span className="text-right">Distance</span>
        <span className="text-right">Dénivelé</span>
        <span className="text-right">Objectif</span>
        <span />
        <span className="text-right">Rôle dans la saison</span>
      </div>
      <ul>
        {races.map((race) => {
          const countdown = countdownLabel(race.date, today);
          const target = race.targetSeconds
            ? formatDuration(race.targetSeconds)
            : null;
          const summary = [
            race.date ? formatCompactDate(race.date) : "Date à définir",
            race.distanceKm ? `${formatInteger(race.distanceKm)} km` : null,
            race.elevationGainM
              ? `+${formatInteger(race.elevationGainM)} m`
              : null,
          ].filter(Boolean);
          return (
            <li key={race.id} className="border-b border-border">
              <Link
                href={`/races/${race.id}`}
                prefetch={false}
                className={cn(
                  "grid min-h-row-touch grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-2.5 transition-colors duration-150 ease-stride hover:bg-muted focus-visible:outline-offset-[-2px] md:px-5 lg:min-h-row lg:py-0",
                  upcomingColumns,
                )}
              >
                <PriorityBadge priority={race.priority} small />
                <span className="flex min-w-0 flex-col gap-0.5 lg:contents">
                  <span className="text-muted-foreground tabular-nums max-lg:hidden">
                    {race.date ? formatCompactDate(race.date) : "—"}
                  </span>
                  <span className="min-w-0 truncate font-medium">
                    <span className="sr-only">Course {race.priority} · </span>
                    {race.name}
                  </span>
                  <span className="truncate text-label text-muted-foreground tabular-nums lg:hidden">
                    {summary.join(" · ")}
                  </span>
                  <span className="max-lg:hidden">
                    <Chip>{kindLabels[race.kind]}</Chip>
                  </span>
                  <span className="text-right tabular-nums max-lg:hidden">
                    {race.distanceKm
                      ? `${formatInteger(race.distanceKm)} km`
                      : "—"}
                  </span>
                  <span className="text-right text-secondary-foreground tabular-nums max-lg:hidden">
                    {race.elevationGainM
                      ? `+${formatInteger(race.elevationGainM)} m`
                      : "—"}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5 lg:contents">
                  <span
                    data-slot="metric"
                    className="text-right font-semibold tabular-nums"
                  >
                    {target ?? (
                      <span className="font-normal text-muted-foreground">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">sans objectif</span>
                      </span>
                    )}
                  </span>
                  <span className="text-right text-label text-muted-foreground tabular-nums lg:text-body">
                    {countdown ?? ""}
                  </span>
                </span>
                <span className="truncate text-right text-secondary-foreground max-lg:hidden">
                  {seasonRole(race, races)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function OpenSlot({ priority }: { priority: "B" }) {
  return (
    <section
      aria-labelledby="races-slot"
      className="flex flex-col gap-2.5 border-b border-border py-4.5"
    >
      <h2
        id="races-slot"
        className="flex items-center gap-2 text-label font-medium text-muted-foreground"
      >
        <PriorityBadge priority={priority} planned={false} small />
        Place pour une course B
      </h2>
      <p className="text-body text-pretty text-secondary-foreground">
        Une course B sert de répétition générale avant l’objectif : départ,
        nutrition et équipement testés dans les conditions réelles.
      </p>
      <Button asChild variant="outline" className="self-start">
        <Link href="/races/new?priority=B">Ajouter une course B</Link>
      </Button>
    </section>
  );
}

const pastColumns =
  "lg:grid-cols-[22px_88px_minmax(0,1fr)_88px_64px_72px_64px_minmax(0,10rem)]";

export function PastRaces({
  races,
  results,
}: {
  races: RaceSummary[];
  results: Record<string, RaceResult>;
}) {
  return (
    <section aria-labelledby="races-past">
      <GroupHeader id="races-past" title="Passées" end="Résultat" />
      <ul>
        {races.map((race) => {
          const result = results[race.id];
          const outcome = raceOutcome(race, result);
          const distance = result
            ? `${formatKm(result.distanceMeters)} km`
            : race.distanceKm
              ? `${formatInteger(race.distanceKm)} km`
              : null;
          const gain = race.elevationGainM
            ? `+${formatInteger(race.elevationGainM)} m`
            : null;
          return (
            <li
              key={race.id}
              className={cn(
                "grid min-h-row-touch grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5 border-b border-border px-4 py-2.5 md:px-5 lg:min-h-row lg:py-0",
                pastColumns,
              )}
            >
              <PriorityBadge priority={race.priority} small />
              <span className="flex min-w-0 flex-col gap-0.5 lg:contents">
                <span className="text-muted-foreground tabular-nums max-lg:hidden">
                  {race.date ? formatCompactDate(race.date) : "—"}
                </span>
                <Link
                  href={`/races/${race.id}`}
                  prefetch={false}
                  className="inline-flex min-h-control-touch min-w-0 items-center truncate font-medium hover:text-primary lg:min-h-0"
                >
                  <span className="sr-only">Course {race.priority} · </span>
                  {race.name}
                </Link>
                <span className="truncate text-label text-muted-foreground tabular-nums lg:hidden">
                  {[
                    race.date ? formatCompactDate(race.date) : null,
                    distance,
                    gain,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <span className="max-lg:hidden">
                  <Chip>{kindLabel(race)}</Chip>
                </span>
                <span className="text-right tabular-nums max-lg:hidden">
                  {distance ?? "—"}
                </span>
                <span className="text-right text-secondary-foreground tabular-nums max-lg:hidden">
                  {gain ?? "—"}
                </span>
              </span>
              <span className="flex flex-col items-end gap-0.5 lg:contents">
                <span
                  data-slot="metric"
                  className="text-right font-semibold tabular-nums"
                >
                  {result ? (
                    <Link
                      href={`/activities/${result.activityId}`}
                      prefetch={false}
                      aria-label={`${formatResultTime(result.seconds)}, voir l’activité`}
                      className="hover:text-primary"
                    >
                      {formatResultTime(result.seconds)}
                    </Link>
                  ) : (
                    "—"
                  )}
                </span>
                <span
                  className={cn(
                    "flex items-center justify-end gap-1.5 text-right text-label lg:text-body",
                    toneClasses[outcome.tone],
                  )}
                >
                  {outcome.tone !== "muted" && (
                    <span
                      aria-hidden="true"
                      className="size-1.5 shrink-0 rounded-full bg-current"
                    />
                  )}
                  {outcome.label}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function CurrentValues({ values }: { values: CurrentValue[] }) {
  if (values.length === 0) return null;
  return (
    <section
      aria-labelledby="races-values"
      className="flex flex-col gap-2.5 border-b border-border py-4.5"
    >
      <h2 id="races-values" className={panelHeading}>
        Ce que tu vaux aujourd’hui
      </h2>
      <dl className="flex flex-col gap-2">
        {values.map((value) => (
          <div
            key={value.key}
            className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-baseline gap-3"
          >
            <dt className="text-secondary-foreground">{value.label}</dt>
            <dd className="font-semibold tabular-nums">{value.time}</dd>
            <dd
              className={cn("text-label tabular-nums", toneClasses[value.tone])}
            >
              {value.change}
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-label text-muted-foreground">
        Prévisions Garmin. Évolution sur 4 semaines.
      </p>
    </section>
  );
}

export function NextRace({
  race,
  today,
}: {
  race: RaceSummary;
  today: string;
}) {
  const countdown = countdownLabel(race.date, today);
  const pace = targetPace(race);
  return (
    <section
      aria-labelledby="races-next"
      className="flex flex-col gap-2.5 border-b border-border py-4.5"
    >
      <h2 id="races-next" className={panelHeading}>
        Prochaine échéance
      </h2>
      <dl className="flex flex-col gap-2">
        <div className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-baseline gap-3">
          <dt className="text-secondary-foreground">Course</dt>
          <dd className="min-w-0 font-semibold text-pretty">
            <Link href={`/races/${race.id}`} className="hover:text-primary">
              {race.name}
            </Link>
          </dd>
          <dd className="text-label text-muted-foreground tabular-nums">
            {countdown}
          </dd>
        </div>
        {pace && (
          <div className="grid grid-cols-[88px_minmax(0,1fr)] items-baseline gap-3">
            <dt className="text-secondary-foreground">Allure cible</dt>
            <dd className="font-semibold tabular-nums">{pace}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
