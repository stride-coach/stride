import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { Status } from "@/components/stride/status";
import { StrideMark } from "@/components/stride/stride-mark";
import { coachRequestHref } from "@/features/coach/request";
import {
  formatClock,
  formatDuration,
  formatInteger,
  formatKm,
  formatPace,
} from "../format";
import {
  daysUntil,
  defaultStartMinutes,
  formatRaceDate,
  formatShortDate,
  type RacePlan,
  type RaceSummary,
  type StoredCourse,
} from "../race";
import { stopTotalSeconds, targetPace } from "../simulation";
import type { Waypoint } from "../waypoints";
import { RaceSettingsDialog } from "./race-settings-dialog";
import { PriorityBadge } from "./races-overview";

function Countdown({
  race,
  plan,
  today,
  phase,
}: {
  race: RaceSummary;
  plan: RacePlan;
  today: string;
  phase: string | null;
}) {
  if (!race.date)
    return (
      <p className="text-body text-muted-foreground">
        Date de course à définir
      </p>
    );
  const days = daysUntil(race.date, today);
  if (days < 0)
    return (
      <p className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-verdict font-semibold">Terminé</span>
        <span className="text-label text-muted-foreground">
          {formatShortDate(race.date)}
        </span>
      </p>
    );
  const start = formatClock(plan.startMinutes ?? defaultStartMinutes);
  const detail =
    phase ??
    (plan.startMinutes === null
      ? "Heure de départ à définir"
      : `Départ ${start}${plan.startConfirmed ? "" : " · à confirmer"}`);
  return (
    <p className="flex flex-wrap items-baseline gap-x-2">
      <span
        className={cn(
          "text-verdict font-semibold tabular-nums",
          days <= 7 && "text-primary",
        )}
      >
        <span aria-hidden={days > 0 ? true : undefined}>
          {days === 0 ? "Jour J" : `J-${days}`}
        </span>
        {days > 0 && (
          <span className="sr-only">
            {days} {days === 1 ? "jour restant" : "jours restants"}
          </span>
        )}
      </span>
      <span className="text-label text-muted-foreground">
        {formatRaceDate(race.date)} · {detail}
      </span>
    </p>
  );
}

type Stat = {
  key: string;
  value: React.ReactNode;
  label: string;
  edit?: boolean;
  mobileOnly?: boolean;
};

function averagePace(
  race: RaceSummary,
  plan: RacePlan,
  course: StoredCourse | null,
  waypoints: Waypoint[],
) {
  const distanceM =
    course?.distanceM ?? (race.distanceKm ? race.distanceKm * 1000 : null);
  const stopSeconds =
    course && race.kind !== "road"
      ? stopTotalSeconds(waypoints, course.distanceM, plan)
      : 0;
  return targetPace({
    targetSeconds: race.targetSeconds,
    distanceM,
    stopSeconds,
  });
}

function stats(
  race: RaceSummary,
  plan: RacePlan,
  course: StoredCourse | null,
  waypoints: Waypoint[],
): Stat[] {
  const gain =
    course?.elevationGainM != null
      ? course.elevationGainM
      : (race.elevationGainM ?? null);
  const pace = averagePace(race, plan, course, waypoints);
  const margin =
    race.kind === "trail" && plan.cutoffSeconds && race.targetSeconds
      ? plan.cutoffSeconds - race.targetSeconds
      : null;
  return [
    {
      key: "distance",
      value: course
        ? `${formatKm(course.distanceM)} km`
        : race.distanceKm
          ? `${formatInteger(race.distanceKm)} km`
          : "—",
      label: "Distance",
    },
    {
      key: "gain",
      value: gain !== null ? `${formatInteger(gain)} m` : "—",
      label: "D+",
    },
    {
      key: "start",
      value: formatClock(plan.startMinutes ?? defaultStartMinutes),
      label: "Départ",
      edit: true,
    },
    {
      key: "target",
      value: race.targetSeconds ? formatDuration(race.targetSeconds) : "—",
      label: "Objectif",
      edit: true,
    },
    {
      key: "pace",
      value: pace ? `${formatPace(pace.overall)} /km` : "—",
      label: "Allure moyenne",
    },
    ...(margin !== null && margin > 0
      ? [
          {
            key: "margin",
            value: formatDuration(margin),
            label: "Marge barrière",
            mobileOnly: true,
          },
        ]
      : []),
  ];
}

export function RaceHeader({
  race,
  plan,
  course,
  waypoints,
  today,
  phase = null,
  location = null,
}: {
  race: RaceSummary;
  plan: RacePlan;
  course: StoredCourse | null;
  waypoints: Waypoint[];
  today: string;
  phase?: string | null;
  location?: string | null;
}) {
  const waypointCount = waypoints.length;
  const base = `/races/${race.id}`;
  const trail = race.kind === "trail";
  const editTrigger = (children: React.ReactNode) => (
    <RaceSettingsDialog
      raceId={race.id}
      raceRevision={race.revision}
      targetSeconds={race.targetSeconds}
      kind={race.kind}
      plan={plan}
    >
      {children}
    </RaceSettingsDialog>
  );
  const items = stats(race, plan, course, waypoints);
  const actionClass = "max-md:flex-1";
  return (
    <section className="flex flex-col gap-3.5 border-b border-border px-4 py-4.5 md:px-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <PriorityBadge priority={race.priority} />
        <span className="sr-only">Course {race.priority}</span>
        <h1 className="min-w-0 text-verdict font-semibold text-balance">
          {race.name}
        </h1>
        {location && (
          <Chip className="max-md:hidden">
            <span className="sr-only">Lieu : </span>
            {location}
          </Chip>
        )}
        {plan.labels.map((label) => (
          <Chip key={label} className="max-md:hidden">
            {label}
          </Chip>
        ))}
        <div className="max-sm:basis-full sm:ml-auto">
          <Countdown race={race} plan={plan} today={today} phase={phase} />
        </div>
      </div>
      <dl
        className="grid grid-cols-3 gap-x-4 gap-y-3 border-y border-border py-3.5 sm:grid-cols-[repeat(var(--stat-count),minmax(0,1fr))] md:grid-cols-[repeat(var(--stat-desktop-count),minmax(0,1fr))]"
        style={
          {
            "--stat-count": items.length,
            "--stat-desktop-count": items.filter((stat) => !stat.mobileOnly)
              .length,
          } as React.CSSProperties
        }
      >
        {items.map((stat) => (
          <div
            key={stat.key}
            className={cn(
              "flex min-w-0 flex-col-reverse gap-0.5",
              stat.mobileOnly && "md:hidden",
            )}
          >
            <dt className="text-label text-secondary-foreground">
              {stat.label}
            </dt>
            <dd
              data-slot="metric"
              className="text-title font-semibold whitespace-nowrap tabular-nums"
            >
              {stat.edit
                ? editTrigger(
                    <button
                      type="button"
                      className="inline-flex min-h-control-touch items-center rounded-sm text-left decoration-muted-foreground underline-offset-4 hover:underline md:min-h-0"
                    >
                      {stat.value}
                      <span className="sr-only">
                        , modifier le départ et l’objectif
                      </span>
                    </button>,
                  )
                : stat.value}
            </dd>
          </div>
        ))}
      </dl>
      {course ? (
        <div className="flex flex-wrap gap-2">
          {trail && (
            <Button asChild variant="outline" className={actionClass}>
              <Link href={`${base}/waypoints`}>
                <span
                  aria-hidden="true"
                  className="size-1.5 rounded-full bg-primary"
                />
                <span>
                  {waypointCount} {waypointCount > 1 ? "points" : "point"}
                  <span className="max-md:hidden"> de passage</span>
                </span>
              </Link>
            </Button>
          )}
          {trail && (
            <Button asChild variant="outline" className={actionClass}>
              <Link href={`${base}/waypoints#montre`}>Envoyer à la montre</Link>
            </Button>
          )}
          <Button asChild variant="ghost" className="max-md:hidden">
            <Link href={coachRequestHref(null, null, race.id)}>
              <StrideMark className="size-3.5" />
              Poser une question
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Status level="watch" className="text-body font-normal">
            Aucun GPX pour cette course
          </Status>
          <div className="flex gap-2 max-md:w-full md:ml-auto">
            <Button asChild variant="ghost" className="max-md:hidden">
              <Link href={coachRequestHref(null, null, race.id)}>
                <StrideMark className="size-3.5" />
                Poser une question
              </Link>
            </Button>
            <Button asChild className={actionClass}>
              <Link href={`${base}/course`}>
                <UploadIcon className="size-3.5" />
                Ajouter le GPX
              </Link>
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
