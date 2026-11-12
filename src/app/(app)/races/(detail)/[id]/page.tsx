import { Suspense } from "react";
import type { RaceWeather } from "@/features/races/weather";
import { walkPortions, walkSummary } from "@/features/races/grade";
import { MapCard } from "@/features/races/components/map-card";
import { ProfileCard } from "@/features/races/components/course-cards";
import { CourseImport } from "@/features/races/components/course-import";
import { TargetMissing } from "@/features/races/components/target-missing";
import { WalkCard } from "@/features/races/components/walk-card";
import type { RaceWorkspaceData } from "@/server/races/races";
import { loadRace } from "@/server/races/load";
import {
  chartViews,
  cutoffFor,
  planFor,
  timelineFor,
  weatherFor,
} from "@/server/races/views";
import {
  axisLanes,
  axisReadings,
  roadbookRows,
  roadbookTotals,
} from "@/features/races/axis";
import { planProfile } from "@/features/races/timeline";
import type { NutritionProduct } from "@/features/fueling/products";
import { RaceAxis } from "@/features/races/components/race-axis";
import { SimulationPanel } from "@/features/races/components/simulation-panel";
import { simulationSummary } from "@/features/races/simulation-settings";
import { defaultStartMinutes } from "@/features/races/race";
import { readNutritionLibrary } from "@/server/fueling/products";
import { readSettingChanges } from "@/server/races/settings-history";
import type { SettingChange } from "@/features/races/settings-history";
import { listCourseActivities } from "@/server/races/activities";
import { coachRequestHref } from "@/features/coach/request";
import { CutoffAlertCard } from "@/features/races/components/cutoff-alert";
import { CutoffContext } from "@/features/races/components/cutoff-context";
import { ScenarioRevisions } from "@/features/races/components/scenario-actions";

type Workspace = {
  data: RaceWorkspaceData;
  views: NonNullable<ReturnType<typeof planFor>>;
  products: { active: NutritionProduct[]; archived: NutritionProduct[] };
  history: SettingChange[];
};

async function CourseWithWeather({
  weather,
  ...props
}: Workspace & { weather: Promise<RaceWeather | null> }) {
  return <CourseWorkspace {...props} weather={await weather} />;
}

function CourseWorkspace({
  data,
  views,
  products,
  history,
  weather,
}: Workspace & { weather: RaceWeather | null }) {
  const { model, planned } = views;
  const { profile, map } = chartViews(model, planned, weather);
  const road = data.race.kind === "road";
  const walkCard = (
    <WalkCard
      raceId={data.race.id}
      revision={data.plan.revision}
      threshold={data.plan.walkGradePercent}
      paceSecondsPerKm={data.plan.walkPaceSecondsPerKm}
      rows={Array.from({ length: 16 }, (_, index) => index + 5).map(
        (threshold) => ({
          threshold,
          ...walkSummary(walkPortions(model.course, threshold, model.grades)),
        }),
      )}
      applied={planned !== null}
    />
  );
  if (!road && planned) {
    const timeline = timelineFor({ data, model, planned, weather, products });
    const lanes = axisLanes({
      profile: planProfile(profile, timeline),
      model,
      timeline,
      weather,
    });
    const cutoff = cutoffFor(data, model, planned);
    return (
      <ScenarioRevisions race={data.race.revision} plan={data.plan.revision}>
        <RaceAxis
          alert={
            cutoff && (
              <CutoffAlertCard
                raceId={data.race.id}
                kind={data.race.kind}
                alert={cutoff.alert}
                coachHref={coachRequestHref(null, null, data.race.id)}
              />
            )
          }
          context={
            cutoff && (
              <CutoffContext
                barriers={cutoff.barriers}
                weights={cutoff.alert.weights}
                barrierAt={cutoff.alert.barrier.at}
              />
            )
          }
          lanes={lanes}
          readings={axisReadings({
            model,
            planned,
            timeline,
            weather,
            walkPaceSecondsPerKm: data.plan.walkPaceSecondsPerKm,
          })}
          rows={roadbookRows(timeline, weather)}
          totals={roadbookTotals(timeline, model.course.distanceM)}
          walkThreshold={data.plan.walkGradePercent}
          settings={
            <SimulationPanel
              raceId={data.race.id}
              raceRevision={data.race.revision}
              planRevision={data.plan.revision}
              kind={data.race.kind}
              values={{
                target: planned.scenario.seconds,
                walkGrade: data.plan.walkGradePercent,
                aidStop: data.plan.aidStopSeconds,
              }}
              summary={simulationSummary({
                planned,
                timeline,
                distanceM: model.course.distanceM,
                raceDate: data.race.date,
                startMinutes: data.plan.startMinutes ?? defaultStartMinutes,
              })}
              history={history}
              weatherNote={
                weather === null
                  ? null
                  : weather.mode === "forecast"
                    ? "La météo suit la prévision du jour."
                    : "Avant J-10, la météo suit les moyennes de saison."
              }
            />
          }
          map={{
            data: map,
            segments: profile.segments,
            title: data.race.name,
            rainLabel: weather?.mode === "forecast" ? "Averses" : "Météo",
            hasWeather: profile.rain.length > 0,
          }}
        />
      </ScenarioRevisions>
    );
  }
  const roadProfile = road
    ? {
        ...profile,
        walk: [],
        night: [],
        rain: [],
        weather: null,
        segments: [],
        markers: profile.markers.filter(
          (marker) =>
            marker.mark.shape === "circle" &&
            (marker.mark.tone === "start" || marker.mark.tone === "finish"),
        ),
      }
    : profile;
  const walk = model.walkByThreshold.find(
    (item) => item.threshold === data.plan.walkGradePercent,
  )!;
  return (
    <>
      <MapCard
        key={data.race.kind}
        data={map}
        segments={roadProfile.segments}
        title={data.race.name}
        rainLabel={weather?.mode === "forecast" ? "Averses" : "Météo"}
        hasWeather={profile.rain.length > 0}
        kind={data.race.kind}
      />
      <ProfileCard
        profile={roadProfile}
        planned={planned}
        weather={weather}
        walkThreshold={data.plan.walkGradePercent}
        walkCount={walk.count}
        walkDistanceM={walk.distanceM}
        race={data.race}
      />
      {!road && walkCard}
    </>
  );
}

function RaceStatus({
  data,
  askTarget = true,
}: {
  data: RaceWorkspaceData;
  askTarget?: boolean;
}) {
  return askTarget && !data.race.targetSeconds ? (
    <TargetMissing race={data.race} plan={data.plan} />
  ) : null;
}

export default async function RaceCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { context, data } = await loadRace(id);
  if (!data.course) {
    const activities = await listCourseActivities(context);
    return (
      <>
        <RaceStatus data={data} askTarget={false} />
        <CourseImport
          race={data.race}
          activities={activities}
          replacing={false}
        />
      </>
    );
  }
  const views = planFor(data)!;
  const trailPlan = data.race.kind === "trail" && views.planned !== null;
  const [products, history] = await Promise.all([
    trailPlan ? readNutritionLibrary(context) : { active: [], archived: [] },
    trailPlan ? readSettingChanges(context, data.race.id) : [],
  ]);
  const props = { data, views, products, history };
  const { planned } = views;
  if (!planned || !data.race.date || planned.startEpochMs === null)
    return (
      <>
        <RaceStatus data={data} />
        <CourseWorkspace {...props} weather={null} />
      </>
    );
  const weather = weatherFor(data, views.model, planned);
  return (
    <>
      <RaceStatus data={data} />
      <Suspense fallback={<CourseWorkspace {...props} weather={null} />}>
        <CourseWithWeather {...props} weather={weather} />
      </Suspense>
    </>
  );
}
