import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/stride/chip";
import { Widget } from "@/components/stride/widget";
import { SourceMark } from "@/components/stride/marks";
import { formatFrenchDate } from "@/features/onboarding/dates";
import { cn } from "@/lib/utils";
import { categoryLabels, terrainLabels } from "../model";
import { replacementDate } from "../mileage";
import {
  formatDay,
  formatKm,
  modelName,
  pairCard,
  specRows,
  type ShoeInput,
} from "../view";
import { CurrentKmButton, RetireShoeButton } from "./gear-actions";
import { GearPanelSection } from "./gear-frame";
import { WearGauge } from "./wear-gauge";

const decimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

function Tile({
  source,
  label,
  value,
  detail,
}: {
  source: "manual" | "provider";
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="inline-flex items-center gap-1.5 text-label text-secondary-foreground">
        <SourceMark source={source} />
        {label}
      </dt>
      <dd data-slot="metric" className="text-title font-semibold tabular-nums">
        {value}
      </dd>
      <dd className="text-label text-muted-foreground">{detail}</dd>
    </div>
  );
}

export function GearDetailPanel({ shoe }: { shoe: ShoeInput }) {
  const retired = shoe.retiredOn !== null;
  return (
    <GearPanelSection id="gear-settings" title="Réglages de la paire">
      <dl className="flex flex-col">
        {specRows(shoe.spec, shoe.suggested).map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 py-1.5"
          >
            <dt className="text-secondary-foreground">{row.label}</dt>
            <dd
              className={cn(
                "text-right font-medium",
                row.value === null && "font-normal text-muted-foreground",
              )}
            >
              {row.value ?? "Non renseignée"}
            </dd>
          </div>
        ))}
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline">
          <Link href={`/activities/gear/${shoe.id}/edit`}>
            Modifier la fiche
          </Link>
        </Button>
        <RetireShoeButton id={shoe.id} retired={retired} />
      </div>
    </GearPanelSection>
  );
}

export function GearDetail({
  shoe,
  today,
}: {
  shoe: ShoeInput;
  today: string;
}) {
  const card = pairCard(shoe, today);
  const { wear } = card;
  const replacement = replacementDate(wear, shoe.activities, today);
  const garmin = shoe.garmin;
  const retired = shoe.retiredOn !== null;
  return (
    <>
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <h1 className="text-verdict font-semibold text-balance">
            {modelName(shoe.spec)}
          </h1>
          <span className="text-secondary-foreground">{shoe.spec.brand}</span>
          {[
            categoryLabels[shoe.spec.category],
            terrainLabels[shoe.spec.terrain],
          ].map((tag) => (
            <Chip key={tag}>{tag}</Chip>
          ))}
          {retired && (
            <span className="text-label text-muted-foreground">
              Retirée le {formatFrenchDate(shoe.retiredOn)}
            </span>
          )}
        </div>
        <p className="text-label text-muted-foreground">
          {garmin ? "Suivie par Garmin" : "Hors Garmin"} · première sortie le{" "}
          {formatFrenchDate(shoe.firstUseDate)}
        </p>
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <span className="flex items-baseline gap-1.5">
            <span
              data-slot="metric"
              className="text-display font-semibold tabular-nums"
            >
              {card.totalKm}
            </span>
            <span className="text-body text-secondary-foreground">
              / {card.lifespanKm} km · {wear.percent} % de la durée de vie
            </span>
          </span>
          <span className="flex flex-col items-start gap-0.5 sm:items-end sm:text-right">
            <span
              className={cn(
                "text-title font-semibold tabular-nums",
                card.high && "text-warning",
              )}
            >
              {wear.worn
                ? "Durée de vie atteinte"
                : `${formatKm(wear.remainingKm)} km restants`}
            </span>
            <span className="text-label text-secondary-foreground">
              {replacement && !wear.worn
                ? `à remplacer vers le ${formatFrenchDate(replacement)} au rythme actuel`
                : "pas assez de sorties récentes pour estimer une date"}
            </span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <WearGauge wear={wear} split className="h-2" />
          <div className="flex justify-between text-label text-muted-foreground">
            <span>0</span>
            <span>{card.lifespanKm} km · alerte Garmin</span>
          </div>
        </div>
      </header>

      <Widget headingLevel={2} title="Kilomètres">
        <div className="flex flex-col gap-3.5">
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <Tile
              source="manual"
              label="Km de départ · toi"
              value={`${formatKm(wear.startingKm)} km`}
              detail="avant que Garmin ne compte cette paire"
            />
            <Tile
              source="provider"
              label="Depuis · Garmin"
              value={`${formatKm(wear.garminKm)} km`}
              detail={
                garmin
                  ? `${garmin.totalActivities} ${garmin.totalActivities > 1 ? "activités liées" : "activité liée"} à cette paire dans Garmin`
                  : "paire absente de Garmin"
              }
            />
            {garmin && (
              <Tile
                source="provider"
                label="Alerte d’usure · Garmin"
                value={`${formatKm(Math.max(wear.lifespanKm - wear.startingKm, 1))} km`}
                detail={`limite réglée dans Garmin : ${card.lifespanKm} − ${formatKm(wear.startingKm)} km de départ. Garmin te prévient.`}
              />
            )}
          </dl>
          <div>
            <CurrentKmButton
              id={shoe.id}
              currentKm={wear.totalKm}
              garminKm={wear.garminKm}
            />
          </div>
        </div>
      </Widget>

      <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
        <Widget headingLevel={2} title="La paire">
          {shoe.spec.description ? (
            <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5 text-label text-secondary-foreground">
                <SourceMark
                  source={
                    shoe.suggested.includes("description")
                      ? "estimate"
                      : "manual"
                  }
                />
                {shoe.suggested.includes("description")
                  ? "Suggestion Stride"
                  : "Toi"}
              </span>
              <p className="text-body-lg">{shoe.spec.description}</p>
            </div>
          ) : (
            <p className="text-body text-muted-foreground">
              Pas encore de description.
            </p>
          )}
        </Widget>
        <Widget
          headingLevel={2}
          title="Dernières activités"
          verdict={
            <span className="text-label font-normal text-muted-foreground">
              sur les 12 derniers mois
            </span>
          }
        >
          {shoe.activities.length === 0 ? (
            <p className="text-body text-muted-foreground">
              Aucune sortie liée à cette paire dans Garmin pour l’instant.
            </p>
          ) : (
            <ul className="-my-1.5">
              {shoe.activities.slice(0, 8).map((activity) => (
                <li
                  key={activity.activityId}
                  className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 border-b border-border py-2 last:border-b-0"
                >
                  <span className="text-label text-muted-foreground">
                    {formatDay(activity.day)}
                  </span>
                  <span className="truncate">{activity.name ?? "Sortie"}</span>
                  <span
                    data-slot="metric"
                    className="font-semibold tabular-nums"
                  >
                    {decimal.format(activity.distanceM / 1000)} km
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Widget>
      </div>
    </>
  );
}
