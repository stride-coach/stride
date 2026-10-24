import { Suspense } from "react";
import type { RaceWeather } from "@/features/races/weather";
import { walkPortions, walkSummary } from "@/features/races/grade";
import { raceOnTrack, type RaceOnTrack } from "@/features/races/on-track";
import {
  preparationProgress,
  preparationRows,
} from "@/features/races/overview";
import { MapCard } from "@/features/races/components/map-card";
import {
  OtherRaces,
  ProfileCard,
} from "@/features/races/components/course-cards";
import { CourseImport } from "@/features/races/components/course-import";
import { OnTrack } from "@/features/races/components/on-track";
import { RaceCard } from "@/features/races/components/race-ui";
import { TargetMissing } from "@/features/races/components/target-missing";
import { WalkCard } from "@/features/races/components/walk-card";
import { requireAthlete } from "@/server/app/session";
import { listRaces, type RaceWorkspaceData } from "@/server/races/races";
import { loadRace } from "@/server/races/load";
import { loadOnTrackInputs } from "@/server/races/on-track";
import { chartViews, planFor, weatherFor } from "@/server/races/views";
import { listCourseActivities } from "@/server/races/activities";

type Workspace = {
  data: RaceWorkspaceData;
  views: NonNullable<ReturnType<typeof planFor>>;
  races: Awaited<ReturnType<typeof listRaces>>;
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
  races,
  weather,
}: Workspace & { weather: RaceWeather | null }) {
  const course = data.course!;
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
        fileName={course.fileName ?? "parcours.gpx"}
        rainLabel={weather?.mode === "forecast" ? "Averses" : "Météo"}
        hasWeather={profile.rain.length > 0}
        walkThreshold={data.plan.walkGradePercent}
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
      <OtherRaces races={races} currentId={data.race.id} />
    </>
  );
}

function RaceStatus({
  data,
  onTrack,
}: {
  data: RaceWorkspaceData;
  onTrack: RaceOnTrack | null;
}) {
  if (!data.race.targetSeconds)
    return <TargetMissing race={data.race} plan={data.plan} />;
  return onTrack ? (
    <RaceCard>
      <OnTrack onTrack={onTrack} />
    </RaceCard>
  ) : null;
}

export default async function RaceCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ context, data, today }, races] = await Promise.all([
    loadRace(id),
    requireAthlete().then((context) => listRaces(context)),
  ]);
  if (!data.course) {
    const activities = await listCourseActivities(context);
    return (
      <>
        <CourseImport
          race={data.race}
          activities={activities}
          replacing={false}
        />
        <OtherRaces races={races} currentId={data.race.id} />
      </>
    );
  }
  const inputs = await loadOnTrackInputs(context, today);
  const onTrack = raceOnTrack(
    data.race,
    inputs,
    preparationProgress(preparationRows(data)),
  );
  const views = planFor(data)!;
  const props = { data, views, races };
  const { planned } = views;
  if (!planned || !data.race.date || planned.startEpochMs === null)
    return (
      <>
        <RaceStatus data={data} onTrack={onTrack} />
        <CourseWorkspace {...props} weather={null} />
      </>
    );
  const weather = weatherFor(data, views.model, planned);
  return (
    <>
      <RaceStatus data={data} onTrack={onTrack} />
      <Suspense fallback={<CourseWorkspace {...props} weather={null} />}>
        <CourseWithWeather {...props} weather={weather} />
      </Suspense>
    </>
  );
}
