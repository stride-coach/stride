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
import { chartViews, planFor, weatherFor } from "@/server/races/views";
import { listCourseActivities } from "@/server/races/activities";

type Workspace = {
  data: RaceWorkspaceData;
  views: NonNullable<ReturnType<typeof planFor>>;
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
  weather,
}: Workspace & { weather: RaceWeather | null }) {
  const { model, planned } = views;
  const { profile, map } = chartViews(model, planned, weather);
  const road = data.race.kind === "road";
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
  const walkRows = Array.from({ length: 16 }, (_, index) => index + 5).map(
    (threshold) => ({
      threshold,
      ...walkSummary(walkPortions(model.course, threshold, model.grades)),
    }),
  );
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
      {!road && (
        <WalkCard
          raceId={data.race.id}
          revision={data.plan.revision}
          threshold={data.plan.walkGradePercent}
          paceSecondsPerKm={data.plan.walkPaceSecondsPerKm}
          rows={walkRows}
          applied={planned !== null}
        />
      )}
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
  const props = { data, views };
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
