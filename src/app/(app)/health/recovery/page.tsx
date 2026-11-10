import type { Metadata } from "next";
import { Suspense } from "react";
import { DataCategoryScope } from "@/features/data-activity/components/status";
import { HealthDayLoading } from "@/features/data-activity/components/loading";
import { localToday } from "@/features/app-shell/shell";
import {
  bodyKpis,
  bodyNights,
  checkinHistory,
  readinessAdvice,
  readinessFactors,
  readinessSummary,
} from "@/features/progress/body";
import {
  FactorsSection,
  HeartCards,
  KpiCards,
  NightsSection,
  RaceRecoveries,
  ReadinessPanel,
} from "@/features/progress/components/body-sections";
import {
  HealthGrid,
  HealthPage,
  HealthReading,
} from "@/features/progress/components/health-frame";
import { ScaleSwitch } from "@/features/progress/components/scale-switch";
import { CheckinCard } from "@/features/progress/components/checkin-card";
import { DayTimeline } from "@/features/progress/components/day-timeline";
import {
  DayMoments,
  DayNavigator,
  DayReading,
  DayUnavailable,
  NightCard,
} from "@/features/progress/components/health-day-sections";
import { KpiStrip } from "@/features/progress/components/health-sections";
import {
  healthModel,
  healthViewLabels,
  parseHealthView,
  type HealthModel,
} from "@/features/progress/health";
import { parseHealthDate } from "@/features/progress/health-day";
import { healthDayView } from "@/features/progress/health-day-view";
import { addDays } from "@/features/progress/period";
import { recoveryView } from "@/features/progress/recovery-view";
import { requireAthlete } from "@/server/app/session";
import { loadBody } from "@/server/progress/body";
import { loadHealthDay, loadHealthStrip } from "@/server/progress/health-day";

export const metadata: Metadata = { title: "Récupération · Santé" };

async function HealthDay({
  loaded: pending,
  reference,
  day,
  today,
}: {
  loaded: ReturnType<typeof loadHealthDay>;
  reference: HealthModel;
  day: string;
  today: string;
}) {
  const loaded = await pending;
  if (!loaded.model) return <DayUnavailable failure={loaded.failure} />;
  const nightTitle = `Nuit du ${new Date(`${addDays(day, -1)}T00:00:00Z`).getUTCDate()} au ${new Date(`${day}T00:00:00Z`).getUTCDate()}`;
  const dayView = healthDayView(loaded.model, reference, nightTitle);
  return (
    <>
      <KpiStrip kpis={dayView.kpis} />
      <DayTimeline model={loaded.model} />
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          <DayReading view={dayView} today={day === today} />
          {dayView.night && <NightCard night={dayView.night} />}
        </div>
        <DayMoments model={loaded.model} />
      </div>
    </>
  );
}

export default async function HealthRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [context, query] = await Promise.all([requireAthlete(), searchParams]);
  const view = parseHealthView(query.view);
  const today = localToday(new Date());
  if (view === "day") {
    const day = parseHealthDate(query.date, today);
    const dayRead = loadHealthDay(context, day);
    const { reference, strip } = await loadHealthStrip(context, day, today);
    return (
      <DataCategoryScope categories={["recovery"]}>
        <HealthReading
          kicker="Lecture de Stride · Jour"
          title="Ta journée"
          actions={<ScaleSwitch current="day" />}
        />
        <div className="flex flex-col gap-4.5 px-4 py-4.5 md:px-5">
          <DayNavigator day={day} today={today} strip={strip} />
          <Suspense key={day} fallback={<HealthDayLoading />}>
            <HealthDay
              loaded={dayRead}
              reference={reference}
              day={day}
              today={today}
            />
          </Suspense>
          <p className="text-label text-muted-foreground">
            Vue jour : courbes détaillées chargées depuis Garmin quand tu ouvres
            une journée (FC toutes les 2 min, stress toutes les 3 min, Body
            Battery, phases de sommeil, pas par heure). Les vues 14 et 30 jours
            utilisent les moyennes quotidiennes. Les moments et la lecture sont
            des repères de Stride, pas un diagnostic.
          </p>
        </div>
      </DataCategoryScope>
    );
  }
  const { recovery, days, checkins, session } = await loadBody(context, today);
  const health = healthModel({ days, view, today });
  const reading = recoveryView(recovery);
  const advice = readinessAdvice(recovery.readiness, session);
  const summary = readinessSummary(recovery.readiness);
  return (
    <DataCategoryScope categories={["recovery"]}>
      <HealthPage
        aside={
          <>
            <div className="border-b border-border max-xl:hidden">
              <ReadinessPanel
                id="body-readiness"
                summary={summary}
                advice={advice}
                session={session}
              />
            </div>
            <CheckinCard
              initial={recovery.checkin}
              history={checkinHistory(checkins, today)}
            />
            <KpiCards kpis={bodyKpis(health, days)} />
            <RaceRecoveries races={reading.races} note={reading.racesNote} />
          </>
        }
      >
        <HealthReading
          kicker={`Lecture de Stride · ${healthViewLabels[view]}`}
          title={reading.headline}
          actions={<ScaleSwitch current={view} />}
        >
          {reading.summary}
        </HealthReading>
        <div className="border-b border-border px-4 md:px-5 xl:hidden">
          <ReadinessPanel
            id="body-readiness-compact"
            summary={summary}
            advice={advice}
            session={session}
          />
        </div>
        <HealthGrid className="xl:grid-cols-3">
          <FactorsSection
            factors={readinessFactors(recovery)}
            className="lg:col-span-2 xl:order-last xl:col-span-3"
          />
          <NightsSection
            nights={bodyNights(
              days,
              health.sleep?.lastDay ?? today,
              health.chartDays,
            )}
            className="lg:col-span-2 xl:col-span-1"
          />
          <HeartCards
            hrv={health.hrv}
            resting={health.restingHeartRate}
            chartDays={health.chartDays}
          />
        </HealthGrid>
      </HealthPage>
    </DataCategoryScope>
  );
}
