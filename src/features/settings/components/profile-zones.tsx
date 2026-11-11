import { ProvenanceLabel } from "@/components/stride/provenance";
import type { Zone } from "@/components/stride/session-blocks";
import { zoneFills } from "@/components/stride/session-shape";
import { Widget } from "@/components/stride/widget";
import type { HeartRateZones } from "@/features/onboarding/heart-rate-zones";
import {
  heartRateZoneNames,
  heartRateZoneSource,
  type PaceZones,
} from "@/features/settings/zones";
import { cn } from "@/lib/utils";

const integer = new Intl.NumberFormat("fr-FR");

function ZoneCard({
  id,
  title,
  aside,
  source,
  caption,
  rows,
  empty,
}: {
  id: string;
  title: string;
  aside: React.ReactNode;
  source: string | null;
  caption: string;
  rows: {
    key: string;
    zone?: Zone;
    label: string;
    value: string;
    unit: string;
  }[];
  empty: string;
}) {
  return (
    <Widget
      headingLevel={3}
      title={<span id={id}>{title}</span>}
      verdict={aside}
      aria-labelledby={id}
    >
      <div className="flex flex-col gap-2">
        {source && (
          <ProvenanceLabel source="estimate">{source}</ProvenanceLabel>
        )}
        {rows.length > 0 ? (
          <table className="w-full border-collapse">
            <caption className="sr-only">{caption}</caption>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-border last:border-b-0"
                >
                  <th scope="row" className="py-2 text-left font-normal">
                    <span className="flex items-center gap-2">
                      {row.zone && (
                        <>
                          <span
                            aria-hidden="true"
                            className={cn(
                              "size-1.75 shrink-0 rounded-mark",
                              zoneFills[row.zone],
                            )}
                          />
                          <span className="sr-only">Z{row.zone} </span>
                        </>
                      )}
                      {row.label}
                    </span>
                  </th>
                  <td className="py-2 text-right whitespace-nowrap">
                    <span
                      data-slot="metric"
                      className="font-semibold tabular-nums"
                    >
                      {row.value}
                    </span>{" "}
                    <span className="text-label text-secondary-foreground">
                      {row.unit}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-secondary-foreground">{empty}</p>
        )}
      </div>
    </Widget>
  );
}

export function ProfileZones({
  heartRate,
  paces,
}: {
  heartRate: HeartRateZones | null;
  paces: PaceZones | null;
}) {
  return (
    <section aria-labelledby="zones-heading" className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5 px-1 min-[1100px]:border-b min-[1100px]:border-border min-[1100px]:px-0 min-[1100px]:pb-2.5">
        <h2 id="zones-heading" className="text-body-lg font-semibold">
          Zones
        </h2>
        <p className="text-body text-secondary-foreground">
          Recalculées dès que ta FC max, ta FC au repos ou ton seuil changent.
        </p>
      </div>
      <div className="grid items-start gap-3 min-[1100px]:grid-cols-2">
        <ZoneCard
          id="zones-heart-rate"
          title="Fréquence cardiaque"
          caption="Zones de fréquence cardiaque"
          aside={
            <a
              href="#entrainement"
              className="-my-2.5 inline-flex min-h-control-touch items-center text-label font-normal text-primary hover:text-foreground md:my-0 md:min-h-0"
            >
              <span className="min-[1100px]:hidden">Modifier</span>
              <span className="hidden min-[1100px]:inline">
                Modifier FC max ou seuil
              </span>
            </a>
          }
          source={heartRate ? heartRateZoneSource(heartRate) : null}
          rows={(heartRate?.zones ?? []).map((zone) => ({
            key: String(zone.zone),
            zone: zone.zone as Zone,
            label: heartRateZoneNames[zone.zone - 1] ?? `Zone ${zone.zone}`,
            value: `${integer.format(zone.lower)}–${integer.format(zone.upper)}`,
            unit: "bpm",
          }))}
          empty="Pas encore de zones : il faut une FC max, relevée en course ou saisie plus haut."
        />
        <ZoneCard
          id="zones-paces"
          title="Allures"
          caption="Zones d’allure"
          aside={
            paces?.threshold && (
              <span className="text-label font-normal text-secondary-foreground tabular-nums">
                Seuil {paces.threshold} /km
              </span>
            )
          }
          source={paces?.source ?? null}
          rows={(paces?.rows ?? []).map((row) => ({
            key: row.intensity,
            label: row.label,
            value: row.range,
            unit: "/km",
          }))}
          empty="Pas encore d’allures : il faut une séance au seuil sur le plat, un effort récent ou une VO₂ max Garmin."
        />
      </div>
      <p className="text-label text-secondary-foreground">
        Ces zones donnent les cibles de chaque séance du plan.
      </p>
    </section>
  );
}
