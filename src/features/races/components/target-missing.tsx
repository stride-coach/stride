import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import { RaceSettingsDialog } from "./race-settings-dialog";
import type { RacePlan, RaceSummary } from "../race";

export function TargetMissing({
  race,
  plan,
}: {
  race: RaceSummary;
  plan: RacePlan;
}) {
  return (
    <Widget
      headingLevel={2}
      title={<span id="race-target-missing">Simulation à compléter</span>}
      aria-labelledby="race-target-missing"
    >
      <div className="flex flex-col gap-3">
        <p className="max-w-150 text-body text-secondary-foreground">
          Indique ton temps objectif pour calculer les heures de passage, les
          portions de nuit et le plan de nutrition.
        </p>
        <RaceSettingsDialog
          raceId={race.id}
          raceRevision={race.revision}
          targetSeconds={race.targetSeconds}
          kind={race.kind}
          plan={plan}
        >
          <Button className="self-start">Définir mon objectif</Button>
        </RaceSettingsDialog>
      </div>
    </Widget>
  );
}
