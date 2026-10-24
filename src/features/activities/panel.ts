import type { DebriefFeeling } from "@/features/plans/debrief/debrief";
import { activityWeekStart, formatWeekSpan } from "./activities";
import type { ActivityView } from "./activity-view";
import type { Comparison } from "./compare";
import type { ActivityDetailData, ActivitySegment } from "./detail";
import type { ActivityPill, ProgrammeItem } from "./plan-status";

export type PanelFeeling = DebriefFeeling | null;

type CardBase = {
  strength: boolean;
  coachHref: string;
  feelingActivityId: string;
  feeling: PanelFeeling;
  comparison: Comparison | null;
};

export type PlanCardView =
  | (CardBase & {
      kind: "planned";
      pill: ActivityPill;
      body: string | null;
      planHref: string;
      sessionTitle: string;
      programme: ProgrammeItem[] | null;
    })
  | (CardBase & { kind: "unplanned"; inPlan: boolean; load: string | null });

const decimal = new Intl.NumberFormat("fr-FR", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const rounded = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

export function weekLoadSentence({
  date,
  today,
  actualMeters,
  plannedMeters,
}: {
  date: string;
  today: string;
  actualMeters: number;
  plannedMeters: number | null;
}) {
  if (actualMeters <= 0) return null;
  const weekStart = activityWeekStart(date);
  const week =
    weekStart === activityWeekStart(today)
      ? "cette semaine"
      : `la semaine du ${formatWeekSpan(weekStart, today)}`;
  const planned =
    plannedMeters !== null && plannedMeters > 0
      ? ` pour ${rounded.format(plannedMeters / 1000)} prévus`
      : "";
  return `Compte dans ta charge : ${decimal.format(actualMeters / 1000)} km ${week}${planned}`;
}

export function activityCoachHref(activityId: string) {
  return `/coach/new?activity=${encodeURIComponent(activityId)}`;
}

export type ActivityPanelView = {
  activity: ActivityDetailData;
  segments: ActivitySegment[];
  view: ActivityView;
  zoneMethod: "karvonen" | "percentage_maximum" | null;
  card: PlanCardView;
};
