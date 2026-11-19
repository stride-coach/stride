import { formatDistance, formatDuration } from "./format";
import { approximate, type ProgramDaySession } from "./program";

type CardSession = Pick<
  ProgramDaySession,
  | "family"
  | "duration"
  | "durationSeconds"
  | "distance"
  | "distanceMeters"
  | "distanceEstimated"
  | "elevation"
>;

function climb(elevation: string | null) {
  return elevation ? `+${elevation.replace(" D+", "")}` : null;
}

function joined(parts: (string | null)[]) {
  return parts.filter(Boolean).join(" · ") || null;
}

export function dayCardMetrics(sessions: CardSession[]) {
  const [first] = sessions;
  if (!first) return null;
  if (sessions.length === 1)
    return joined([first.duration, first.distance, climb(first.elevation)]);
  const seconds = sessions.reduce(
    (total, session) => total + (session.durationSeconds ?? 0),
    0,
  );
  const measured = sessions.filter(
    (session) => session.distanceMeters !== null,
  );
  const meters = measured.reduce(
    (total, session) => total + (session.distanceMeters ?? 0),
    0,
  );
  return joined([
    seconds > 0 ? formatDuration(seconds) : null,
    measured.length > 0
      ? approximate(
          formatDistance(meters),
          measured.some((session) => session.distanceEstimated),
        )
      : null,
  ]);
}
