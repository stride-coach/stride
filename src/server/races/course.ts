import "server-only";
import { z } from "zod";
import {
  buildRouteView,
  parseTrack,
  trackColumns,
} from "@/features/activities/track";
import {
  buildCourse,
  nearestDistance,
  type Course,
  type RawPoint,
} from "@/features/races/course";
import {
  arrivalRow,
  courseReplacement,
  normalizedName,
  sameEffortArrival,
  type CourseReplacement,
} from "@/features/races/course-replacement";
import { clockToSql } from "@/features/races/format";
import { parseGpx, type GpxWaypoint } from "@/features/races/gpx";
import { guessKind, type Waypoint } from "@/features/races/waypoints";
import { courseFromStored } from "@/features/races/workspace";
import type { OnboardingContext } from "@/server/onboarding/context";
import { readWorkspace } from "./races";
import { planFor } from "./views";

export const maximumUploadBytes = 20 * 1024 * 1024;
const offCourseM = 250;
const fallbackTimeZone = "Europe/Paris";

export type CoursePreview = Omit<CourseReplacement, "carry"> & {
  fileName: string;
  sourceLabel: string;
};

export type CourseImportResult =
  | { status: "saved"; waypoints: number }
  | { status: "preview"; preview: CoursePreview }
  | {
      status:
        | "invalid-file"
        | "no-track"
        | "too-large"
        | "missing"
        | "error"
        | "session-expired";
    };

async function timeZoneAt(lat: number, lon: number) {
  try {
    const params = new URLSearchParams({
      latitude: lat.toFixed(3),
      longitude: lon.toFixed(3),
      timezone: "auto",
      forecast_days: "1",
    });
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?${params}`,
      {
        signal: AbortSignal.timeout(5000),
        next: { revalidate: 2_592_000 },
      },
    );
    if (!response.ok) return fallbackTimeZone;
    const body = z
      .object({ timezone: z.string().min(1).max(64) })
      .safeParse(await response.json());
    if (!body.success) return fallbackTimeZone;
    new Intl.DateTimeFormat("fr-FR", { timeZone: body.data.timezone });
    return body.data.timezone;
  } catch {
    return fallbackTimeZone;
  }
}

function gpxWaypointRows(course: Course, waypoints: GpxWaypoint[]) {
  return waypoints.flatMap((waypoint) => {
    const { distanceM, offsetM } = nearestDistance(
      course,
      waypoint.lat,
      waypoint.lon,
    );
    if (offsetM > offCourseM) return [];
    const guessed = guessKind(
      waypoint.name,
      waypoint.type,
      waypoint.description,
    );
    if (guessed === "start" || guessed === "finish") return [];
    return [
      {
        kind: guessed ?? "instruction",
        name: waypoint.name,
        distance_m: Math.round(distanceM * 10) / 10,
        todo: waypoint.description?.slice(0, 400) ?? null,
        needs_review: guessed === null,
      },
    ];
  });
}

async function carryOver(
  context: OnboardingContext,
  raceId: string,
  carry: CourseReplacement["carry"],
  previous: Waypoint[],
) {
  if (carry.length === 0) return;
  const { data } = await context.client
    .from("race_waypoints")
    .select("id, kind, name, source")
    .eq("user_id", context.userId)
    .eq("race_id", raceId);
  const fresh = (data ?? []).filter((row) => row.source === "gpx");
  const used = new Set<string>();
  await Promise.all(
    carry.map(async (item) => {
      if (item.kind === "move")
        return context.client
          .from("race_waypoints")
          .update({ distance_m: item.distanceM, needs_review: true })
          .eq("user_id", context.userId)
          .eq("race_id", raceId)
          .eq("id", item.id);
      const source = previous.find((point) => point.id === item.from);
      const target = fresh.find(
        (row) =>
          !used.has(row.id) &&
          row.kind === item.waypointKind &&
          normalizedName(row.name) === normalizedName(item.name),
      );
      if (!source || !target) return;
      used.add(target.id);
      return context.client
        .from("race_waypoints")
        .update({
          cutoff_time:
            source.cutoffMinutes === null
              ? null
              : clockToSql(source.cutoffMinutes),
          services: source.services,
          watch_label: source.watchLabel,
          alert_distance_m: source.alertDistanceM,
          voice_note: source.voiceNote,
          nutrition_note: source.nutritionNote,
          stop_seconds: source.stopSeconds,
          crew_access: source.crewAccess,
          crew_prepare: source.crewPrepare,
          crew_reason: source.crewReason,
          ...(source.todo ? { todo: source.todo } : {}),
        })
        .eq("user_id", context.userId)
        .eq("race_id", raceId)
        .eq("id", target.id);
    }),
  ).catch(() => undefined);
}

export async function storeCourse(
  context: OnboardingContext,
  raceId: string,
  course: Course,
  source:
    | { kind: "gpx"; fileName: string }
    | { kind: "activity"; activityId: string; name: string },
  gpxWaypoints: GpxWaypoint[] = [],
  confirmed = false,
): Promise<CourseImportResult> {
  const workspace = await readWorkspace(context, raceId).catch(() => null);
  if (!workspace) return { status: "missing" };
  const rows = gpxWaypointRows(course, gpxWaypoints);
  const fileName = (
    source.kind === "gpx" ? source.fileName : source.name
  ).slice(0, 200);
  const replacement = workspace.course
    ? courseReplacement({
        current: courseFromStored(workspace.course),
        next: course,
        waypoints: workspace.waypoints,
        incoming: rows,
        walkGradePercent: workspace.plan.walkGradePercent,
        road: workspace.race.kind === "road",
      })
    : null;
  if (replacement && workspace.course && !confirmed) {
    const preview = {
      pointCount: replacement.pointCount,
      routes: replacement.routes,
      rows: replacement.rows,
      moves: replacement.moves,
      removed: replacement.removed,
      added: replacement.added,
      kept: replacement.kept,
    };
    const planned = planFor(workspace)?.planned?.simulation.passages ?? [];
    const start = planned[0]?.clockMinutes ?? null;
    const finish = planned.at(-1)?.clockMinutes ?? null;
    const arrival =
      start === null || finish === null
        ? null
        : arrivalRow(
            finish,
            sameEffortArrival({
              startMinutes: start,
              finishMinutes: finish,
              current: courseFromStored(workspace.course),
              next: course,
              kind: workspace.race.kind,
            }),
          );
    return {
      status: "preview",
      preview: {
        ...preview,
        rows: arrival ? [...preview.rows, arrival] : preview.rows,
        fileName,
        sourceLabel: source.kind === "gpx" ? "fichier GPX" : "activité Garmin",
      },
    };
  }
  const [lat, lon] = course.points[0];
  const timeZone = await timeZoneAt(lat, lon);
  const { data, error } = await context.client.rpc("replace_race_course", {
    p_race_id: raceId,
    p_source: source.kind,
    p_file_name: fileName,
    p_source_activity_id:
      source.kind === "activity" ? source.activityId : undefined,
    p_time_zone: timeZone,
    p_distance_m: course.distanceM,
    p_elevation_gain_m: course.elevationGainM ?? undefined,
    p_elevation_loss_m: course.elevationLossM ?? undefined,
    p_step_m: course.stepM,
    p_points: course.points as unknown as [number, number, number | null][],
    p_waypoints: rows,
  });
  if (error) return { status: error.code === "42501" ? "missing" : "error" };
  if (replacement)
    await carryOver(context, raceId, replacement.carry, workspace.waypoints);
  return { status: "saved", waypoints: data };
}

export async function importGpx(
  context: OnboardingContext,
  raceId: string,
  file: File,
  confirmed = false,
): Promise<CourseImportResult> {
  if (file.size > maximumUploadBytes) return { status: "too-large" };
  const parsed = parseGpx(await file.text());
  if (parsed === "not-gpx") return { status: "invalid-file" };
  if (parsed === "no-track") return { status: "no-track" };
  const course = buildCourse(parsed.points);
  if (!course) return { status: "no-track" };
  return storeCourse(
    context,
    raceId,
    course,
    { kind: "gpx", fileName: file.name || "parcours.gpx" },
    parsed.waypoints,
    confirmed,
  );
}

export async function importActivity(
  context: OnboardingContext,
  raceId: string,
  activityId: string,
  confirmed = false,
): Promise<CourseImportResult> {
  const [activity, track] = await Promise.all([
    context.client
      .from("provider_activities")
      .select("id, activity_name, elevation_gain_meters")
      .eq("user_id", context.userId)
      .eq("id", activityId)
      .maybeSingle(),
    context.client
      .from("provider_activity_tracks")
      .select(trackColumns)
      .eq("user_id", context.userId)
      .eq("activity_id", activityId)
      .maybeSingle(),
  ]);
  if (activity.error || track.error) return { status: "error" };
  if (!activity.data) return { status: "missing" };
  const parsed = track.data ? parseTrack(track.data) : null;
  const view = parsed
    ? buildRouteView(parsed, { zones: null, bands: [], running: false })
    : null;
  if (!view) return { status: "no-track" };
  const raw: RawPoint[] = view.route.map(([lat, lon], index) => ({
    lat,
    lon,
    ele: view.elevation[index],
  }));
  const built = buildCourse(raw);
  if (!built) return { status: "no-track" };
  const recordedGainM = activity.data.elevation_gain_meters;
  const course =
    recordedGainM !== null && recordedGainM > 0
      ? { ...built, elevationGainM: Math.round(recordedGainM) }
      : built;
  return storeCourse(
    context,
    raceId,
    course,
    {
      kind: "activity",
      activityId,
      name: activity.data.activity_name ?? "Activité Garmin",
    },
    [],
    confirmed,
  );
}
