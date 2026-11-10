import type { Metadata } from "next";
import { localToday } from "@/features/app-shell/shell";
import {
  LoadChart,
  LoadLegend,
} from "@/features/progress/components/load-chart";
import {
  GoalCardView,
  IntensitySection,
  LoadAdviceCard,
  MeasureSection,
  PredictionSection,
  RunningVolumeSection,
} from "@/features/progress/components/fitness-sections";
import {
  HealthGrid,
  HealthPage,
  HealthReading,
  WidgetEmpty,
} from "@/features/progress/components/health-frame";
import { Widget } from "@/components/stride/widget";
import { planAdherence } from "@/features/plans/matching/adherence";
import { buildProgram } from "@/features/plans/view/program";
import { fitnessView } from "@/features/progress/fitness";
import { garminPredictions } from "@/features/progress/garmin-predictions";
import { goalCard, preparationWindowDays } from "@/features/progress/goal";
import { intensityDistribution } from "@/features/progress/intensity";
import { sparklineWindows } from "@/features/progress/measures";
import { PeriodNav } from "@/features/progress/components/period-nav";
import {
  addDays,
  parsePeriod,
  periodLabels,
  periodStart,
} from "@/features/progress/period";
import { loadAdvice } from "@/features/progress/reading";
import { fitnessRecords } from "@/features/progress/records";
import { runningVolume } from "@/features/progress/running-volume";
import { requireAthlete } from "@/server/app/session";
import { programInput } from "@/server/plans/overview";
import { loadFitness } from "@/server/progress/fitness";

export const metadata: Metadata = { title: "Forme · Santé" };

export default async function ProgressFitnessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const period = parsePeriod(query.period);
  const now = new Date();
  const today = localToday(now);
  const data = await loadFitness(context, today, now);
  const { history, overview } = data;
  const start = periodStart(today, period);
  const adherence = overview
    ? planAdherence({
        sessions: overview.plan.state.sessions,
        matches: overview.matches,
        start,
        today,
        windows: sparklineWindows(start, today),
      })
    : null;
  const program = overview
    ? buildProgram(programInput(overview, data.paces))
    : null;
  const view = fitnessView({
    history,
    zones: data.zones,
    period,
    today,
    adherence,
  });
  const currentWeek = program?.weeks.find(
    (week) => week.weekKey === program.currentWeekKey,
  );
  const advice = view.load
    ? loadAdvice(
        view.load,
        currentWeek && program
          ? {
              currentWeekStart: currentWeek.weekStart,
              currentLight: currentWeek.isLight,
              nextLightWeekStart:
                program.weeks.find(
                  (week) =>
                    week.weekStart > currentWeek.weekStart && week.isLight,
                )?.weekStart ?? null,
            }
          : null,
      )
    : null;
  const predictions = garminPredictions(data.predictions, today);
  const recent = fitnessRecords(
    history.activities.filter(
      (activity) =>
        activity.day >= addDays(today, -preparationWindowDays) &&
        activity.day <= today,
    ),
    history.laps,
  );
  const goal = goalCard({
    races: data.races,
    primaryRaceId: data.primaryRaceId,
    today,
    predictions,
    longestRunMeters: recent.longest?.meters ?? null,
    maxWeeklyGainMeters: recent.weeklyGain?.meters ?? null,
    preparation: data.preparation,
    program,
    blockKinds: Object.fromEntries(
      (overview?.plan.state.blocks ?? []).map((block) => [
        block.blockKey,
        block.kind,
      ]),
    ),
  });
  const volume = runningVolume(
    history.activities,
    program?.weeks.map((week) => ({
      weekStart: week.weekStart,
      meters: week.totals.distanceMeters,
      estimated: week.totals.distanceEstimated,
    })) ?? null,
    today,
  );
  const intensity = intensityDistribution(
    data.runs,
    data.zones?.zones ?? null,
    today,
  );
  return (
    <HealthPage aside={<MeasureSection rows={view.rows} note={view.note} />}>
      <HealthReading
        kicker={`Lecture de Stride · ${periodLabels[period]}`}
        title={view.headline}
        actions={<PeriodNav period={period} />}
      >
        {view.summary}
      </HealthReading>
      <HealthGrid>
        <GoalCardView goal={goal} />
        <Widget
          headingLevel={2}
          title={<span id="progress-load">Condition et fatigue</span>}
          aria-labelledby="progress-load"
          className="lg:col-span-2"
        >
          {view.load ? (
            <div className="flex flex-col gap-3">
              <LoadLegend className="flex flex-wrap gap-3 text-label text-muted-foreground" />
              <LoadChart chart={view.load} />
              {advice && <LoadAdviceCard advice={advice} />}
            </div>
          ) : (
            <WidgetEmpty>
              Garmin n’a pas encore fourni assez de charges d’entraînement sur
              cette période pour tracer ta condition.
            </WidgetEmpty>
          )}
        </Widget>
        <RunningVolumeSection volume={volume} />
        <IntensitySection intensity={intensity} />
        <PredictionSection predictions={predictions} />
      </HealthGrid>
    </HealthPage>
  );
}
