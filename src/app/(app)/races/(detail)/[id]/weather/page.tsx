import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import { EmptyState, RaceCard } from "@/features/races/components/race-ui";
import { localToday } from "@/features/app-shell/shell";
import { axisLanes, axisReadings } from "@/features/races/axis";
import { AxisFocusProvider } from "@/features/races/components/axis-focus";
import { FocusedLanes } from "@/features/races/components/lanes-explorer";
import { profileData } from "@/features/races/profile";
import { daysUntil, defaultStartMinutes } from "@/features/races/race";
import { planProfile } from "@/features/races/timeline";
import { weatherView } from "@/features/races/weather-view";
import { planModel } from "@/features/races/workspace";
import { paceFactorsOf } from "@/features/races/proposals";
import { readNutritionLibrary } from "@/server/fueling/products";
import { loadRace } from "@/server/races/load";
import type { RaceWorkspaceData } from "@/server/races/races";
import { planFor, timelineFor, weatherFor } from "@/server/races/views";

const cell = "px-2 py-2.5 tabular-nums";

type Views = NonNullable<ReturnType<typeof planFor>>;

async function WeatherBody({
  data,
  views,
  context,
}: {
  data: RaceWorkspaceData;
  views: Views;
  context: Awaited<ReturnType<typeof loadRace>>["context"];
}) {
  const { model, planned, scenarios } = views;
  if (!planned) return null;
  const [weather, products] = await Promise.all([
    weatherFor(data, model, planned),
    readNutritionLibrary(context),
  ]);
  if (!weather)
    return (
      <EmptyState title="Météo indisponible pour l’instant">
        Stride n’a pas pu lire la météo de ton parcours. Réessaie plus tard.
      </EmptyState>
    );
  const timeline = timelineFor({ data, model, planned, weather, products });
  const startMinutes = data.plan.startMinutes ?? defaultStartMinutes;
  const timeZone = data.course!.timeZone;
  const strategy = data.strategy ? paceFactorsOf(data.strategy) : undefined;
  const view = weatherView({
    weather,
    course: model.course,
    planned,
    timeline,
    startMinutes,
    daysToRace: data.race.date
      ? daysUntil(data.race.date, localToday(new Date()))
      : null,
    alternatives: scenarios.map((scenario) => ({
      scenario,
      planned:
        scenario.key === planned.scenario.key
          ? planned
          : planModel({
              model,
              race: data.race,
              plan: data.plan,
              scenario,
              timeZone,
              paceFactors: strategy,
            }),
    })),
  });
  const profile = planProfile(
    profileData({
      course: model.course,
      waypoints: model.waypoints,
      marks: model.marks,
      portions: model.portions,
      planned,
      weather,
    }),
    timeline,
  );
  const lanes = {
    ...axisLanes({ profile, model, timeline, weather }),
    walk: [],
    pace: [],
    fueling: [],
  };
  const readings = axisReadings({
    model,
    planned,
    timeline,
    weather,
    walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
  });
  return (
    <AxisFocusProvider>
      <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
        <StrideMark className="mt-1 size-3.5 shrink-0" />
        {view.reading}
      </p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-y border-border py-3.5 sm:grid-cols-3 lg:grid-cols-6">
        {view.kpis.map((kpi) => (
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
          <FocusedLanes
            lanes={lanes}
            readings={readings}
            walkThreshold={data.plan.walkGradePercent}
            raceId={data.race.id}
            headingId="weather-course"
            title="La météo au fil de ta course"
            actions={
              <p className="text-label text-muted-foreground">
                {view.mode === "forecast"
                  ? "Prévision à l’heure de ton passage"
                  : "Normales de saison à cette date"}
              </p>
            }
          />
          <section
            aria-labelledby="weather-adjustments"
            className="flex flex-col gap-2"
          >
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 id="weather-adjustments" className="font-semibold">
                Ce que la météo change à ton plan
              </h2>
              <p className="text-label text-muted-foreground">
                {view.adjustments.length === 0
                  ? "Rien à changer"
                  : `${view.adjustments.length} ajustement${view.adjustments.length > 1 ? "s" : ""}`}
              </p>
            </div>
            {view.adjustments.length > 0 && (
              <ul className="flex flex-col rounded-xl border border-border bg-card">
                {view.adjustments.map((item) => (
                  <li
                    key={item.topic}
                    className="grid grid-cols-[96px_minmax(0,1fr)_auto] items-baseline gap-x-3 border-b border-border px-4 py-3 last:border-b-0 max-sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <span className="font-medium max-sm:col-span-2">
                      {item.topic}
                    </span>
                    <span className="text-pretty text-secondary-foreground">
                      {item.text}
                    </span>
                    <span className="text-label whitespace-nowrap text-muted-foreground tabular-nums">
                      {item.where}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <aside
          className="flex flex-col gap-5"
          aria-label="Fiabilité de la météo"
        >
          <RaceCard aria-labelledby="weather-source">
            <h2
              id="weather-source"
              className="text-label font-medium text-muted-foreground"
            >
              {view.mode === "forecast" ? "Fiabilité" : "Avant la prévision"}
            </h2>
            <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5">
              {view.reliability.map((item) => (
                <div key={item.label} className="contents">
                  <dt className="text-secondary-foreground">{item.label}</dt>
                  <dd className="text-right font-medium tabular-nums">
                    {item.value}
                  </dd>
                </div>
              ))}
            </dl>
            <p className="text-pretty">
              {view.mode === "forecast"
                ? "La météo est calculée à l’endroit et à l’heure où tu passes. Si ton allure change, la pluie rencontrée change aussi."
                : `Trop tôt pour une prévision : Stride montre les normales de saison à cette date (${weather.detail}). La prévision arrive le ${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${weather.forecastFrom}T00:00:00Z`))}.`}
            </p>
            <p className="text-label text-muted-foreground">{view.source}</p>
          </RaceCard>
          {view.alternatives.length > 0 && (
            <RaceCard aria-labelledby="weather-alternatives">
              <h2
                id="weather-alternatives"
                className="text-label font-medium text-muted-foreground"
              >
                Si tu es en avance ou en retard
              </h2>
              <table className="w-full border-collapse text-body">
                <thead className="sr-only">
                  <tr>
                    <th scope="col">Scénario</th>
                    <th scope="col">Arrivée</th>
                    <th scope="col">Pluie</th>
                  </tr>
                </thead>
                <tbody>
                  {view.alternatives.map((item) => (
                    <tr
                      key={item.key}
                      aria-current={item.current ? "true" : undefined}
                      className={cn(item.current && "font-medium")}
                    >
                      <th
                        scope="row"
                        className={cn(cell, "pl-0 text-left font-normal")}
                      >
                        {item.label}
                      </th>
                      <td className={cn(cell, "font-semibold")}>
                        {item.finish}
                      </td>
                      <td
                        className={cn(
                          cell,
                          "pr-0 text-right text-secondary-foreground",
                        )}
                      >
                        {item.rain}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </RaceCard>
          )}
        </aside>
      </div>
    </AxisFocusProvider>
  );
}

export default async function RaceWeatherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { context, data } = await loadRace(id);
  const base = `/races/${data.race.id}`;
  if (data.race.kind === "road") redirect(base);
  if (!data.course)
    return (
      <EmptyState
        title="Ajoute le GPX de la course"
        action={
          <Link href={`${base}/course`} className="font-medium text-primary">
            Ajouter le GPX
          </Link>
        }
      >
        La météo se lit à l’endroit et à l’heure où tu passes : il faut le tracé
        pour la placer.
      </EmptyState>
    );
  const views = planFor(data)!;
  if (!views.planned || !data.race.date || views.planned.startEpochMs === null)
    return (
      <EmptyState title="Ajoute un objectif et une date">
        Les heures de passage décident de la météo que tu rencontres : il faut
        ton objectif et la date de la course.
      </EmptyState>
    );
  return (
    <Suspense
      fallback={
        <p role="status" className="text-secondary-foreground">
          Chargement de la météo…
        </p>
      }
    >
      <WeatherBody data={data} views={views} context={context} />
    </Suspense>
  );
}
