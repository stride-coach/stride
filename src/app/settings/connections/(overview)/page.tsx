import type { Metadata } from "next";
import { ActivityIcon } from "lucide-react";
import { DataActivityLink as Link } from "@/features/data-activity/components/navigation";
import { Widget } from "@/components/stride/widget";
import { Button } from "@/components/ui/button";
import {
  DataFigure,
  DataRow,
  DataSection,
  GarminStatus,
} from "@/features/settings/components/data-rows";
import { SettingsHeading } from "@/features/settings/components/settings-shell";
import { requireAthleteAccount } from "@/server/app/session";
import {
  readSettingsConnection,
  readStoredCounts,
} from "@/server/settings/data";

export const metadata: Metadata = { title: "Connexions · Réglages" };

export default async function ConnexionsSettingsPage() {
  const context = await requireAthleteAccount();
  const [state, counts] = await Promise.all([
    readSettingsConnection(context),
    readStoredCounts(context),
  ]);
  return (
    <>
      <SettingsHeading
        title="Connexions"
        description="Garmin fournit les activités et les données de santé de ton historique."
      />
      <div className="flex flex-col gap-9">
        <Widget
          headingLevel={2}
          icon={<ActivityIcon />}
          title={<span id="connection-garmin">Garmin</span>}
          verdict={
            <span className="text-label font-normal text-muted-foreground">
              Principale · obligatoire
            </span>
          }
          aria-labelledby="connection-garmin"
        >
          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <GarminStatus
                status={state.connection?.status ?? null}
                className="flex-1"
              />
              <Button variant="outline" asChild className="max-md:w-full">
                <Link href="/settings/connections/garmin">Gérer</Link>
              </Button>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-3.5 md:grid-cols-3">
              <DataFigure
                value={counts.activities ?? "—"}
                label="Activités enregistrées"
              />
              <DataFigure
                value={counts.observations ?? "—"}
                label="Mesures de santé"
              />
              <DataFigure
                className="col-span-2 md:col-span-1"
                value={
                  state.connection?.lastSyncAt
                    ? new Date(state.connection.lastSyncAt).toLocaleString(
                        "fr-FR",
                        { timeZone: "Europe/Paris" },
                      )
                    : "Aucune synchro enregistrée"
                }
                valueClassName="text-body"
                label="Dernière synchro"
              />
            </dl>
          </div>
        </Widget>
        <DataSection id="connection-others" title="Autres sources">
          <DataRow
            title="Autres montres et applications"
            detail="Les autres fournisseurs ne sont pas encore pris en charge."
          />
          <DataRow
            title="Saisie manuelle"
            detail="L’ajout de séances sans montre n’est pas encore disponible."
          />
        </DataSection>
      </div>
    </>
  );
}
