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
import { axisLanes, axisReadings } from "@/features/races/axis";
import { AxisFocusProvider } from "@/features/races/components/axis-focus";
import {
  ClimbsAxis,
  ClimbsTable,
} from "@/features/races/components/climbs-view";
import { ClimbThreshold } from "@/features/races/components/climb-threshold";
import { EmptyState } from "@/features/races/components/race-ui";
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
  const lanes = {
    ...axisLanes({ profile, model, timeline, weather: null }),
    pace: [],
    fueling: [],
    temperature: [],
  };
  const readings = axisReadings({
    model,
    planned,
    timeline,
    weather: null,
    walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
  });
  const reading =
    stats.count === 0
      ? `À ${threshold} %, aucune côte n’est assez raide pour marcher : tu cours tout le parcours${stats.runPace ? ` à ${stats.runPace}` : ""}.`
      : `À ${threshold} %, tu marches ${stats.walked} sur ${stats.count} côte${stats.count > 1 ? "s" : ""}${stats.runPace ? ` et tu cours le reste à ${stats.runPace}` : ""} pour tenir ton objectif.`;
  return (
    <AxisFocusProvider>
      <p className="flex max-w-170 items-start gap-2.5 text-body-lg text-pretty">
        <StrideMark className="mt-1 size-3.5 shrink-0" />
        {reading}
      </p>
      <ClimbsAxis
        lanes={lanes}
        readings={readings}
        walkThreshold={threshold}
        raceId={data.race.id}
        label="Le profil, côte par côte"
        threshold={
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-2">
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
        }
      />
      <dl
        aria-label={`Profil du parcours avec ${stats.count} côte${stats.count > 1 ? "s" : ""} à marcher à partir de ${threshold} %`}
        className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-card px-4 py-3.5 sm:grid-cols-4"
      >
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
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_26rem] xl:items-start">
        <section aria-labelledby="climbs-list" className="flex flex-col gap-2">
          <h2 id="climbs-list" className="font-semibold">
            {rows.length === 0
              ? `Aucune côte à ${threshold} % ou plus`
              : `Les ${rows.length} côte${rows.length > 1 ? "s" : ""} à ${threshold} % ou plus`}
          </h2>
          {rows.length > 0 && <ClimbsTable rows={rows} />}
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
                  <th scope="col" className={head}>
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
                    <th
                      scope="row"
                      className={cn(cell, "text-left font-normal")}
                    >
                      {row.threshold} %
                      {row.current && (
                        <span className="ml-2 text-label text-muted-foreground">
                          ton réglage
                        </span>
                      )}
                    </th>
                    <td className={cn(cell, "text-right")}>{row.count}</td>
                    <td className={cell}>
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-muted"
                        >
                          <span
                            className="block h-full rounded-full bg-warning"
                            style={{ width: `${Math.round(row.share * 100)}%` }}
                          />
                        </span>
                        <span>
                          {row.walked}
                          <span className="ml-1 text-label text-muted-foreground">
                            {row.shareLabel}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className={cn(cell, "text-right")}>
                      {row.runPace ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AxisFocusProvider>
  );
}
