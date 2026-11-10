import type { Metadata } from "next";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { localToday } from "@/features/app-shell/shell";
import {
  MarkersSection,
  ReachSection,
  RecordList,
} from "@/features/progress/components/records-sections";
import {
  HealthPage,
  HealthReading,
} from "@/features/progress/components/health-frame";
import { addDays } from "@/features/progress/period";
import { garminPredictions } from "@/features/progress/garmin-predictions";
import { goalCard, preparationWindowDays } from "@/features/progress/goal";
import { fitnessRecords } from "@/features/progress/records";
import { recordsView } from "@/features/progress/records-view";
import { requireAthlete } from "@/server/app/session";
import { loadRecords } from "@/server/progress/records";

export const metadata: Metadata = { title: "Records · Santé" };

export default async function ProgressRecordsPage() {
  const context = await requireAthlete();
  const today = localToday(new Date());
  const loaded = await loadRecords(context, today)
    .then((data) => ({ data, failed: false }))
    .catch(() => ({ data: null, failed: true }));
  if (!loaded.data)
    return (
      <div className="flex flex-col gap-4 px-4 py-4.5 md:px-5">
        <h1 className="text-verdict font-semibold">Records</h1>
        <Alert>
          <AlertDescription>
            Impossible de lire ton historique pour le moment. Réessaie plus
            tard.
          </AlertDescription>
        </Alert>
      </div>
    );
  const { model, history, threshold, goal: inputs } = loaded.data;
  const predictions = garminPredictions(loaded.data.predictions, today);
  const view = recordsView({
    model,
    predictions,
    vo2: history.vo2,
    threshold,
    today,
  });
  const recent = fitnessRecords(
    history.activities.filter(
      (activity) =>
        activity.day >= addDays(today, -preparationWindowDays) &&
        activity.day <= today,
    ),
    history.laps,
  );
  const goal = goalCard({
    races: inputs.races,
    primaryRaceId: inputs.primaryRaceId,
    today,
    predictions,
    longestRunMeters: recent.longest?.meters ?? null,
    maxWeeklyGainMeters: recent.weeklyGain?.meters ?? null,
    preparation: inputs.preparation,
    program: null,
    blockKinds: {},
  });
  return (
    <HealthPage aside={<ReachSection reach={view.reach} goal={goal} />}>
      <HealthReading kicker="Lecture de Stride · Records" title={view.headline}>
        {view.paragraph}
      </HealthReading>
      <MarkersSection markers={view.markers} />
      <RecordList
        id="records-speed"
        title="Vitesse"
        rows={view.speed}
        empty="Aucun record sur route documenté."
      />
      <RecordList
        id="records-endurance"
        title="Endurance"
        rows={view.endurance}
        empty="Aucun record d’endurance documenté."
      />
      <p className="px-4 py-4.5 text-label text-muted-foreground md:px-5">
        Records tirés de tes tours et tracés Garmin, sans dépasser la distance
        de plus de 5 %. Vitesse : sorties sur route et piste uniquement.
        Prévisions : Garmin. Chaque ligne ouvre l’activité d’origine.
      </p>
    </HealthPage>
  );
}
