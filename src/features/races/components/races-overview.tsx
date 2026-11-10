import { cn } from "@/lib/utils";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { MonoLabel } from "@/components/stride/mono-label";
import { SourceMark } from "@/components/stride/marks";
import { Button } from "@/components/ui/button";
import {
  formatClock,
  formatDuration,
  formatInteger,
  formatKm,
} from "../format";
import type { GoalCard } from "@/features/progress/goal";
import type { RaceOnTrack } from "../on-track";
import { countdownLabel, type SeasonTimeline } from "../overview";
import {
  formatResultDelta,
  formatResultTime,
  type RaceResult,
} from "../results";
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
import { OnTrack } from "./on-track";

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
        "flex shrink-0 items-center justify-center font-metric font-bold",
        small ? "size-6 rounded-sm text-sm" : "size-8 rounded-md text-base",
        priority === "A"
          ? "bg-primary text-primary-foreground"
          : cn(
              "border-[1.5px] text-secondary-foreground",
              planned ? "border-border-strong" : "border-dashed border-dim",
            ),
      )}
    >
      {priority}
    </span>
  );
}

const phaseTones = ["bg-border", "bg-primary/12", "bg-primary/22", "bg-border"];

function TimelineBadge({ priority }: { priority: RaceSummary["priority"] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center font-metric leading-none font-bold",
        priority === "A"
          ? "size-5.5 rounded-md bg-primary text-sm text-primary-foreground"
          : "size-5 rounded-sm border-[1.5px] border-dim bg-background text-meta text-secondary-foreground",
      )}
    >
      {priority}
    </span>
  );
}

function SeasonGraphic({
  timeline,
  compact,
}: {
  timeline: SeasonTimeline;
  compact: boolean;
}) {
  const lanes = compact ? 1 : timeline.lanes;
  const laneHeight = 24;
  const bandTop = compact ? 64 : 48 + lanes * laneHeight;
  const badgeTop = bandTop - 33;
  const lineHeight = bandTop + 24;
  const monthTop = lineHeight + 4;
  return (
    <div
      aria-hidden="true"
      className={cn("relative", compact ? "md:hidden" : "max-md:hidden")}
      style={{ height: monthTop + 14 }}
    >
      {timeline.months.map((month) => (
        <span
          key={month.key}
          className="absolute top-0 border-l border-border-subtle"
          style={{ left: `${month.left}%`, height: lineHeight }}
        >
          <MonoLabel
            size={compact ? "nano" : "micro"}
            className="absolute left-0.75"
            style={{ top: monthTop }}
          >
            {month.label}
          </MonoLabel>
        </span>
      ))}
      {timeline.phases.map((phase) => (
        <span
          key={phase.key}
          className={cn(
            "absolute flex h-4 items-center overflow-hidden rounded-sm border-r-2 border-card px-1.5 whitespace-nowrap text-secondary-foreground",
            compact ? "text-micro" : "text-label",
            "tracking-normal",
            phaseTones[phase.stage],
          )}
          style={{
            left: `${phase.left}%`,
            width: `${phase.width}%`,
            top: bandTop,
          }}
        >
          {(compact
            ? (phase.width / 100) * 350 >= phase.label.length * 5.5 + 12
            : phase.labelled) && phase.label}
        </span>
      ))}
      <span
        className="absolute top-1.5 border-l border-foreground"
        style={{ left: `${timeline.today}%`, height: lineHeight - 6 }}
      >
        <MonoLabel
          size="nano"
          tone="foreground"
          className="absolute -top-1.5 left-1"
        >
          Auj.
        </MonoLabel>
      </span>
      {timeline.markers.map((marker) => {
        const end = marker.align === "end";
        const label = compact ? marker.short : marker.label;
        const showLabel = !compact || marker.priority === "A";
        return (
          <div
            key={marker.id}
            className="absolute -translate-x-1/2"
            style={{ left: `${marker.left}%`, top: badgeTop }}
          >
            <TimelineBadge priority={marker.priority} />
            {showLabel && (
              <span
                className={cn(
                  "absolute leading-4 whitespace-nowrap text-foreground",
                  compact ? "text-[11px]" : "text-xs",
                  compact
                    ? "-top-5 right-0"
                    : end
                      ? "top-0.75 right-full mr-1.25"
                      : marker.align === "start"
                        ? "left-0"
                        : "left-1/2 -translate-x-1/2",
                )}
                style={
                  compact || end
                    ? undefined
                    : { top: -20 - marker.lane * laneHeight }
                }
              >
                {label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SeasonCard({ timeline }: { timeline: SeasonTimeline }) {
  const label = `Saison ${timeline.range} : ${timeline.markers
    .map((marker) => `${marker.name} le ${formatShortDate(marker.date)}`)
    .join(", ")}`;
  return (
    <section className="flex min-w-0 flex-col gap-1.5 rounded-2xl border border-border bg-card px-3.5 pt-3.5 pb-2 md:gap-2 md:px-5.5 md:pt-4.5 md:pb-2.5">
      <div className="flex items-baseline gap-3">
        <MonoLabel size="nano" className="md:text-micro">
          Ta saison
        </MonoLabel>
        <span className="text-xs text-muted-foreground max-md:hidden">
          {timeline.phases.length
            ? `Phases du plan et courses, ${timeline.range}`
            : `Courses à venir, ${timeline.range}`}
        </span>
        <Link
          href="/plan"
          className="ml-auto text-xs text-primary hover:text-foreground md:text-meta"
        >
          <span className="md:hidden">Plan →</span>
          <span className="max-md:hidden">Voir le plan →</span>
        </Link>
      </div>
      <div role="img" aria-label={label}>
        <SeasonGraphic timeline={timeline} compact={false} />
        <SeasonGraphic timeline={timeline} compact />
      </div>
    </section>
  );
}

export function FeaturedRace({
  race,
  plan,
  course,
  onTrack,
  today,
}: {
  race: RaceSummary;
  plan: RacePlan;
  course: StoredCourse | null;
  onTrack: RaceOnTrack | null;
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
  const meta = [
    distance,
    gain !== null ? `${formatInteger(gain)} m D+` : null,
    `départ ${formatClock(start)}`,
  ].filter(Boolean);
  const objective = race.targetSeconds
    ? `objectif ${formatDuration(race.targetSeconds)}`
    : null;
  return (
    <section
      aria-label={race.name}
      className="flex flex-col gap-4 rounded-[16px] border border-primary/30 bg-card p-4.5 sm:gap-5 sm:px-7 sm:py-6.5"
    >
      <div className="flex items-center gap-3">
        <PriorityBadge priority={race.priority} />
        <MonoLabel size="nano" className="min-w-0 truncate md:text-label">
          {race.priority === "A" ? "Objectif" : `Course ${race.priority}`}
          {race.date && (
            <>
              <span className="md:hidden"> · {formatDayDate(race.date)}</span>
              <span className="max-md:hidden">
                {" "}
                · {formatRaceDate(race.date)}
              </span>
            </>
          )}
        </MonoLabel>
        {countdown && (
          <span className="ml-auto shrink-0 font-metric text-[22px] leading-none font-semibold tabular-nums sm:text-[28px]">
            {countdown}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="text-[26px] leading-[1.05] font-semibold tracking-[-0.02em] text-balance sm:text-[32px]">
          {race.name}
        </h2>
        <span className="text-meta text-muted-foreground max-sm:basis-full sm:text-sm">
          {meta.join(" · ")}
          {objective && <span className="max-sm:hidden"> · {objective}</span>}
        </span>
        <Button asChild size="md" className="ml-auto rounded-lg max-sm:hidden">
          <Link href={`/races/${race.id}`}>Ouvrir la course</Link>
        </Button>
      </div>
      {onTrack && <OnTrack onTrack={onTrack} />}
      <Button asChild size="lg" className="w-full rounded-lg sm:hidden">
        <Link href={`/races/${race.id}`}>Ouvrir la course</Link>
      </Button>
    </section>
  );
}

export function CalendarCard({
  race,
  today,
  goal = null,
}: {
  race: RaceSummary;
  today: string;
  goal?: GoalCard | null;
}) {
  const label = countdownLabel(race.date, today);
  const distance = race.distanceKm
    ? `${formatInteger(race.distanceKm)} km`
    : null;
  const gain = race.elevationGainM
    ? `${formatInteger(race.elevationGainM)} m D+`
    : null;
  const cells = goal?.road
    ? [
        { label: "Objectif", value: goal.target ?? "—", tone: null },
        {
          label: "Prévision",
          value: goal.road.prediction ?? "—",
          tone: null,
          provider: true,
        },
        {
          label: "Écart",
          value: goal.gap?.label ?? "—",
          tone: goal.gap?.tone ?? null,
        },
      ]
    : [
        {
          label: "Objectif",
          value: race.targetSeconds ? formatDuration(race.targetSeconds) : "—",
          tone: null,
        },
      ];
  return (
    <Link
      href={`/races/${race.id}`}
      prefetch={false}
      className="flex min-w-0 flex-col gap-2.5 rounded-2xl border border-border bg-card p-4 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring md:gap-3.5 md:px-6 md:py-5.5"
    >
      <span className="flex items-center gap-2.5">
        <PriorityBadge priority={race.priority} small />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[15px] font-semibold md:text-base">
            {race.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {race.date && (
              <>
                <span className="md:hidden">
                  {formatCompactDate(race.date)}
                </span>
                <span className="max-md:hidden">
                  {formatCompactDate(race.date, true)}
                </span>
              </>
            )}
            {!race.date && "Date à définir"}
            {[distance, gain]
              .filter(Boolean)
              .map((item) => ` · ${item}`)
              .join("")}
          </span>
        </span>
        {label && (
          <span className="shrink-0 font-metric text-xl leading-none font-semibold tabular-nums md:text-[22px]">
            {label}
          </span>
        )}
      </span>
      <span className="grid grid-cols-3 gap-2 border-t border-border pt-2 md:pt-3">
        {cells.map((item) => (
          <span key={item.label} className="flex flex-col md:gap-0.5">
            <MonoLabel
              size="nano"
              className="flex items-center gap-1.5 md:text-micro"
            >
              {"provider" in item && (
                <SourceMark source="provider" className="max-md:hidden" />
              )}
              {item.label}
            </MonoLabel>
            <span
              className={cn(
                "font-metric text-lg leading-tight font-semibold tabular-nums md:text-[22px]",
                item.tone === "success" && "text-success",
                item.tone === "warning" && "text-warning",
              )}
            >
              {item.value}
            </span>
          </span>
        ))}
      </span>
    </Link>
  );
}

export function OpenSlot({ priority }: { priority: "B" }) {
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-2xl border border-dashed border-dim px-6 py-5.5">
      <div className="flex items-center gap-2.5">
        <PriorityBadge priority={priority} planned={false} small />
        <h3 className="text-[15px] font-semibold">Place pour une course B</h3>
      </div>
      <p className="text-meta leading-relaxed text-pretty text-secondary-foreground">
        Une course B sert de répétition générale avant l’objectif : départ,
        nutrition et équipement testés dans les conditions réelles.
      </p>
      <Button
        asChild
        variant="outline"
        size="md"
        className="self-start rounded-lg"
      >
        <Link href="/settings/goals">Ajouter une course B</Link>
      </Button>
    </section>
  );
}

export function PastRaces({
  races,
  results,
}: {
  races: RaceSummary[];
  results: Record<string, RaceResult>;
}) {
  return (
    <ul className="flex flex-col">
      {races.map((race) => {
        const result = results[race.id];
        const distance = result
          ? `${formatKm(result.distanceMeters)} km`
          : race.distanceKm
            ? `${formatInteger(race.distanceKm)} km`
            : null;
        return (
          <li
            key={race.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.75 border-t border-border py-3.25 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_90px_minmax(0,1fr)_110px] md:gap-x-4"
          >
            <Link
              href={`/races/${race.id}`}
              prefetch={false}
              className="min-w-0 truncate text-[15px] font-semibold hover:text-primary focus-visible:outline-2 focus-visible:outline-ring"
            >
              {race.name}
            </Link>
            <span className="text-xs text-muted-foreground max-md:order-3 md:text-meta">
              {[race.date ? formatCompactDate(race.date) : null, distance]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="font-metric text-xl leading-none font-semibold tabular-nums max-md:order-2 max-md:text-right">
              {result ? formatResultTime(result.seconds) : "—"}
            </span>
            <span className="text-xs max-md:order-4 max-md:text-right md:text-meta">
              {result ? (
                race.targetSeconds && result.deltaSeconds !== null ? (
                  <>
                    <span className="text-muted-foreground">
                      <span className="md:hidden">obj.</span>
                      <span className="max-md:hidden">objectif</span>{" "}
                      {formatDuration(race.targetSeconds)} ·{" "}
                    </span>
                    <span
                      className={
                        result.deltaSeconds <= 0
                          ? "text-success"
                          : "text-warning"
                      }
                    >
                      {formatResultDelta(result.deltaSeconds)}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">sans objectif</span>
                )
              ) : (
                <span className="text-muted-foreground">
                  Résultat non trouvé
                </span>
              )}
            </span>
            {result ? (
              <Link
                href={`/activities/${result.activityId}`}
                prefetch={false}
                className="text-xs text-primary hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring max-md:order-5 max-md:col-span-2 md:text-right md:text-meta"
              >
                Voir l’activité ›
              </Link>
            ) : (
              <span aria-hidden="true" className="max-md:hidden" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
