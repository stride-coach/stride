export type ActivityTotalsInput = {
  id: string;
  startedAt: string;
  durationSeconds: number | null;
  distanceMeters: number | null;
  averageHeartRate: number | null;
};

export type ActivityTotals = {
  durationSeconds: number | null;
  distanceMeters: number | null;
  averageHeartRate: number | null;
};

export function byStartTime(
  first: Pick<ActivityTotalsInput, "id" | "startedAt">,
  second: Pick<ActivityTotalsInput, "id" | "startedAt">,
) {
  return (
    Date.parse(first.startedAt) - Date.parse(second.startedAt) ||
    first.id.localeCompare(second.id)
  );
}

export function mainActivity<T extends ActivityTotalsInput>(
  activities: T[],
): T | null {
  return [...activities]
    .sort(byStartTime)
    .reduce<T | null>(
      (best, item) =>
        !best || (item.durationSeconds ?? 0) > (best.durationSeconds ?? 0)
          ? item
          : best,
      null,
    );
}

function total(values: (number | null)[]) {
  const present = values.filter((value): value is number => value !== null);
  return present.length > 0
    ? present.reduce((sum, value) => sum + value, 0)
    : null;
}

export function activityTotals(
  activities: Omit<ActivityTotalsInput, "id" | "startedAt">[],
): ActivityTotals {
  let seconds = 0;
  let weighted = 0;
  for (const activity of activities) {
    if (!activity.durationSeconds || activity.averageHeartRate === null)
      continue;
    seconds += activity.durationSeconds;
    weighted += activity.durationSeconds * activity.averageHeartRate;
  }
  return {
    durationSeconds: total(activities.map((item) => item.durationSeconds)),
    distanceMeters: total(activities.map((item) => item.distanceMeters)),
    averageHeartRate: seconds > 0 ? weighted / seconds : null,
  };
}

export function mergeLaps<T extends { index: number }>(groups: T[][]): T[] {
  let offset = 0;
  return groups.flatMap((laps) => {
    const merged = laps.map((lap) => ({ ...lap, index: offset + lap.index }));
    offset +=
      laps.length === 0 ? 0 : Math.max(...laps.map((lap) => lap.index)) + 1;
    return merged;
  });
}

const times = new Intl.ListFormat("fr-FR", {
  style: "long",
  type: "conjunction",
});

export function activityCountLabel(count: number) {
  return `${count} activité${count > 1 ? "s" : ""}`;
}

export function startTimesLabel(localTimes: (string | null)[]) {
  const known = localTimes.filter((time): time is string => time !== null);
  return known.length === localTimes.length && known.length > 0
    ? times.format(known)
    : null;
}
