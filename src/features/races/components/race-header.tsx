import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { UploadIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MonoLabel } from "@/components/stride/mono-label";
import { PulseDot } from "@/components/stride/marks";
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
      <p className="text-body text-muted-foreground">
        Course terminée le {formatShortDate(race.date)}
      </p>
    );
  const start = formatClock(plan.startMinutes ?? defaultStartMinutes);
  const detail =
    phase ??
    (plan.startMinutes === null
      ? "Heure de départ à définir"
      : `Départ ${start}${plan.startConfirmed ? "" : " · à confirmer"}`);
  return (
    <div className="flex items-end gap-2.5 md:gap-3">
      <span
        className={cn(
          "text-[52px] leading-[0.8] font-semibold tabular-nums md:text-[56px]",
          days <= 7 && "text-primary",
        )}
      >
        {days === 0 ? "Jour J" : days}
      </span>
      {days > 0 && (
        <span className="flex flex-col gap-0.5">
          <span className="text-body md:text-body">
            {days === 1 ? "jour restant" : "jours restants"}
          </span>
          <span className="text-label text-muted-foreground md:text-body">
            {detail}
          </span>
        </span>
      )}
    </div>
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
      label: "Allure moy.",
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
}: {
  race: RaceSummary;
  plan: RacePlan;
  course: StoredCourse | null;
  waypoints: Waypoint[];
  today: string;
  phase?: string | null;
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
  const mobileCount = items.length;
  const actionClass = "rounded-lg text-body max-md:min-h-11 max-md:flex-1";
  return (
    <section className="flex flex-col gap-5 md:flex-row md:flex-wrap md:items-end md:justify-between md:gap-6">
      <div className="flex min-w-0 flex-col gap-3 md:gap-2.5">
        <MonoLabel size="nano" className="md:text-label">
          Course {race.priority}
          {race.date ? ` · ${formatRaceDate(race.date)}` : ""}
          {plan.labels.length > 0 && (
            <span className="max-md:hidden"> · {plan.labels.join(" · ")}</span>
          )}
        </MonoLabel>
        <h1 className="text-[30px] leading-none font-semibold tracking-[-0.03em] text-balance md:text-[40px]">
          {race.name}
        </h1>
        <Countdown race={race} plan={plan} today={today} phase={phase} />
      </div>
      <div className="flex flex-col gap-5 md:items-end md:gap-3.5">
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-border bg-border md:flex md:gap-7 md:overflow-visible md:rounded-none md:border-0 md:bg-transparent">
          {items.map((stat) => (
            <div
              key={stat.key}
              className={cn(
                "flex min-w-0 flex-col gap-1 bg-card px-3 py-2.5 md:gap-0.75 md:bg-transparent md:p-0",
                stat.mobileOnly && "md:hidden",
              )}
            >
              <dd className="order-1 text-verdict leading-none font-semibold tabular-nums md:text-metric">
                {stat.edit
                  ? editTrigger(
                      <button
                        type="button"
                        className="rounded-sm text-left decoration-muted-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        {stat.value}
                        <span className="sr-only">
                          , modifier le départ et l’objectif
                        </span>
                      </button>,
                    )
                  : stat.value}
              </dd>
              <MonoLabel size="nano" asChild className="order-2 md:text-label">
                <dt>{stat.label}</dt>
              </MonoLabel>
            </div>
          ))}
          {mobileCount % 3 !== 0 &&
            Array.from({ length: 3 - (mobileCount % 3) }, (_, index) => (
              <span
                key={index}
                aria-hidden="true"
                className="bg-card md:hidden"
              />
            ))}
        </dl>
        {course ? (
          <div className="flex gap-2">
            {trail && (
              <Button
                asChild
                variant="outline"
                size="md"
                className={actionClass}
              >
                <Link href={`${base}/waypoints`}>
                  <PulseDot tone="success" breathing={false} />
                  <span>
                    {waypointCount} {waypointCount > 1 ? "points" : "point"}
                    <span className="max-md:hidden"> de passage</span>
                  </span>
                </Link>
              </Button>
            )}
            {trail && (
              <Button
                asChild
                variant="outline"
                size="md"
                className={actionClass}
              >
                <Link href={`${base}/waypoints#montre`}>
                  Envoyer à la montre
                </Link>
              </Button>
            )}
            <Button
              asChild
              variant="outline"
              size="md"
              className="rounded-lg text-body max-md:hidden"
            >
              <Link href={coachRequestHref(null, null, race.id)}>
                <StrideMark className="size-3.5" />
                Poser une question
              </Link>
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5 md:items-end">
            <span className="inline-flex items-center gap-2 text-body text-warning">
              <PulseDot tone="warning" breathing={false} />
              Aucun GPX pour cette course
            </span>
            <div className="flex gap-2">
              <Button
                asChild
                variant="outline"
                size="md"
                className="rounded-lg text-body max-md:hidden"
              >
                <Link href={coachRequestHref(null, null, race.id)}>
                  <StrideMark className="size-3.5" />
                  Poser une question
                </Link>
              </Button>
              <Button asChild size="md" className={actionClass}>
                <Link href={`${base}/course`}>
                  <UploadIcon className="size-3.5" />
                  Ajouter le GPX
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
