import { localToday } from "@/features/app-shell/shell";
import { OnTrack } from "@/features/races/components/on-track";
import { EmptyState, RaceCard } from "@/features/races/components/race-ui";
import { raceOnTrack } from "@/features/races/on-track";
import {
  preparationProgress,
  preparationRows,
} from "@/features/races/overview";
import { requireAthlete } from "@/server/app/session";
import { loadRace } from "@/server/races/load";
import { loadOnTrackInputs } from "@/server/races/on-track";

export default async function RacePreparationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const inputsRead = requireAthlete().then((context) =>
    loadOnTrackInputs(context, localToday(new Date())),
  );
  const { id } = await params;
  const [{ data }, inputs] = await Promise.all([loadRace(id), inputsRead]);
  const onTrack = raceOnTrack(
    data.race,
    inputs,
    preparationProgress(preparationRows(data)),
  );
  if (!onTrack)
    return (
      <EmptyState title="Préparation terminée">
        Cette course est passée ou n’a pas encore de date : il n’y a plus de
        chemin à suivre jusqu’à elle.
      </EmptyState>
    );
  return (
    <RaceCard>
      <OnTrack onTrack={onTrack} />
    </RaceCard>
  );
}
