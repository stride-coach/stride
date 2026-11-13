import { redirect } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Button } from "@/components/ui/button";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { feelLabels, nearestFeel } from "@/features/plans/debrief/debrief";
import {
  afterChart,
  afterKpis,
  afterReading,
  passageChecks,
  recoveryDays,
  recoveryPhases,
} from "@/features/races/after-race";
import { profileData } from "@/features/races/profile";
import { AfterRaceChart } from "@/features/races/components/after-race-chart";
import { EmptyState } from "@/features/races/components/race-ui";
import { readNutritionLibrary } from "@/server/fueling/products";
import { loadAfterRace } from "@/server/races/after";
import { loadRace } from "@/server/races/load";
import { planFor, timelineFor } from "@/server/races/views";

const head =
  "px-2 py-2 text-right text-label font-normal text-muted-foreground";
const cell = "px-2 py-2.5 text-right tabular-nums whitespace-nowrap";

export default async function RaceAfterPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { context, data, today } = await loadRace(id);
  const base = `/races/${data.race.id}`;
  const raceDate = data.race.date;
  if (!raceDate || raceDate >= today) redirect(base);
  const { result, detail, feeling, nights } = await loadAfterRace(context, {
    ...data.race,
    date: raceDate,
  });
  const recovery = recoveryDays({ nights, raceDate, today });
  const phases = recoveryPhases({ nights, raceDate, today });
  const redo = (
    <Button asChild variant="outline">
      <Link href={`/races/new?from=${data.race.id}`}>Refaire cette course</Link>
    </Button>
  );
  if (!result)
    return (
      <>
        <div className="flex">{redo}</div>
        <EmptyState title="Résultat non trouvé">
          Stride cherche une sortie de course enregistrée le jour de la course,
          à 15 % près de sa distance. Synchronise ta montre ou vérifie la date
          de la course.
        </EmptyState>
      </>
    );
  const views = planFor(data);
  const planned = views?.planned ?? null;
  const timeline =
    views && planned
      ? timelineFor({
          data,
          model: views.model,
          planned,
          weather: null,
          products: await readNutritionLibrary(context),
        })
      : null;
  const passages = timeline
    ? passageChecks({
        stations: timeline.stations,
        series: detail?.track?.series ?? null,
        finishSeconds: result.seconds,
      })
    : [];
  const kpis = afterKpis({
    race: data.race,
    result,
    averageHeartRate: detail?.activity.averageHeartRate ?? null,
    elevationGainM: detail?.activity.elevationGainMeters ?? null,
  });
  const series = detail?.track?.series ?? null;
  const profile =
    views && planned
      ? profileData({
          course: views.model.course,
          waypoints: views.model.waypoints,
          marks: views.model.marks,
          portions: views.model.portions,
          planned,
          weather: null,
        })
      : null;
  const chart = timeline
    ? afterChart({
        stations: timeline.stations,
        series,
        finishSeconds: result.seconds,
        elevation: profile?.elevation ?? [],
        night: profile?.night ?? [],
      })
    : null;
  const maxGap = Math.max(
    1,
    ...passages.map((item) => Math.abs(item.deltaSeconds)),
  );
  return (
    <>
      <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
        <StrideMark className="mt-1 size-3.5 shrink-0" />
        {afterReading({ result, passages })}
      </p>
      <dl className="grid grid-cols-3 gap-x-4 gap-y-3 border-y border-border py-3.5 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <div key={kpi.key} className="flex flex-col-reverse gap-0.5">
            <dt className="text-label text-secondary-foreground">
              {kpi.label}
            </dt>
            <dd
              data-slot="metric"
              className="text-title font-semibold tabular-nums"
            >
              {kpi.value}
            </dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start">
        <div className="flex min-w-0 flex-col gap-5">
          {chart ? (
            <AfterRaceChart chart={chart} passages={passages} />
          ) : passages.length > 0 ? (
            <section
              aria-labelledby="after-plan"
              className="flex flex-col gap-2"
            >
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h2 id="after-plan" className="font-semibold">
                  Ta course sur ton plan
                </h2>
                <p className="text-label text-muted-foreground">
                  temps de course à chaque passage, prévu et réalisé
                </p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-80 border-collapse text-body">
                  <thead className="border-b border-border">
                    <tr>
                      <th scope="col" className={cn(head, "text-left")}>
                        Passage
                      </th>
                      <th scope="col" className={head}>
                        Prévu
                      </th>
                      <th scope="col" className={head}>
                        Réalisé
                      </th>
                      <th scope="col" className={head}>
                        Écart
                      </th>
                      <th scope="col" className="w-1/4 max-sm:hidden">
                        <span className="sr-only">Écart en barre</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {passages.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-b-0"
                      >
                        <th
                          scope="row"
                          className="px-2 py-2.5 text-left font-normal"
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="block text-label text-muted-foreground tabular-nums sm:ml-2 sm:inline">
                            km {item.distance}
                          </span>
                        </th>
                        <td className={cn(cell, "text-secondary-foreground")}>
                          {item.planned}
                        </td>
                        <td className={cn(cell, "font-semibold")}>
                          {item.actual}
                        </td>
                        <td
                          className={cn(
                            cell,
                            item.deltaSeconds > 0
                              ? "text-warning"
                              : "text-primary",
                          )}
                        >
                          {item.delta}
                        </td>
                        <td className="px-2 max-sm:hidden" aria-hidden="true">
                          <span className="relative block h-1.5 rounded-full bg-muted">
                            <span
                              className={cn(
                                "absolute inset-y-0 rounded-full",
                                item.deltaSeconds > 0
                                  ? "left-1/2 bg-warning"
                                  : "right-1/2 bg-primary",
                              )}
                              style={{
                                width: `${(Math.abs(item.deltaSeconds) / maxGap) * 50}%`,
                              }}
                            />
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!detail?.track && (
                <p className="text-label text-muted-foreground">
                  Sans le tracé détaillé de l’activité, seule l’arrivée se
                  compare au plan.
                </p>
              )}
            </section>
          ) : (
            <EmptyState title="Pas de plan de course à comparer">
              Ajoute le GPX et un objectif pour comparer tes passages au plan.
            </EmptyState>
          )}
        </div>
        <aside
          aria-label="Après la course"
          className="flex flex-col gap-5 xl:border-l xl:border-border xl:pl-5"
        >
          {(phases.length > 0 || recovery.days.length > 0) && (
            <section
              aria-labelledby="after-recovery"
              className="flex flex-col gap-2"
            >
              <h2
                id="after-recovery"
                className="text-label font-medium text-muted-foreground"
              >
                Ta récupération
              </h2>
              <ol className="flex flex-col">
                {phases.length > 0
                  ? phases.map((phase) => (
                      <li
                        key={phase.key}
                        className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3 border-t border-border py-2"
                      >
                        <span className="text-secondary-foreground tabular-nums">
                          {phase.days}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-medium">{phase.title}</span>
                          <span className="text-label text-muted-foreground tabular-nums">
                            {phase.detail}
                          </span>
                        </span>
                      </li>
                    ))
                  : recovery.days.map((day) => (
                      <li
                        key={day.day}
                        className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-3 border-t border-border py-2"
                      >
                        <span className="text-secondary-foreground tabular-nums">
                          {day.label}
                        </span>
                        <span className="text-label tabular-nums">
                          {[
                            day.restingHeartRate &&
                              `FC repos ${day.restingHeartRate.value}${day.restingHeartRate.delta ? ` (${day.restingHeartRate.delta})` : ""}`,
                            day.hrv &&
                              `VFC ${day.hrv.value}${day.hrv.delta ? ` (${day.hrv.delta})` : ""}`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </li>
                    ))}
              </ol>
              {recovery.baseline && (
                <p className="text-label text-pretty text-muted-foreground">
                  {recovery.baseline} Des repères, pas un avis médical.
                </p>
              )}
            </section>
          )}
          <section
            aria-labelledby="after-feeling"
            className="flex flex-col gap-2"
          >
            <h2
              id="after-feeling"
              className="text-label font-medium text-muted-foreground"
            >
              Ton ressenti
            </h2>
            {feeling ? (
              <dl className="flex flex-col gap-1.5">
                <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3">
                  <dt className="text-secondary-foreground">Effort</dt>
                  <dd className="font-semibold tabular-nums">
                    {feeling.effort} / 10
                  </dd>
                </div>
                {feeling.feel !== null && (
                  <div className="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-3">
                    <dt className="text-secondary-foreground">Sensations</dt>
                    <dd className="font-semibold">
                      {feelLabels[nearestFeel(feeling.feel)]}
                    </dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-secondary-foreground">
                Tu n’as pas encore noté ton ressenti sur cette course.
              </p>
            )}
          </section>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/activities/${result.activityId}`}>
                Voir l’activité
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`${base}/after/compare`}>Comparer</Link>
            </Button>
            {redo}
          </div>
        </aside>
      </div>
    </>
  );
}
