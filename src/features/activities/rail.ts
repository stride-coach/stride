import {
  activityWeekStart,
  formatHoursMinutes,
  shiftDate,
  weekTotals,
  type Activity,
} from "./activities";

export const railWeeks = 7;
export const railRecentDays = 28;

export type RailMeasures = Pick<
  Activity,
  "date" | "distanceMeters" | "elevationGainMeters" | "durationSeconds"
>;

export type RailWeek = {
  weekStart: string;
  label: string;
  hours: number;
  current: boolean;
};

export type RailRecent = {
  duration: string;
  count: string;
  distance: string;
  elevation: string | null;
};

export type ActivityRailView = {
  weeks: RailWeek[];
  recent: RailRecent | null;
};

const oneDecimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const integer = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });

export function railWindowStart(today: string) {
  return shiftDate(activityWeekStart(today), -(railWeeks - 1) * 7);
}

export function activityRail(
  activities: readonly RailMeasures[],
  today: string,
): ActivityRailView {
  const currentStart = activityWeekStart(today);
  const weeks = Array.from({ length: railWeeks }, (_, index) => {
    const offset = index - (railWeeks - 1);
    const weekStart = shiftDate(currentStart, offset * 7);
    const members = activities.filter(
      (activity) => activityWeekStart(activity.date) === weekStart,
    );
    return {
      weekStart,
      label: `S${offset}`,
      hours: weekTotals(members).durationSeconds / 3600,
      current: offset === 0,
    };
  });
  const recentStart = shiftDate(today, -(railRecentDays - 1));
  const recent = activities.filter(
    (activity) => activity.date >= recentStart && activity.date <= today,
  );
  if (recent.length === 0) return { weeks, recent: null };
  const totals = weekTotals(recent);
  return {
    weeks,
    recent: {
      duration: formatHoursMinutes(totals.durationSeconds).replace(":", "h"),
      count: `${totals.count} ${totals.count >= 2 ? "activités" : "activité"}`,
      distance: `${oneDecimal.format(totals.distanceMeters / 1000)} km`,
      elevation:
        totals.elevationGainMeters >= 1
          ? `+${integer.format(totals.elevationGainMeters)} m`
          : null,
    },
  };
}
