import { activityGroupOf, activityKind } from "./activities";
import {
  buildChartsView,
  buildHeartRateCurve,
  type ChartsView,
  type HeartRateCurve,
} from "./charts";
import { kmSplits, type KmSplits } from "./splits";
import type { ActivityDetailData, ActivitySegment } from "./detail";
import {
  buildRouteView,
  effortBands,
  timeInZones,
  type ActivityTrack,
  type RouteView,
  type ZoneBounds,
} from "./track";

export type ActivityView = {
  route: RouteView | null;
  charts: ChartsView | null;
  zoneTime: ReturnType<typeof timeInZones>;
  splits: KmSplits | null;
  heartRate: HeartRateCurve | null;
};

export function buildActivityView({
  activity,
  segments,
  track,
  zones,
}: {
  activity: ActivityDetailData;
  segments: ActivitySegment[];
  track: ActivityTrack | null;
  zones: ZoneBounds | null;
}): ActivityView {
  if (!track)
    return {
      route: null,
      charts: null,
      zoneTime: null,
      splits: null,
      heartRate: null,
    };
  const laps = segments
    .filter((segment) => segment.type === "lap")
    .sort((a, b) => a.index - b.index);
  const running = activityKind(activity.type) !== "other";
  const overallPace =
    running && activity.distanceMeters && activity.durationSeconds
      ? activity.durationSeconds / (activity.distanceMeters / 1000)
      : null;
  const bands = effortBands(laps, overallPace);
  const route = buildRouteView(track, {
    zones,
    bands: bands.distance,
    running,
  });
  return {
    route,
    charts: buildChartsView(track, {
      bands: bands.time,
      running,
      cycling: activityGroupOf(activity.type) === "cycling",
      routeFractions: route?.fractions ?? null,
    }),
    zoneTime: timeInZones(track.histogram, zones),
    splits: running ? kmSplits(track) : null,
    heartRate:
      activityGroupOf(activity.type) === "strength"
        ? buildHeartRateCurve(track, activity.averageHeartRate)
        : null,
  };
}
