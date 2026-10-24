import { activityWeekStart, shiftDate } from "./activities";
import type { MatchStatus } from "@/features/plans/matching/adherence";
import type { PlanSession } from "@/features/plans/model/plan";
import {
  flatten,
  type SessionStructure,
  type SimpleStep,
} from "@/features/plans/model/structure";
import { isRunningSession } from "@/features/plans/model/volume";
import {
  overallVerdict,
  type DebriefMatch,
  type Verdict,
} from "@/features/plans/debrief/debrief";
import { familyLabels, sessionFamilyOf } from "@/features/plans/view/program";

export type PillTone = "success" | "warning" | "off" | "todo";
export type ActivityPill = { label: string; tone: PillTone };

export const plannedMatchStatuses: readonly MatchStatus[] = [
  "completed",
  "partial",
  "substituted",
  "checked_in",
];

export type PlanMatchLike = DebriefMatch & {
  sessionKey: string;
  activityId: string | null;
};

const words = {
  done: "faite",
  success: "réussie",
  short: "écourtée",
  substituted: "remplacée",
  slow: "trop lente",
  fast: "trop rapide",
  intense: "trop intense",
  easy: "trop facile",
};

function verdictWord(title: string): keyof typeof words {
  if (title.includes("écourtée")) return "short";
  if (title.includes("intense")) return "intense";
  if (title.includes("facile")) return "easy";
  if (title.includes("rapide")) return "fast";
  if (title.includes("lente")) return "slow";
  return "success";
}

export function isPlannedMatch(
  match: Pick<PlanMatchLike, "status" | "activityId"> | undefined,
): boolean {
  return !!match?.activityId && plannedMatchStatuses.includes(match.status);
}

export function hasHeartRateTarget(session: PlanSession) {
  return flatten(session.structure).some(
    (step) => step.target.kind === "heart_rate_range",
  );
}

export function plannedPill({
  session,
  match,
  verdict = null,
  averageHeartRate = null,
}: {
  session: PlanSession;
  match: DebriefMatch;
  verdict?: Verdict | null;
  averageHeartRate?: number | null;
}): ActivityPill {
  const family = sessionFamilyOf(session);
  const label = (word: keyof typeof words, tone: PillTone): ActivityPill => ({
    label: `${familyLabels[family]} · ${words[word]}`,
    tone,
  });
  if (match.status === "substituted") return label("substituted", "warning");
  if (match.status === "checked_in" || !isRunningSession(session))
    return label("done", "success");
  const resolved =
    verdict ??
    overallVerdict(
      match,
      hasHeartRateTarget(session) && averageHeartRate !== null,
    );
  return label(
    verdictWord(resolved.title),
    resolved.tone === "warning" ? "warning" : "success",
  );
}

export const unplannedPill: ActivityPill = { label: "Hors plan", tone: "off" };
export const feelingPill: ActivityPill = {
  label: "Ressenti à noter",
  tone: "todo",
};

export function needsFeeling({
  date,
  today,
  garmin,
  athlete,
}: {
  date: string;
  today: string;
  garmin: { rpe: number | null; feel: number | null };
  athlete: boolean;
}) {
  const recent =
    date <= today &&
    activityWeekStart(date) >= shiftDate(activityWeekStart(today), -7);
  return recent && !athlete && garmin.rpe === null && garmin.feel === null;
}

export function withinPlan(
  plan: { startsOn: string; endsOn: string } | null | undefined,
  date: string,
) {
  return !!plan && date >= plan.startsOn && date <= plan.endsOn;
}

export type ProgrammeItem = { label: string; value: string };

const stepLabels: Record<SimpleStep["type"], string> = {
  warmup: "Échauffement",
  work: "Exercice",
  recovery: "Récupération",
  cooldown: "Retour au calme",
};

function stepAmount(step: SimpleStep) {
  if (step.end.kind === "distance")
    return `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(step.end.meters / 1000)} km`;
  const seconds =
    step.end.kind === "time" ? step.end.seconds : step.end.estimatedSeconds;
  return seconds % 60 === 0 && seconds >= 60
    ? `${seconds / 60} min`
    : `${seconds} s`;
}

export function sessionProgramme(
  structure: SessionStructure,
): ProgrammeItem[] | null {
  const items = structure.map((step): ProgrammeItem & { cue: boolean } => {
    if (step.type !== "repeat")
      return {
        label: step.cue ?? stepLabels[step.type],
        value: stepAmount(step),
        cue: step.cue !== undefined,
      };
    const main =
      step.steps.find((inner) => inner.type === "work") ?? step.steps[0];
    return {
      label: main.cue ?? stepLabels[main.type],
      value: `${step.count} × ${stepAmount(main)}`,
      cue: main.cue !== undefined,
    };
  });
  return items.some((item) => item.cue)
    ? items.map(({ label, value }) => ({ label, value }))
    : null;
}
