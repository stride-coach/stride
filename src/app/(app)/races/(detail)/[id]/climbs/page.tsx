import { redirect } from "next/navigation";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { StrideMark } from "@/components/stride/stride-mark";
import { cn } from "@/lib/utils";
import {
  climbRows,
  climbStats,
  thresholdComparison,
  thresholdOptions,
} from "@/features/races/climbs";
import { ClimbProfile } from "@/features/races/components/climb-profile";
import { ClimbThreshold } from "@/features/races/components/climb-threshold";
import { EmptyState, RaceCard } from "@/features/races/components/race-ui";
import { profileData } from "@/features/races/profile";
import { defaultStartMinutes } from "@/features/races/race";
import { planProfile } from "@/features/races/timeline";
import { readNutritionLibrary } from "@/server/fueling/products";
import { loadRace } from "@/server/races/load";
import { planFor, timelineFor } from "@/server/races/views";

const head = "px-2 py-2 text-left text-label font-normal text-muted-foreground";
const cell = "px-2 py-2.5 tabular-nums whitespace-nowrap";

export default async function RaceClimbsPage({
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
        Stride lit les côtes dans le tracé : sans lui, il ne sait pas où
        marcher.
      </EmptyState>
    );
  const views = planFor(data)!;
  const { model, planned } = views;
  if (!planned)
    return (
      <EmptyState title="Ajoute un objectif et une date">
        Les heures de passage et l’allure en courant se calculent à partir de
        ton objectif et de la date de la course.
      </EmptyState>
    );
  const products = await readNutritionLibrary(context);
  const timeline = timelineFor({
    data,
    model,
    planned,
    weather: null,
    products,
  });
  const threshold = data.plan.walkGradePercent;
  const rows = climbRows({ model, planned, timeline });
  const stats = climbStats({
    model,
    planned,
    walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
  });
  const comparison = thresholdComparison({
    model,
    kind: data.race.kind,
    settings: {
      targetSeconds: planned.scenario.seconds,
      walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
      aidStopSeconds: data.plan.aidStopSeconds,
      waterStopSeconds: data.plan.waterStopSeconds,
      startMinutes: data.plan.startMinutes ?? defaultStartMinutes,
    },
    current: threshold,
  });
  const profile = planProfile(
    profileData({
      course: model.course,
      waypoints: model.waypoints,
      marks: model.marks,
      portions: model.portions,
      planned,
      weather: null,
    }),
    timeline,
  );
  const reading =
    stats.count === 0
      ? `À ${threshold} %, aucune côte n’est assez raide pour marcher : tu cours tout le parcours${stats.runPace ? ` à ${stats.runPace}` : ""}.`
      : `À ${threshold} %, tu marches ${stats.walked} sur ${stats.count} côte${stats.count > 1 ? "s" : ""}${stats.runPace ? ` et tu cours le reste à ${stats.runPace}` : ""} pour tenir ton objectif.`;
  return (
    <>
      <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
        <StrideMark className="mt-1 size-3.5 shrink-0" />
        {reading}
      </p>
      <RaceCard aria-labelledby="climbs-profile">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h2 id="climbs-profile" className="font-semibold">
            Le profil, côte par côte
          </h2>
          <div className="flex w-full flex-col gap-1.5 sm:ml-auto sm:w-auto sm:flex-row sm:items-center sm:gap-2">
            <span className="text-label text-muted-foreground">
              Marcher dès
            </span>
            <ClimbThreshold
              raceId={data.race.id}
              revision={data.plan.revision}
              threshold={threshold}
              options={thresholdOptions(threshold)}
            />
          </div>
        </div>
        <ClimbProfile
          distanceM={profile.distanceM}
          elevation={profile.elevation}
          portions={model.portions}
          label={`Profil du parcours avec ${stats.count} côte${stats.count > 1 ? "s" : ""} à marcher à partir de ${threshold} %`}
        />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3.5 sm:grid-cols-4">
          {[
            { label: "Côtes à marcher", value: String(stats.count) },
            { label: "En marchant", value: stats.walked },
            { label: "Dénivelé marché", value: stats.gain },
            { label: "Allure en courant", value: stats.runPace ?? "—" },
          ].map((item) => (
            <div key={item.label} className="flex flex-col-reverse gap-0.5">
              <dt className="text-label text-secondary-foreground">
                {item.label}
              </dt>
              <dd
                data-slot="metric"
                className="text-title font-semibold tabular-nums"
              >
                {item.value}
              </dd>
            </div>
          ))}
        </dl>
      </RaceCard>
      <section aria-labelledby="climbs-list" className="flex flex-col gap-2">
        <h2 id="climbs-list" className="font-semibold">
          {rows.length === 0
            ? `Aucune côte à ${threshold} % ou plus`
            : `Les ${rows.length} côte${rows.length > 1 ? "s" : ""} à ${threshold} % ou plus`}
        </h2>
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-160 border-collapse text-body">
              <thead className="border-b border-border">
                <tr>
                  <th scope="col" className={head}>
                    <span className="sr-only">Numéro</span>
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Au km
                  </th>
                  <th scope="col" className={head}>
                    Où
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Longueur
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    D+
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Moyenne
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Max
                  </th>
                  <th scope="col" className={cn(head, "text-right")}>
                    Heure
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.number}
                    className="border-b border-border last:border-b-0"
                  >
                    <th
                      scope="row"
                      className={cn(
                        cell,
                        "text-left font-normal text-muted-foreground",
                      )}
                    >
                      {row.number}
                    </th>
                    <td className={cn(cell, "text-right")}>{row.km}</td>
                    <td className="px-2 py-2.5 text-secondary-foreground">
                      {row.section ?? "—"}
                    </td>
                    <td className={cn(cell, "text-right")}>{row.length}</td>
                    <td className={cn(cell, "text-right")}>{row.gain}</td>
                    <td className={cn(cell, "text-right")}>{row.average}</td>
                    <td className={cn(cell, "text-right font-medium")}>
                      {row.max}
                    </td>
                    <td className={cn(cell, "text-right")}>{row.passage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section
        aria-labelledby="climbs-threshold"
        className="flex flex-col gap-2"
      >
        <h2 id="climbs-threshold" className="font-semibold">
          Ce que change le seuil
        </h2>
        <p className="text-label text-pretty text-muted-foreground">
          Ton objectif ne bouge pas : marcher plus te demande de courir plus
          vite le reste du temps.
        </p>
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-80 border-collapse text-body">
            <thead className="border-b border-border">
              <tr>
                <th scope="col" className={head}>
                  Seuil
                </th>
                <th scope="col" className={cn(head, "text-right")}>
                  Côtes
                </th>
                <th scope="col" className={cn(head, "text-right")}>
                  Part marchée
                </th>
                <th scope="col" className={cn(head, "text-right")}>
                  Allure en courant
                </th>
              </tr>
            </thead>
            <tbody>
              {comparison.map((row) => (
                <tr
                  key={row.threshold}
                  aria-current={row.current ? "true" : undefined}
                  className={cn(
                    "border-b border-border last:border-b-0",
                    row.current && "bg-muted font-medium",
                  )}
                >
                  <th scope="row" className={cn(cell, "text-left font-normal")}>
                    {row.threshold} %
                    {row.current && (
                      <span className="ml-2 text-label text-muted-foreground">
                        ton réglage
                      </span>
                    )}
                  </th>
                  <td className={cn(cell, "text-right")}>{row.count}</td>
                  <td className={cn(cell, "text-right")}>{row.walked}</td>
                  <td className={cn(cell, "text-right")}>
                    {row.runPace ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
