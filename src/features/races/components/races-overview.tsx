import { ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { MonoLabel } from "@/components/stride/mono-label";
import { SourceMark } from "@/components/stride/marks";
import { StrideMark } from "@/components/stride/stride-mark";
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
  formatRaceDate,
  formatShortDate,
  type RacePlan,
  type RaceSummary,
  type StoredCourse,
} from "../race";
import { OnTrack } from "./on-track";
import { RaceCard } from "./race-ui";

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
        small
          ? "size-6 rounded-tag text-sm"
          : "size-8 rounded-control text-base",
        priority === "A"
          ? "bg-accent text-accent-foreground"
          : cn(
              "border-[1.5px] text-muted",
              planned ? "border-border-strong" : "border-dashed",
            ),
      )}
    >
      {priority}
    </span>
  );
}

const phaseTones = [
  "bg-surface-raised",
  "bg-accent/12",
  "bg-accent/22",
  "bg-surface-raised",
];

const laneHeight = 28;
const labelsTop = 20;

export function SeasonCard({ timeline }: { timeline: SeasonTimeline }) {
  const phaseTop = labelsTop + timeline.lanes * laneHeight + 18;
  const monthTop = phaseTop + 16 + 10;
  const label = `Saison : ${timeline.markers
    .map((marker) => `${marker.name} le ${formatShortDate(marker.date)}`)
    .join(", ")}`;
  return (
    <RaceCard className="gap-3 pb-3">
      <div className="flex items-baseline gap-3">
        <MonoLabel>Ta saison</MonoLabel>
        <span className="text-xs text-muted-foreground max-sm:hidden">
          Phases du plan et courses à venir
        </span>
        <Link
          href="/plan"
          className="ml-auto text-meta text-accent hover:text-foreground"
        >
          Voir le plan →
        </Link>
      </div>
      <div className="-mx-1 overflow-x-auto overflow-y-hidden px-1">
        <div
          role="img"
          aria-label={label}
          className="relative min-w-224"
          style={{ height: monthTop + 18 }}
        >
          {timeline.months.map((month) => (
            <span
              key={month.key}
              aria-hidden="true"
              className="absolute top-0 border-l border-border-subtle"
              style={{ left: `${month.left}%`, height: phaseTop + 16 }}
            />
          ))}
          <span
            aria-hidden="true"
            className="absolute top-0 left-0 border-l border-foreground"
            style={{ height: phaseTop + 16 }}
          />
          <MonoLabel
            size="nano"
            tone="foreground"
            className="absolute top-0 left-1.5"
          >
            Auj.
          </MonoLabel>
          {timeline.markers.map((marker) => {
            const top = labelsTop + marker.lane * laneHeight;
            return (
              <div key={marker.id}>
                <span
                  className={cn(
                    "absolute flex w-max items-center gap-1.5 text-meta leading-5.5 whitespace-nowrap",
                    marker.align === "center" && "-translate-x-1/2",
                    marker.align === "end" && "-translate-x-full",
                    marker.priority === "A" ? "text-foreground" : "text-muted",
                  )}
                  style={{ left: `${marker.left}%`, top }}
                >
                  <PriorityBadge priority={marker.priority} small />
                  {marker.label}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute border-l border-dashed border-border-strong"
                  style={{
                    left: `${marker.left}%`,
                    top: top + 24,
                    height: phaseTop - top - 32,
                  }}
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute z-10 size-2 -translate-x-1/2 rounded-full ring-2 ring-surface",
                    marker.priority === "A" ? "bg-accent" : "bg-muted",
                  )}
                  style={{ left: `${marker.left}%`, top: phaseTop - 10 }}
                />
              </div>
            );
          })}
          {timeline.phases.map((phase) => (
            <span
              key={phase.key}
              className={cn(
                "absolute flex h-4 items-center overflow-hidden rounded-tag border-r-2 border-surface px-1.5 text-micro whitespace-nowrap text-muted",
                phaseTones[phase.stage],
              )}
              style={{
                left: `${phase.left}%`,
                width: `${phase.width}%`,
                top: phaseTop,
              }}
            >
              {phase.labelled && phase.label}
            </span>
          ))}
          {timeline.months.map((month) => (
            <MonoLabel
              key={month.key}
              size="micro"
              className="absolute pl-1.5"
              style={{ left: `${month.left}%`, top: monthTop }}
            >
              {month.label}
            </MonoLabel>
          ))}
        </div>
      </div>
    </RaceCard>
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
    race.targetSeconds
      ? `objectif ${formatDuration(race.targetSeconds)}`
      : null,
  ].filter(Boolean);
  return (
    <section
      aria-label={race.name}
      className="flex flex-col gap-4 rounded-panel border border-accent/30 bg-surface px-4.5 py-4.5 sm:gap-5 sm:px-7 sm:py-6.5"
    >
      <div className="flex items-center gap-3">
        <PriorityBadge priority={race.priority} />
        <MonoLabel className="min-w-0 truncate">
          {race.priority === "A" ? "Objectif" : `Course ${race.priority}`}
          {race.date ? ` · ${formatRaceDate(race.date)}` : ""}
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
        <span className="text-meta text-muted-foreground sm:text-sm">
          {meta.join(" · ")}
        </span>
        <Button
          asChild
          size="md"
          className="ml-auto rounded-surface max-sm:hidden"
        >
          <Link href={`/races/${race.id}`}>Ouvrir la course</Link>
        </Button>
      </div>
      {onTrack && <OnTrack onTrack={onTrack} />}
      <Button asChild size="lg" className="w-full rounded-surface sm:hidden">
        <Link href={`/races/${race.id}`}>Ouvrir la course</Link>
      </Button>
    </section>
  );
}

export function CalendarRow({
  race,
  today,
  goal = null,
}: {
  race: RaceSummary;
  today: string;
  goal?: GoalCard | null;
}) {
  const label = countdownLabel(race.date, today);
  const terrain = [
    race.distanceKm ? `${formatInteger(race.distanceKm)} km` : null,
    race.elevationGainM ? `D+ ${formatInteger(race.elevationGainM)} m` : null,
  ].filter(Boolean);
  return (
    <Link
      href={`/races/${race.id}`}
      prefetch={false}
      className="grid items-center gap-x-5 gap-y-3 rounded-card border border-border bg-surface px-4 py-4 hover:border-border-strong focus-visible:outline-2 focus-visible:outline-ring sm:grid-cols-[2rem_minmax(0,1fr)_10rem_9rem_auto_1rem] sm:px-5"
    >
      <PriorityBadge priority={race.priority} />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-base font-semibold">{race.name}</span>
        <span className="text-meta text-muted">
          {race.kind === "road" ? "Route" : "Trail"}
        </span>
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm">
          {race.date ? formatRaceDate(race.date) : "Date à définir"}
        </span>
        {label && (
          <span className="font-metric text-xl leading-none font-semibold">
            {label}
          </span>
        )}
      </span>
      <span className="font-metric text-xl leading-none font-semibold">
        {terrain.length ? terrain.join(" · ") : "—"}
      </span>
      {goal?.road ? (
        <span className="grid grid-cols-3 gap-4">
          {[
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
              tone: goal.gap?.tone,
            },
          ].map((item) => (
            <span key={item.label} className="flex flex-col gap-0.5">
              <span
                className={cn(
                  "font-metric text-xl leading-none font-semibold tabular-nums",
                  item.tone === "success" && "text-success",
                  item.tone === "warning" && "text-warning",
                )}
              >
                {item.value}
              </span>
              <MonoLabel size="nano" className="flex items-center gap-1.5">
                {item.provider && <SourceMark source="provider" />}
                {item.label}
              </MonoLabel>
            </span>
          ))}
        </span>
      ) : (
        <span className="flex flex-col gap-0.5">
          <span className="font-metric text-xl leading-none font-semibold">
            {race.targetSeconds ? formatDuration(race.targetSeconds) : "—"}
          </span>
          <MonoLabel size="nano">Objectif</MonoLabel>
        </span>
      )}
      <ChevronRightIcon
        aria-hidden="true"
        className="size-4 text-muted-foreground max-sm:hidden"
      />
    </Link>
  );
}

export function OpenSlot({ priority }: { priority: "B" }) {
  return (
    <div className="grid items-center gap-x-5 gap-y-3 rounded-card border border-dashed border-border-strong px-4 py-4 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:px-5">
      <PriorityBadge priority={priority} planned={false} />
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-base font-semibold">
          Aucune course B au calendrier
        </span>
        <span className="flex items-start gap-2.5 text-meta leading-normal text-pretty text-muted">
          <StrideMark className="mt-0.5 size-3.5 shrink-0" />
          Une course B sert de répétition générale avant l’objectif : départ,
          nutrition et équipement testés dans les conditions réelles.
        </span>
      </span>
      <Button asChild variant="outline" size="md" className="rounded-surface">
        <Link href="/settings/goals">Ajouter une course B</Link>
      </Button>
    </div>
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
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1 border-t border-border py-3.25 sm:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_6rem_minmax(0,1fr)_8rem] sm:gap-x-4"
          >
            <Link
              href={`/races/${race.id}`}
              prefetch={false}
              className="flex min-w-0 items-center gap-2.5 text-body font-semibold hover:text-accent focus-visible:outline-2 focus-visible:outline-ring"
            >
              <span className="font-metric text-muted">{race.priority}</span>
              <span className="truncate">{race.name}</span>
            </Link>
            <span className="text-xs text-muted-foreground max-sm:order-3 sm:text-meta">
              {[race.date ? formatRaceDate(race.date) : null, distance]
                .filter(Boolean)
                .join(" · ")}
            </span>
            <span className="text-right font-metric text-xl leading-none font-semibold tabular-nums max-sm:order-2 sm:text-left">
              {result ? formatResultTime(result.seconds) : "—"}
            </span>
            <span className="text-xs max-sm:order-4 max-sm:text-right sm:text-meta">
              {result ? (
                race.targetSeconds && result.deltaSeconds !== null ? (
                  <>
                    <span className="text-muted-foreground">
                      objectif {formatDuration(race.targetSeconds)} ·{" "}
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
                className="text-xs text-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring max-sm:order-5 max-sm:col-span-2 sm:text-right sm:text-meta"
              >
                Voir l’activité ›
              </Link>
            ) : (
              <span aria-hidden="true" className="max-sm:hidden" />
            )}
          </li>
        );
      })}
    </ul>
  );
}
